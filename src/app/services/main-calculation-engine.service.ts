import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { PrepaymentCalculationGoal } from './tax-enums';

// =========================================
// Data Structures & Interfaces
// =========================================

export interface DeclarationField {
  code: string | null;
  label: string;
  value: number;
}

export interface DeclarationSection {
  title: string | null;
  isFoldable: boolean;
  isOpen: boolean;
  fields: DeclarationField[];
  total?: {
    value: number;
  };
  subtotal?: {
    label: string;
    code: string;
    value: number;
  };
}

export interface Prepayments {
  va1: number;
  va2: number;
  va3: number;
  va4: number;
  [key: string]: number; // Index signature for dynamic access
}

export type PrepaymentStrategy = 'spread' | 'q1' | 'q2' | 'q3' | 'q4';
export { PrepaymentCalculationGoal } from './tax-enums';
export type PrepaymentConcentration = PrepaymentStrategy;

export interface CalculationRow {
  code: string;
  description: string;
  amount: number;
  rate: number | null;
  result: number;
}

export interface TaxCalculationResults {
  resultaatVanHetBelastbareTijdperkTotal: number;
  aftrekkenVanDeResterendeWinstTotal: number;
  aftrekkenResterendeWinstKorfbeperkingTotal: number;
  afzonderlijkTeBelastenTotal: number;
  voorheffingTotal: number;
  bestanddelenVhResultaatAftrekbeperking: number;
  resterendResultaat: number;
  grondslagVoorBerekeningKorf: number;
  belastbareWinstGewoonTarief: number;
  limitedAftrekkenResterendeWinstKorfbeperkingTotal: number;
  calculationRows: CalculationRow[];
  calculationTotal: number;
  voorheffingenRows: CalculationRow[];
  voorheffingenTotal: number;
  vermeerderingRows: CalculationRow[];
  vermeerderingTotal: number;
  resultRows: CalculationRow[];
  finalTaxPayable: number;
  taxableIncome: number;
  totalTaxLiability: number;
  finalTaxDue: number;
  requiredPrepayments: number;
  currentPrepayments: number;
  shortfall: number;
  suggestedPrepayments: Prepayments;
  taxAtReducedRate: number;
  taxAtStandardRate: number;
  nonRefundableWithholding: number;
  refundableWithholding: number;
  separateAssessment: number;
  vermeerderingWegensOntoereikendeVoorafbetalingen: number;
}

export interface TaxData {
  declarationSections: DeclarationSection[];
  inputMethod: 'manual' | 'previous';
  prepayments: Prepayments;
  committedPrepayments: Prepayments;
  prepaymentStrategy: PrepaymentStrategy;
  prepaymentCalculationGoal: PrepaymentCalculationGoal;
  prepaymentConcentration: PrepaymentConcentration;
  useSuggestedPrepayments: boolean;
  canUseReducedRate: boolean;
  isSmallCompanyFirstThreeYears: boolean;
  lastUpdated: Date;
}

