import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { PrepaymentCalculationGoal } from '../types/tax-data.types';
import { getDefaultTaxData } from '../../layout-builders/Vereenvoudigde-aangifte';
import { buildCalculationDetail } from '../../layout-builders/calculation-detail.builder';
import { buildSimplifiedReturn } from '../../layout-builders/Key-values-Cards';
import { runCoreEngine, CoreEngineInput, CoreEngineOutput } from './calculation-core';
import { 
  TAX_CONSTANTS, 
  getTaxYearParameters, 
  getQuarterlyRates, 
  getVermeerderingsPercentage,
  getReducedRate,
  getStandardRate,
  getReducedRateThreshold,
  getKorfbeperkingThreshold,
  getKorfbeperkingRate,
  getDeMinimisThreshold,
  getDeMinimisPercentage,
  getRequiredPrepaymentsPercentage
} from './parameters';
import { 
  DeclarationSection, 
  Prepayments, 
  PrepaymentConcentration,
  TaxCalculationResults,
  TaxData,
  PeriodData,
  InvoermethodeData
} from '../types/tax-data.types';
import { PrepaymentService } from './prepayment.service';
import { BookYearCalculatorService, BookYearInfo, ShortBookYearPrepaymentRules, LongBookYearPrepaymentRules, LatestPrepaymentDates } from './book-year-calculator.service';

// Re-export core engine functions and types for external use
export { runCoreEngine } from './calculation-core';
export type { CoreEngineInput, CoreEngineOutput } from './calculation-core';
export { PrepaymentService } from './prepayment.service';

/**
 * Main calculation engine service for tax calculations.
 * This service orchestrates:
 * 1. Data storage and persistence
 * 2. Reactive updates
 * 3. Core calculation engine calls
 * 4. Layout builders for UI presentation
 */
@Injectable({
  providedIn: 'root'
})
export class MainCalculationEngineService {
  private readonly STORAGE_KEY = 'sofisk_tax_data';
  private dataSubject: BehaviorSubject<TaxData | null>;
  private resultsSubject: BehaviorSubject<TaxCalculationResults | null>;
  private isLoadingSubject: BehaviorSubject<boolean>;
  
  public readonly data$: Observable<TaxData | null>;
  public readonly results$: Observable<TaxCalculationResults | null>;
  public readonly isLoading$: Observable<boolean>;

  private prepaymentService = inject(PrepaymentService);
  private bookYearCalculatorService = inject(BookYearCalculatorService);

  constructor() {
    this.dataSubject = new BehaviorSubject<TaxData | null>(null);
    this.resultsSubject = new BehaviorSubject<TaxCalculationResults | null>(null);
    this.isLoadingSubject = new BehaviorSubject<boolean>(false);

    this.data$ = this.dataSubject.asObservable();
    this.results$ = this.resultsSubject.asObservable();
    this.isLoading$ = this.isLoadingSubject.asObservable();

    console.log('MainCalculationEngineService constructor called');
    this.loadData();
    this.setupReactiveCalculations();
  }

  // =========================================
  // Main Calculation Logic
  // =========================================

