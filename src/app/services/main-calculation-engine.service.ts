import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { PrepaymentCalculationGoal } from './tax-enums';
import { getDefaultTaxData } from './layout-structuur/Vereenvoudigde-aangifte';
import { buildCalculationDetail } from './layout-structuur/calculation-detail.builder';
import { buildSimplifiedReturn } from './layout-structuur/Key-values-Cards';
import { runCoreEngine, CoreEngineInput } from './core-engine/calculation-core';
import { TAX_CONSTANTS } from './tax-constants';
import { 
  DeclarationSection, 
  Prepayments, 
  PrepaymentStrategy, 
  PrepaymentConcentration,
  TaxCalculationResults,
  TaxData
} from './tax-data.types';

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
      prepaymentStrategy: data.prepaymentStrategy
    };
    const core = runCoreEngine(coreInput);

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
      isSmallCompanyFirstThreeYears: data.isSmallCompanyFirstThreeYears
    });

    // Calculate final tax payable based on the prepayments used for this step
    // For Step 3, we need to recalculate using suggested prepayments
    // For Step 2, we need to recalculate using current prepayments
    const finalTaxPayableForStep = this.getCurrentStep() === 3 
      ? core.saldo2 - (core.suggestedPrepayments.va1 + core.suggestedPrepayments.va2 + core.suggestedPrepayments.va3 + core.suggestedPrepayments.va4) + detail.vermeerderingTotal + (core.code1508 * TAX_CONSTANTS.LIQUIDATION_RESERVE_RATE)
      : this.getCurrentStep() === 2
        ? core.saldo2 - (data.prepayments.va1 + data.prepayments.va2 + data.prepayments.va3 + data.prepayments.va4) + detail.vermeerderingTotal + (core.code1508 * TAX_CONSTANTS.LIQUIDATION_RESERVE_RATE)
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
        prepaymentStrategy: currentData.prepaymentStrategy
      };
      const core = runCoreEngine(coreInput);

      // Update section totals and subtotals
      sections.forEach((section, index) => {
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