/**
 * Main calculation engine service for tax calculations.
 * Handles all tax-related calculations, data management, and state.
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
    // Calculate section totals
    const resultaatVanHetBelastbareTijdperkTotal = this.calculateResultaatVanHetBelastbareTijdperkTotal(data.declarationSections);
    const bestanddelenVhResultaatAftrekbeperking = this.getFieldValue(data.declarationSections, '1420') || 0;
    const aftrekkenVanDeResterendeWinstTotal = this.calculateAftrekkenVanDeResterendeWinstTotal(data.declarationSections);
    const aftrekkenResterendeWinstKorfbeperkingTotal = this.calculateAftrekkenResterendeWinstKorfbeperkingTotal(data.declarationSections);
    const afzonderlijkTeBelastenTotal = this.calculateAfzonderlijkTeBelastenTotal(data.declarationSections);
    const voorheffingTotal = this.calculateVoorheffingTotal(data.declarationSections);
    
    // Calculate resterend resultaat (Code 1430)
    const resterendResultaat = Math.max(0, resultaatVanHetBelastbareTijdperkTotal - bestanddelenVhResultaatAftrekbeperking);
    
    // Calculate grondslag voor de berekening korf (Code 1440)
    const grondslagVoorBerekeningKorf = Math.max(0, resterendResultaat - aftrekkenVanDeResterendeWinstTotal);
    
    // Apply korfbeperking to section 6 deductions
    const korfbeperking = this.calculateKorfbeperking(grondslagVoorBerekeningKorf);
    const limitedAftrekkenResterendeWinstKorfbeperkingTotal = Math.min(aftrekkenResterendeWinstKorfbeperkingTotal, korfbeperking);
    
    // Calculate belastbare winst gewoon tarief (Code 1460)
    const belastbareWinstGewoonTariefBeforeConstraint = Math.max(0, grondslagVoorBerekeningKorf - limitedAftrekkenResterendeWinstKorfbeperkingTotal);
    const belastbareWinstGewoonTarief = belastbareWinstGewoonTariefBeforeConstraint + bestanddelenVhResultaatAftrekbeperking;

    // Get specific field values for calculation rows
    const code1508 = this.getFieldValue(data.declarationSections, '1508') || 0;
    const code1830 = this.getFieldValue(data.declarationSections, '1830') || 0;
    const code1840 = this.getFieldValue(data.declarationSections, '1840') || 0;

    // Calculate reduced rate portion based on checkbox state
    let reducedRateBase = 0;
    let standardRateBase = 0;
    
    if (data.canUseReducedRate) {
      // If checkbox is checked, apply reduced rate to first €100,000
      reducedRateBase = Math.min(belastbareWinstGewoonTarief, 100000);
      standardRateBase = Math.max(0, belastbareWinstGewoonTarief - 100000);
    } else {
      // If checkbox is unchecked, apply standard rate to full amount
      reducedRateBase = 0;
      standardRateBase = belastbareWinstGewoonTarief;
    }

    // Build calculation rows
    const calculationRows: CalculationRow[] = [
      {
        code: '1460',
        description: 'Belastbaar tegen verminderd tarief',
        amount: reducedRateBase,
        rate: 20.00,
        result: reducedRateBase * 0.20
      },
      {
        code: '1460',
        description: 'Belastbaar tegen gewoon tarief',
        amount: standardRateBase,
        rate: 25.00,
        result: standardRateBase * 0.25
      }
    ];
    
    const calculationTotal = calculationRows.reduce((sum, row) => sum + row.result, 0);
    
    // Build voorheffingen rows
    const saldo1 = calculationTotal;
    const limitedCode1830 = Math.min(code1830, saldo1);
    const saldo2 = saldo1 - limitedCode1830 - code1840;
      
    const voorheffingenRows: CalculationRow[] = [
      {
        code: '1830',
        description: 'Niet-terugbetaalbare voorheffingen',
        amount: limitedCode1830,
        rate: null,
        result: -limitedCode1830
      },
      {
        code: '1840',
        description: 'Terugbetaalbare voorheffingen',
        amount: code1840,
        rate: null,
        result: -code1840
      },
      {
        code: '',
        description: 'Saldo 2',
        amount: saldo2,
        rate: null,
        result: saldo2
      }
    ];
      
    const voorheffingenTotal = voorheffingenRows.reduce((sum, row) => sum + row.result, 0);
    
    // Build vermeerdering en voorafbetalingen rows
    
    let vermeerderingRows: CalculationRow[] = [];
    let vermeerderingTotal = 0;
    
    if (data.isSmallCompanyFirstThreeYears) {
      vermeerderingTotal = 0;
      vermeerderingRows.push({
        code: '1801',
        description: 'Vermeerdering niet van toepassing (eerste 3 boekjaren)',
        amount: 0,
        rate: null,
        result: 0
      });
    } else {
      const rawVermeerdering = Math.max(0, saldo2 * 0.09);
      
      const va1 = data.prepayments.va1;
      const va2 = data.prepayments.va2;
      const va3 = data.prepayments.va3;
      const va4 = data.prepayments.va4;
      const deduction1 = -(va1 * 0.12);
      const deduction2 = -(va2 * 0.10);
      const deduction3 = -(va3 * 0.08);
      const deduction4 = -(va4 * 0.06);
      const totalAftrekVA = deduction1 + deduction2 + deduction3 + deduction4;
      
      const vermeerderingBeforeDeMinimis = Math.max(0, rawVermeerdering + totalAftrekVA);
      
      const finalVermeerdering = this.applyDeMinimisRule(vermeerderingBeforeDeMinimis, saldo2);
      
      vermeerderingRows = [
        {
          code: '',
          description: 'Berekening vermeerdering',
          amount: saldo2,
          rate: 9.00,
          result: rawVermeerdering
        },
        {
          code: '1811',
          description: 'Voorafbetaling 1',
          amount: va1,
          rate: 12.00,
          result: deduction1
        },
        {
          code: '1812',
          description: 'Voorafbetaling 2',
          amount: va2,
          rate: 10.00,
          result: deduction2
        },
        {
          code: '1813',
          description: 'Voorafbetaling 3',
          amount: va3,
          rate: 8.00,
          result: deduction3
        },
        {
          code: '1814',
          description: 'Voorafbetaling 4',
          amount: va4,
          rate: 6.00,
          result: deduction4
        },
        {
          code: '',
          description: 'Totaal aftrek VA',
          amount: 0,
          rate: null,
          result: totalAftrekVA
        },
        {
          code: '',
          description: 'Aftrek door VA',
          amount: 0,
          rate: null,
          result: totalAftrekVA
        },
        {
          code: '',
          description: 'Berekening vermeerdering',
          amount: 0,
          rate: null,
          result: vermeerderingBeforeDeMinimis
        }
      ];
      vermeerderingTotal = finalVermeerdering;
    }
    
    // Calculate total taxes payable
    const voorafbetalingenTotal = this.calculateTotalPrepayments(data.prepayments);
    const result1508 = code1508 * 0.10;
    const finalTaxPayable = saldo2 - voorafbetalingenTotal + vermeerderingTotal + result1508;

    // Build result rows
    const resultRows: CalculationRow[] = [
      {
        code: '',
        description: 'Saldo 2',
        amount: 0,
        rate: null,
        result: saldo2
      },
      {
        code: '1810',
        description: 'Voorafbetalingen',
        amount: this.calculateTotalPrepayments(data.prepayments),
        rate: null,
        result: -this.calculateTotalPrepayments(data.prepayments)
      },
      {
        code: '',
        description: 'Vermeerdering wegens ontoereikende voorafbetalingen' + (vermeerderingTotal === 0 && !data.isSmallCompanyFirstThreeYears ? ' (de-minimis regel toegepast)' : ''),
        amount: vermeerderingTotal,
        rate: null,
        result: vermeerderingTotal
      },
      {
        code: '1508',
        description: 'Afzonderlijke aanslag van het gedeelte van de boekhoudkundige winst na belasting dat is overgeboekt naar de liquidatiereserve',
        amount: code1508,
        rate: 10.00,
        result: code1508 * 0.10
      }
    ];

    // Calculate tax liability and prepayments
    const taxableIncome = belastbareWinstGewoonTarief;
    const totalTaxLiability = finalTaxPayable;
    const finalTaxDue = totalTaxLiability;
    
    // Calculate prepayment requirements
    const requiredPrepayments = totalTaxLiability * 0.9; // 90% rule
    const currentPrepayments = this.calculateTotalPrepayments(data.prepayments);
    const shortfall = Math.max(0, requiredPrepayments - currentPrepayments);
    
    // Calculate suggested prepayments based on strategy
    const suggestedPrepayments = data.prepaymentCalculationGoal === 'GeenVermeerdering'
      ? { va1: 0, va2: 0, va3: 0, va4: 0 }  // No prepayments needed for "Geen vermeerdering"
      : this.calculateOptimalPrepayments(    // Calculate prepayments for "Saldo belastingen = 0"
          data.prepayments,
          data.prepaymentStrategy,
          requiredPrepayments
        );

    const taxAtReducedRate = reducedRateBase * 0.20;
    const taxAtStandardRate = standardRateBase * 0.25;
    const separateAssessment = code1508 * 0.10;
    const nonRefundableWithholding = -limitedCode1830;
    const refundableWithholding = -code1840;

    return {
      resultaatVanHetBelastbareTijdperkTotal,
      aftrekkenVanDeResterendeWinstTotal,
      aftrekkenResterendeWinstKorfbeperkingTotal,
      afzonderlijkTeBelastenTotal,
      voorheffingTotal,
      bestanddelenVhResultaatAftrekbeperking,
      resterendResultaat,
      grondslagVoorBerekeningKorf,
      belastbareWinstGewoonTarief,
      limitedAftrekkenResterendeWinstKorfbeperkingTotal,
      calculationRows,
      calculationTotal,
      voorheffingenRows,
      voorheffingenTotal,
      vermeerderingRows,
      vermeerderingTotal,
      resultRows,
      finalTaxPayable,
      taxableIncome,
      totalTaxLiability,
      finalTaxDue,
      requiredPrepayments,
      currentPrepayments,
      shortfall,
      suggestedPrepayments,
      taxAtReducedRate,
      taxAtStandardRate,
      nonRefundableWithholding,
      refundableWithholding,
      separateAssessment,
      vermeerderingWegensOntoereikendeVoorafbetalingen: vermeerderingTotal
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
    } else if (data.prepaymentCalculationGoal === 'GeenVermeerdering' && data.isSmallCompanyFirstThreeYears) {
      // For "Geen vermeerdering" and small company in first 3 years,
      // we should force prepayments to 0 since no tax increase is possible
      dataForCalculation = {
        ...data,
        prepayments: { va1: 0, va2: 0, va3: 0, va4: 0 }
      };
    } else if (data.prepaymentCalculationGoal === 'SaldoNul') {
      // For "Saldo belasting = 0", always use the current prepayments
      // and let the calculation engine determine the values
      dataForCalculation = { ...data };
    } else {
      // For all other cases, use the current prepayments
      dataForCalculation = { ...data };
    }

    // Calculate suggested prepayments for all cases except when explicitly disabled
    // This ensures we always have calculated values when navigating to screen 3
    const prelimResults = this.calculateTaxResults(data);
    const taxIncreaseBase = prelimResults.voorheffingenRows.find(r => r.description === 'Saldo 2')?.result ?? 0;
    const sepRow = prelimResults.resultRows.find(r => r.code === '1508');
    const separateAssessment = sepRow ? sepRow.result : 0;
    const suggestedPrepayments = this._calculateSuggestedPrepayments(
      data.prepaymentCalculationGoal,
      taxIncreaseBase,
      separateAssessment,
      data.isSmallCompanyFirstThreeYears,
      data.prepaymentConcentration
    );
    
    // Use suggested prepayments unless explicitly disabled
    if (data.useSuggestedPrepayments !== false) {
      dataForCalculation = {
        ...data,
        prepayments: suggestedPrepayments
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

  /**
   * Gets the current tax data state
   */
  public getData(): TaxData | null {
    return this.dataSubject.value;
  }

  /**
   * Updates the declaration sections with new data
   */
  public updateDeclarationSections(sections: DeclarationSection[]): void {
    const currentData = this.getData();
    if (currentData) {
      const updatedData: TaxData = {
        ...currentData,
        declarationSections: sections,
        lastUpdated: new Date()
      };
      console.log('Updating declaration sections:', sections);
      this.saveData(updatedData);
      this.dataSubject.next(updatedData);
    }
  }

  /**
   * Updates the input method for tax data
   */
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

  /**
   * Updates tax rate eligibility settings
   */
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

  /**
   * Resets all data to default values
   */
  public resetToDefaults(): void {
    const defaultData = this.getDefaultData();
    this.saveData(defaultData);
    this.dataSubject.next(defaultData);
  }

  /**
   * Clears all stored data
   */
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

  /**
   * Loads data from storage or initializes with defaults
   */
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
          // Forcibly enable simulation on load for consistent behavior.
          data.useSuggestedPrepayments = true;
          if (data.prepaymentConcentration === undefined) {
            data.prepaymentConcentration = 'spread';
          }
          if (data.committedPrepayments === undefined) {
            data.committedPrepayments = { ...data.prepayments };
          }
          
          console.log('Loaded data from localStorage:', data);
          this.dataSubject.next(data);
        } else {
          const defaultData = this.getDefaultData();
          console.log('No stored data, using defaults:', defaultData);
          this.saveData(defaultData);
          this.dataSubject.next(defaultData);
        }
      } else {
        const defaultData = this.getDefaultData();
        console.log('No localStorage, using defaults:', defaultData);
        this.dataSubject.next(defaultData);
      }
    } catch (error) {
      console.error('Error loading tax data:', error);
      const defaultData = this.getDefaultData();
      this.saveData(defaultData);
      this.dataSubject.next(defaultData);
    }
  }

  /**
   * Saves data to storage
   */
  private saveData(data: TaxData): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error saving tax data:', error);
    }
  }

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
        // Enable suggested prepayments for all cases except when a small company (code 1801) selects 'GeenVermeerdering'
        useSuggestedPrepayments: !(goal === 'GeenVermeerdering' && currentData.isSmallCompanyFirstThreeYears),
        lastUpdated: new Date()
      };
      
      // Reset prepayments to 0 when switching to GeenVermeerdering with code 1801
      if (goal === 'GeenVermeerdering' && currentData.isSmallCompanyFirstThreeYears) {
        updatedData.prepayments = { va1: 0, va2: 0, va3: 0, va4: 0 };
      }
      
      this.saveData(updatedData);
      this.dataSubject.next(updatedData);
      
      // Explicitly trigger calculation after updating data
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
      
      // Explicitly trigger calculation after updating concentration
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

  // =========================================
  // Section Totals Calculation
  // =========================================

  private calculateResultaatVanHetBelastbareTijdperkTotal(sections: DeclarationSection[]): number {
    return sections[0]?.fields.reduce((acc, field) => acc + (field.value || 0), 0) || 0;
  }

  private calculateAftrekkenVanDeResterendeWinstTotal(sections: DeclarationSection[]): number {
    return sections[3]?.fields.reduce((acc, field) => acc + (field.value || 0), 0) || 0;
  }

  private calculateAftrekkenResterendeWinstKorfbeperkingTotal(sections: DeclarationSection[]): number {
    return sections[5]?.fields.reduce((acc, field) => acc + (field.value || 0), 0) || 0;
  }

  private calculateAfzonderlijkTeBelastenTotal(sections: DeclarationSection[]): number {
    return sections[7]?.fields.reduce((acc, field) => acc + (field.value || 0), 0) || 0;
  }

  private calculateVoorheffingTotal(sections: DeclarationSection[]): number {
    return sections[8]?.fields.reduce((acc, field) => acc + (field.value || 0), 0) || 0;
  }

  private calculateKorfbeperking(grondslagVoorBerekeningKorf: number): number {
    return Math.min(grondslagVoorBerekeningKorf, 1000000) + Math.max(0, grondslagVoorBerekeningKorf - 1000000) * 0.7;
  }

  private getFieldValue(sections: DeclarationSection[], code: string): number {
    for (const section of sections) {
      const field = section.fields.find(f => f.code === code);
      if (field) {
        console.log(`Found field ${code} with value:`, field.value);
        return field.value || 0;
      }
    }
    console.log(`Field ${code} not found, returning 0`);
    return 0;
  }

  private recalculateTotals(data: TaxData): void {
    data.declarationSections.forEach((section) => {
      if (section.total) {
        section.total.value = section.fields.reduce((acc, field) => acc + (field.value || 0), 0);
      }
    });

    // Calculate resterend resultaat (Code 1430)
    const resultaatVanHetBelastbareTijdperkTotal = data.declarationSections[0].total?.value || 0;
    const bestanddelenVhResultaatAftrekbeperking = this.getFieldValue(data.declarationSections, '1420') || 0;
    const subtotalSection1430 = data.declarationSections[2];
    
    if (subtotalSection1430.subtotal) {
      subtotalSection1430.subtotal.value = Math.max(0, resultaatVanHetBelastbareTijdperkTotal - bestanddelenVhResultaatAftrekbeperking);
    }

    // Calculate grondslag voor de berekening korf (Code 1440)
    const aftrekkenVanDeResterendeWinstTotal = data.declarationSections[3].total?.value || 0;
    const subtotalSection1440 = data.declarationSections[4];
    
    if (subtotalSection1440.subtotal) {
      subtotalSection1440.subtotal.value = Math.max(0, (subtotalSection1430.subtotal?.value || 0) - aftrekkenVanDeResterendeWinstTotal);
    }

    // Calculate belastbare winst gewoon tarief (Code 1460)
    const aftrekkenResterendeWinstKorfbeperkingTotal = data.declarationSections[5].total?.value || 0;
    const subtotalSection1460 = data.declarationSections[6];
    
    if (subtotalSection1460.subtotal) {
      // Apply korfbeperking to section 6 deductions
      const korfbeperking = this.calculateKorfbeperking(subtotalSection1440.subtotal?.value || 0);
      const limitedAftrekkenResterendeWinstKorfbeperkingTotal = Math.min(aftrekkenResterendeWinstKorfbeperkingTotal, korfbeperking);
      
      // Calculate belastbare winst gewoon tarief
      const belastbareWinstGewoonTariefBeforeConstraint = Math.max(0, (subtotalSection1440.subtotal?.value || 0) - limitedAftrekkenResterendeWinstKorfbeperkingTotal);
      subtotalSection1460.subtotal.value = belastbareWinstGewoonTariefBeforeConstraint + bestanddelenVhResultaatAftrekbeperking;
    }
  }

  // =========================================
  // Prepayment Calculations
  // =========================================

  private calculateTotalPrepayments(prepayments: Prepayments): number {
    return prepayments.va1 + prepayments.va2 + prepayments.va3 + prepayments.va4;
  }

  private applyDeMinimisRule(vermeerderingAmount: number, taxBase: number): number {
    const deMinimisThreshold = Math.max(50, taxBase * 0.005);
    return vermeerderingAmount <= deMinimisThreshold ? 0 : vermeerderingAmount;
  }

  private _calculateSuggestedPrepayments(
    goal: PrepaymentCalculationGoal,
    taxIncreaseBase: number,
    separateAssessment: number,
    isSmallCompany: boolean,
    concentration: PrepaymentConcentration = 'spread'
  ): Prepayments {
    // Determine the increase rate based on company status
    const increaseRate = isSmallCompany ? 0 : 0.09;

    const clampPrepayments = (p: Prepayments): Prepayments => ({
      va1: Math.max(0, p.va1),
      va2: Math.max(0, p.va2),
      va3: Math.max(0, p.va3),
      va4: Math.max(0, p.va4),
    });

    switch (goal) {
      case 'GeenVermeerdering': {
        const baseVermeerdering = Math.max(0, taxIncreaseBase * 0.09);
        
        switch (concentration) {
          case 'q1':
            return clampPrepayments({ va1: baseVermeerdering / 0.12, va2: 0, va3: 0, va4: 0 });
          case 'q2':
            return clampPrepayments({ va1: 0, va2: baseVermeerdering / 0.10, va3: 0, va4: 0 });
          case 'q3':
            return clampPrepayments({ va1: 0, va2: 0, va3: baseVermeerdering / 0.08, va4: 0 });
          case 'q4':
            return clampPrepayments({ va1: 0, va2: 0, va3: 0, va4: baseVermeerdering / 0.06 });
          default:
            const p = baseVermeerdering / 0.36;
            return clampPrepayments({ va1: p, va2: p, va3: p, va4: p });
        }
      }

      case 'SaldoNul': {
        const saldo2 = taxIncreaseBase;
        const result1508 = separateAssessment;
        const mBase = Math.max(0, saldo2 * 0.09);

        const solvePrepayment = (dRate: number): number => {
          const thresh = (saldo2 + result1508);
          // When increase rate is 0, the total to be paid via prepayments is simply the tax liability.
          if (increaseRate === 0) {
            return thresh;
          }
          return thresh * dRate >= mBase ? thresh : (saldo2 + result1508 + mBase) / (1 + dRate);
        };

        switch (concentration) {
          case 'q1': {
            const P = solvePrepayment(0.12);
            return clampPrepayments({ va1: P, va2: 0, va3: 0, va4: 0 });
          }
          case 'q2': {
            const P = solvePrepayment(0.10);
            return clampPrepayments({ va1: 0, va2: P, va3: 0, va4: 0 });
          }
          case 'q3': {
            const P = solvePrepayment(0.08);
            return clampPrepayments({ va1: 0, va2: 0, va3: P, va4: 0 });
          }
          case 'q4': {
            const P = solvePrepayment(0.06);
            return clampPrepayments({ va1: 0, va2: 0, va3: 0, va4: P });
          }
          default: {
            const dRateTotal = 0.36;
            const T = solvePrepayment(dRateTotal);
            const P = T / 4;
            return clampPrepayments({ va1: P, va2: P, va3: P, va4: P });
          }
        }
      }
      
      default:
        return { va1: 0, va2: 0, va3: 0, va4: 0 };
    }
  }

  private calculateOptimalPrepayments(
    currentPrepayments: Prepayments,
    strategy: PrepaymentStrategy,
    requiredAmount: number
  ): Prepayments {
    const totalCurrent = this.calculateTotalPrepayments(currentPrepayments);
    const remaining = Math.max(0, requiredAmount - totalCurrent);
    
    const optimized = { ...currentPrepayments };
    
    switch (strategy) {
      case 'spread': {
        const emptyQuarters = ['va3', 'va4'].filter(q => 
          currentPrepayments[q as keyof Prepayments] === 0
        );
        if (emptyQuarters.length > 0) {
          const perQuarter = remaining / emptyQuarters.length;
          emptyQuarters.forEach(q => {
            optimized[q as keyof Prepayments] = perQuarter;
          });
        }
        break;
      }
      case 'q1':
        optimized.va1 = currentPrepayments.va1 + remaining;
        break;
      case 'q2':
        optimized.va2 = currentPrepayments.va2 + remaining;
        break;
      case 'q3':
        optimized.va3 = currentPrepayments.va3 + remaining;
        break;
      case 'q4':
        optimized.va4 = currentPrepayments.va4 + remaining;
        break;
    }
    
    return optimized;
  }

  // =========================================
  // Default Data
  // =========================================

  private getDefaultData(): TaxData {
    const defaultPrepayments = { va1: 0, va2: 0, va3: 0, va4: 0 };
    return {
      declarationSections: [
        {
          title: 'Resultaat van het belastbare tijdperk',
          isFoldable: true,
          isOpen: true,
          fields: [
            { code: '1080', label: 'Belastbare gereserveerde winst', value: 0 },
            { code: '1240', label: 'Verworpen uitgaven', value: 0 },
            { code: '1320', label: 'Uitgekeerde dividenden', value: 0 },
          ],
          total: { value: 0 }
        },
        {
          title: null,
          isFoldable: false,
          isOpen: true,
          fields: [
            { code: '1420', label: 'Bestanddelen vh resultaat waarop de aftrekbeperking van toepassing is', value: 0 },
          ]
        },
        {
          title: null,
          isFoldable: false,
          isOpen: true,
          fields: [],
          subtotal: {
            label: 'Resterend resultaat (Code 1430)',
            code: '1430',
            value: 0
          }
        },
        {
          title: 'Aftrekken van de resterende winst',
          isFoldable: true,
          isOpen: true,
          fields: [
            { code: '1432', label: 'Octrooi-aftrek', value: 0 },
            { code: '1433', label: 'Innovatie-aftrek', value: 0 },
            { code: '1439', label: 'Investeringsaftrek', value: 0 },            
            { code: '1438', label: 'Groepsbijdrage', value: 0 },
            { code: '1437', label: 'Risicokapitaal-aftrek', value: 0 },
            { code: '1445', label: 'Overgedragen definitief belast inkomsten', value: 0 },
          ],
          total: { value: 0 }
        },
        {
          title: null,
          isFoldable: false,
          isOpen: true,
          fields: [],
          subtotal: {
            label: 'Grondslag voor de berekening korf (Code 1440)',
            code: '1440',
            value: 0
          }
        },
        {
          title: 'Aftrekken resterende winst - korfbeperking',
          isFoldable: true,
          isOpen: true,
          fields: [
            { code: '1441', label: 'Overgedragen definitief belaste inkomsten', value: 0 },
            { code: '1442', label: 'Definitief belaste inkomsten en vrijgestelde roerende inkomsten', value: 0 },
            { code: '1436', label: 'Gecompenseerde verliezen', value: 0 },
            { code: '1443', label: 'Overgedragen onbeperkte', value: 0 },
          ],
          total: { value: 0 }
        },
        {
          title: null,
          isFoldable: false,
          isOpen: true,
          fields: [],
          subtotal: {
            label: 'Belastbare winst gewoon tarief (Code 1460)',
            code: '1460',
            value: 0
          }
        },
        {
          title: 'Afzonderlijk te belasten',
          isFoldable: true,
          isOpen: true,
          fields: [
            { code: '1508', label: 'Liquidatiereserve', value: 0 },
          ],
          total: { value: 0 }
        },
        {
          title: 'Voorheffing',
          isFoldable: true,
          isOpen: true,
          fields: [
            { code: '1830', label: 'Niet-terugbetaalbare voorheffing', value: 0 },
            { code: '1840', label: 'Terugbetaalbare voorheffing', value: 0 },
          ],
          total: { value: 0 }
        },
      ],
      inputMethod: 'manual',
      prepayments: { ...defaultPrepayments },
      committedPrepayments: { ...defaultPrepayments },
      prepaymentStrategy: 'spread',
      prepaymentCalculationGoal: PrepaymentCalculationGoal.GeenVermeerdering,
      prepaymentConcentration: 'spread',
      useSuggestedPrepayments: true,
      canUseReducedRate: false,
      isSmallCompanyFirstThreeYears: false,
      lastUpdated: new Date()
    };
  }
}