  private calculateTaxResults(data: TaxData): TaxCalculationResults {
    // Run core engine for pure math calculations
    const coreInput: CoreEngineInput = {
      declarationSections: data.declarationSections,
      canUseReducedRate: data.canUseReducedRate,
      prepayments: data.prepayments,
      isSmallCompanyFirstThreeYears: data.isSmallCompanyFirstThreeYears,
      prepaymentCalculationGoal: data.prepaymentCalculationGoal,
      prepaymentConcentration: data.prepaymentConcentration,
      prepaymentStrategy: data.prepaymentStrategy,
      taxYear: this.getCurrentTaxYear(),
      bookYearInfo: this.getBookYearInfo() ?? undefined
    };
    const core = runCoreEngine(coreInput, this.prepaymentService);

    // Determine which prepayments to use for detailed calculation based on step context
    // Step 2: Use current prepayments (values being edited by user)
    // Step 3: Use suggested prepayments (simulation values)
    const prepaymentsForDetail = this.getCurrentStep() === 3 
      ? core.suggestedPrepayments 
      : data.prepayments; // Use current prepayments for step 2

    // Build UI layouts using core results
    const detail = buildCalculationDetail({
      reducedRateBase: core.reducedRateBase,
      standardRateBase: core.standardRateBase,
      code1508: core.code1508,
      code1830: core.code1830,
      code1840: core.code1840,
      prepayments: prepaymentsForDetail, // Use appropriate prepayments based on step
      isSmallCompanyFirstThreeYears: data.isSmallCompanyFirstThreeYears,
      taxYear: this.getCurrentTaxYear(), // Pass the current tax year to use correct parameters
      bookYearInfo: this.getBookYearInfo() ?? undefined // Pass book year information for adjusted calculations, ensure undefined not null
    });
    // For Step 2, we need to recalculate using current prepayments
    const currentTaxYearParams = this.getCurrentTaxYearParameters();
    const finalTaxPayableForStep = this.getCurrentStep() === 3 
      ? core.saldo2 - (core.suggestedPrepayments.va1 + core.suggestedPrepayments.va2 + core.suggestedPrepayments.va3 + core.suggestedPrepayments.va4) + detail.vermeerderingTotal + (core.code1508 * currentTaxYearParams.LIQUIDATION_RESERVE_RATE)
      : this.getCurrentStep() === 2
        ? core.saldo2 - (data.prepayments.va1 + data.prepayments.va2 + data.prepayments.va3 + data.prepayments.va4) + detail.vermeerderingTotal + (core.code1508 * currentTaxYearParams.LIQUIDATION_RESERVE_RATE)
        : core.finalTaxPayable;

    const simplified = buildSimplifiedReturn({
      belastbareWinstGewoonTarief: core.belastbareWinstGewoonTarief,
      calculationTotal: core.calculationTotal,
      voorheffingTotal: detail.voorheffingenTotal,
      finalTaxPayable: finalTaxPayableForStep
    });

    // Merge core calculations with UI layouts
    return {
      ...core,
      ...detail,
      simplifiedReturnRows: simplified,
      finalTaxPayable: finalTaxPayableForStep,
      taxableIncome: core.taxableIncome,
      totalTaxLiability: finalTaxPayableForStep,
      finalTaxDue: finalTaxPayableForStep,
      requiredPrepayments: core.requiredPrepayments,
      currentPrepayments: core.currentPrepayments,
      shortfall: core.shortfall,
      suggestedPrepayments: core.suggestedPrepayments,
      vermeerderingWegensOntoereikendeVoorafbetalingen: detail.vermeerderingTotal
    };
  }

  private performCalculation(data: TaxData): void {
    console.log('Performing calculation with data:', data);
    this.isLoadingSubject.next(true);

    let dataForCalculation = data;

    // Handle prepayment calculations based on goal and company status
    if (data.prepaymentCalculationGoal === PrepaymentCalculationGoal.None) {
      // For initial empty state, force prepayments to 0
      dataForCalculation = {
        ...data,
        prepayments: { va1: 0, va2: 0, va3: 0, va4: 0 }
      };
    }

    try {
      const results = this.calculateTaxResults(dataForCalculation);
      console.log('Calculation results:', results);
      this.resultsSubject.next(results);
    } catch (error) {
      console.error('Calculation error:', error);
    } finally {
      this.isLoadingSubject.next(false);
    }
  }

  private setupReactiveCalculations(): void {
    this.data$.subscribe(data => {
      if (data) {
        console.log('Triggering calculation with data:', data);
        this.performCalculation(data);
      }
    });
    
    const currentData = this.getData();
    if (currentData) {
      console.log('Running initial calculation with current data:', currentData);
      this.performCalculation(currentData);
    }
  }

  // =========================================
  // Tax Year Management
  // =========================================

  /**
   * Calculate tax year based on period end date
   * Rules:
   * - If period ends on December 31st of a year → Tax Year = following year
   * - If period ends on any other date → Tax Year = end year
   */
  public calculateTaxYear(periodEndDate: Date): string {
    const endYear = periodEndDate.getFullYear();
    const endMonth = periodEndDate.getMonth(); // 0-11
    const endDay = periodEndDate.getDate();
    
    // Check if period ends on December 31st
    if (endMonth === 11 && endDay === 31) {
      return (endYear + 1).toString();
    }
    
    return endYear.toString();
  }

  /**
   * Get current tax year from stored data
   */
  public getCurrentTaxYear(): string {
    const data = this.getData();
    return data?.periodData?.taxYear || '2025';
  }

  /**
   * Get tax year parameters for current tax year
   */
  public getCurrentTaxYearParameters() {
    const taxYear = this.getCurrentTaxYear();
    return getTaxYearParameters(taxYear);
  }

  /**
   * Get quarterly rates for current tax year
   */
  public getQuarterlyRates(): any {
    const taxYear = this.getCurrentTaxYear();
    return getQuarterlyRates(taxYear);
  }

  /**
   * Get vermeerdering percentage for current tax year
   */
  public getVermeerderingsPercentage(): number {
    const taxYear = this.getCurrentTaxYear();
    return getVermeerderingsPercentage(taxYear);
  }

  /**
   * Get reduced rate for current tax year
   */
  public getReducedRate(): number {
    const taxYear = this.getCurrentTaxYear();
    return getReducedRate(taxYear);
  }

  /**
   * Get standard rate for current tax year
   */
  public getStandardRate(): number {
    const taxYear = this.getCurrentTaxYear();
    return getStandardRate(taxYear);
  }

  /**
   * Get reduced rate threshold for current tax year
   */
  public getReducedRateThreshold(): number {
    const taxYear = this.getCurrentTaxYear();
    return getReducedRateThreshold(taxYear);
  }

  /**
   * Get korfbeperking threshold for current tax year
   */
  public getKorfbeperkingThreshold(): number {
    const taxYear = this.getCurrentTaxYear();
    return getKorfbeperkingThreshold(taxYear);
  }

  /**
   * Get korfbeperking rate for current tax year
   */
  public getKorfbeperkingRate(): number {
    const taxYear = this.getCurrentTaxYear();
    return getKorfbeperkingRate(taxYear);
  }

  /**
   * Get de minimis threshold for current tax year
   */
  public getDeMinimisThreshold(): number {
    const taxYear = this.getCurrentTaxYear();
    return getDeMinimisThreshold(taxYear);
  }

  /**
   * Get de minimis percentage for current tax year
   */
  public getDeMinimisPercentage(): number {
    const taxYear = this.getCurrentTaxYear();
    return getDeMinimisPercentage(taxYear);
  }

  /**
   * Get required prepayments percentage for current tax year
   */
  public getRequiredPrepaymentsPercentage(): number {
    const taxYear = this.getCurrentTaxYear();
    return getRequiredPrepaymentsPercentage(taxYear);
  }

  // =========================================
  // Book Year Calculation Methods
  // =========================================

  /**
   * Get book year information for the current period
   */
  public getBookYearInfo(): BookYearInfo | null {
    const currentData = this.getData();
    if (!currentData?.periodData?.startDate || !currentData?.periodData?.endDate) {
      return null;
    }
    
    return this.bookYearCalculatorService.calculateBookYearInfo(
      currentData.periodData.startDate,
      currentData.periodData.endDate
    );
  }

  /**
   * Get short book year prepayment rules
   */
  public getShortBookYearPrepayments(): ShortBookYearPrepaymentRules | null {
    const bookYearInfo = this.getBookYearInfo();
    if (!bookYearInfo?.isShortBookYear) {
      return null;
    }
    
    const taxYear = this.getCurrentTaxYear();
    return this.bookYearCalculatorService.calculateShortBookYearPrepayments(bookYearInfo, taxYear);
  }

  /**
   * Get long book year prepayment rules
   */
  public getLongBookYearPrepayments(): LongBookYearPrepaymentRules | null {
    const bookYearInfo = this.getBookYearInfo();
    if (!bookYearInfo?.isLongBookYear) {
      return null;
    }
    
    const taxYear = this.getCurrentTaxYear();
    return this.bookYearCalculatorService.calculateLongBookYearPrepayments(bookYearInfo, taxYear);
  }

  /**
   * Get latest prepayment dates
   */
  public getLatestPrepaymentDates(): LatestPrepaymentDates | null {
    const bookYearInfo = this.getBookYearInfo();
    if (!bookYearInfo) {
      return null;
    }
    
    return this.bookYearCalculatorService.calculateLatestPrepaymentDates(bookYearInfo);
  }

  /**
   * Get adjusted vermeerdering percentage for short book years
   */
  public getAdjustedVermeerderingPercentage(): number {
    const shortBookYearRules = this.getShortBookYearPrepayments();
    if (shortBookYearRules) {
      return shortBookYearRules.vermeerderingPercentage;
    }
    
    // Return normal vermeerdering percentage for normal/long book years
    return this.getVermeerderingsPercentage();
  }

  /**
   * Check if current period is a short book year
   */
  public isShortBookYear(): boolean {
    const bookYearInfo = this.getBookYearInfo();
    return bookYearInfo?.isShortBookYear ?? false;
  }

  /**
   * Check if current period is a long book year
   */
  public isLongBookYear(): boolean {
    const bookYearInfo = this.getBookYearInfo();
    return bookYearInfo?.isLongBookYear ?? false;
  }

  /**
   * Check if current period is a normal book year
   */
  public isNormalBookYear(): boolean {
    const bookYearInfo = this.getBookYearInfo();
    return bookYearInfo?.isNormalBookYear ?? false;
  }

  /**
   * Get book year type description
   */
  public getBookYearTypeDescription(): string {
    const bookYearInfo = this.getBookYearInfo();
    if (!bookYearInfo) {
      return '';
    }
    return this.bookYearCalculatorService.getBookYearTypeDescription(bookYearInfo);
  }

  /**
   * Get short book year prepayment description
   */
  public getShortBookYearPrepaymentDescription(): string {
    const bookYearInfo = this.getBookYearInfo();
    if (!bookYearInfo) {
      return '';
    }
    return this.bookYearCalculatorService.getShortBookYearPrepaymentDescription(bookYearInfo);
  }

  // =========================================
  // Period and Invoermethode Management
  // =========================================

  /**
   * Save period data
   */
  public savePeriodData(periodData: PeriodData): void {
    const currentData = this.getData();
    if (currentData) {
      const updatedData: TaxData = {
        ...currentData,
        periodData,
        lastUpdated: new Date()
      };
      this.dataSubject.next(updatedData);
      this.saveData(updatedData);
    }
  }

  /**
   * Save invoermethode data
   */
  public saveInvoermethodeData(invoermethodeData: InvoermethodeData): void {
    const currentData = this.getData();
    if (currentData) {
      const updatedData: TaxData = {
        ...currentData,
        invoermethodeData,
        lastUpdated: new Date()
      };
      this.dataSubject.next(updatedData);
      this.saveData(updatedData);
    }
  }

  // =========================================
  // Data Management
  // =========================================

  public getData(): TaxData | null {
    return this.dataSubject.value;
  }

  /**
   * Get the current step from localStorage
   */
  private getCurrentStep(): number {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const storedStep = localStorage.getItem('sofisk_current_step');
        if (storedStep) {
          return JSON.parse(storedStep);
        }
      }
    } catch (error) {
      console.error('Error getting current step:', error);
    }
    return 1; // Default to step 1
  }

  public updateDeclarationSections(sections: DeclarationSection[]): void {
    const currentData = this.getData();
    if (currentData) {
      const updatedData: TaxData = {
        ...currentData,
        declarationSections: sections,
        lastUpdated: new Date()
      };

      // Recalculate totals before persisting
      const coreInput: CoreEngineInput = {
        declarationSections: sections,
        canUseReducedRate: currentData.canUseReducedRate,
        prepayments: currentData.prepayments,
        isSmallCompanyFirstThreeYears: currentData.isSmallCompanyFirstThreeYears,
        prepaymentCalculationGoal: currentData.prepaymentCalculationGoal,
        prepaymentConcentration: currentData.prepaymentConcentration,
        prepaymentStrategy: currentData.prepaymentStrategy,
        taxYear: this.getCurrentTaxYear(),
        bookYearInfo: this.getBookYearInfo() ?? undefined
      };
      const core = runCoreEngine(coreInput, this.prepaymentService);

      // Update section totals and subtotals
      sections.forEach((section) => {
        if (section.total) {
          section.total.value = section.fields.reduce((acc, field) => acc + (field.value || 0), 0);
        }
        if (section.subtotal) {
          switch (section.subtotal.code) {
            case '1430':
              section.subtotal.value = core.resterendResultaat;
              break;
            case '1440':
              section.subtotal.value = core.grondslagVoorBerekeningKorf;
              break;
            case '1460':
              section.subtotal.value = core.belastbareWinstGewoonTarief;
              break;
          }
        }
      });

      updatedData.declarationSections = sections;
      this.saveData(updatedData);
      this.dataSubject.next(updatedData);
    }
  }

  public updateInputMethod(method: 'manual' | 'previous'): void {
    const currentData = this.getData();
    if (currentData) {
      const updatedData: TaxData = {
        ...currentData,
        inputMethod: method,
        lastUpdated: new Date()
      };
      this.saveData(updatedData);
      this.dataSubject.next(updatedData);
    }
  }

  public updateTaxRateEligibility(canUseReducedRate: boolean, isSmallCompanyFirstThreeYears: boolean): void {
    const currentData = this.getData();
    if (currentData) {
      const updatedData: TaxData = {
        ...currentData,
        canUseReducedRate,
        isSmallCompanyFirstThreeYears,
        lastUpdated: new Date()
      };
      this.saveData(updatedData);
      this.dataSubject.next(updatedData);
    }
  }

  public resetToDefaults(): void {
    const defaultData = getDefaultTaxData();
    this.saveData(defaultData);
    this.dataSubject.next(defaultData);
  }

  public clearData(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(this.STORAGE_KEY);
        localStorage.removeItem('sofisk_current_step');
      }
      this.dataSubject.next(null);
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  }

  private loadData(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
          const data = JSON.parse(stored) as TaxData;
          data.lastUpdated = new Date(data.lastUpdated);
          
          // Handle missing fields with defaults
          if (data.prepaymentCalculationGoal === undefined) {
            data.prepaymentCalculationGoal = PrepaymentCalculationGoal.GeenVermeerdering;
          }
          if (data.useSuggestedPrepayments === undefined) {
            data.useSuggestedPrepayments = false;
          }
          if (data.prepaymentConcentration === undefined) {
            data.prepaymentConcentration = 'spread';
          }
          if (data.committedPrepayments === undefined) {
            data.committedPrepayments = { ...data.prepayments };
          }
          
          console.log('Loaded data from localStorage:', data);
          this.dataSubject.next(data);
        } else {
          const defaultData = getDefaultTaxData();
          console.log('No stored data, using defaults:', defaultData);
          this.saveData(defaultData);
          this.dataSubject.next(defaultData);
        }
      } else {
        const defaultData = getDefaultTaxData();
        console.log('No localStorage, using defaults:', defaultData);
        this.dataSubject.next(defaultData);
      }
    } catch (error) {
      console.error('Error loading tax data:', error);
      const defaultData = getDefaultTaxData();
      this.saveData(defaultData);
      this.dataSubject.next(defaultData);
    }
  }

  private saveData(data: TaxData): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error saving tax data:', error);
    }
  }

  // =========================================
  // Prepayment Management
  // =========================================

  public getCommittedPrepayments(): Prepayments {
    const currentData = this.getData();
    return currentData?.committedPrepayments || { va1: 0, va2: 0, va3: 0, va4: 0 };
  }

  public updatePrepayments(prepayments: Prepayments, commit: boolean = true): void {
    const currentData = this.getData();
    if (currentData) {
      const updatedData: TaxData = {
        ...currentData,
        prepayments,
        lastUpdated: new Date()
      };
      if (commit) {
        updatedData.committedPrepayments = { ...prepayments };
      }
      this.saveData(updatedData);
      this.dataSubject.next(updatedData);
    }
  }

  public commitPrepayments(): void {
    const currentData = this.getData();
    if (currentData) {
      const updatedData: TaxData = {
        ...currentData,
        committedPrepayments: { ...currentData.prepayments },
        lastUpdated: new Date()
      };
      this.saveData(updatedData);
      this.dataSubject.next(updatedData);
    }
  }

  public updatePrepaymentCalculationGoal(goal: PrepaymentCalculationGoal): void {
    const currentData = this.getData();
    if (currentData) {
      const updatedData: TaxData = {
        ...currentData,
        prepaymentCalculationGoal: goal,
        useSuggestedPrepayments: !(goal === 'GeenVermeerdering' && currentData.isSmallCompanyFirstThreeYears),
        lastUpdated: new Date()
      };
      
      this.saveData(updatedData);
      this.dataSubject.next(updatedData);
      this.performCalculation(updatedData);
    }
  }

  public updatePrepaymentConcentration(concentration: PrepaymentConcentration): void {
    const currentData = this.getData();
    if (currentData) {
      const updatedData: TaxData = {
        ...currentData,
        prepaymentConcentration: concentration,
        useSuggestedPrepayments: true,
        lastUpdated: new Date()
      };
      this.saveData(updatedData);
      this.dataSubject.next(updatedData);
      this.performCalculation(updatedData);
    }
  }

  public stopUsingSuggestedPrepayments(): void {
    const currentData = this.getData();
    if (currentData) {
      const updatedData: TaxData = {
        ...currentData,
        useSuggestedPrepayments: false,
        lastUpdated: new Date()
      };
      this.saveData(updatedData);
      this.dataSubject.next(updatedData);
    }
  }

  /**
   * Force recalculation when step changes
   * This ensures that the correct prepayment values are used for the current step
   */
  public forceRecalculation(): void {
    const currentData = this.getData();
    if (currentData) {
      console.log('Forcing recalculation for step:', this.getCurrentStep());
      this.performCalculation(currentData);
    }
  }
}