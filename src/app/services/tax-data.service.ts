import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

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
  }
}

export interface Prepayments {
  va1: number;
  va2: number;
  va3: number;
  va4: number;
}

export type PrepaymentStrategy = 'spread' | 'q1' | 'q2' | 'q3' | 'q4';
export type PrepaymentCalculationGoal = 'GeenVermeerdering' | 'SaldoNul';
export type PrepaymentConcentration = 'spread' | 'q1' | 'q2' | 'q3' | 'q4';

export interface CalculationRow {
  code: string;
  description: string;
  amount: number;
  rate: number | null;
  result: number;
}

export interface TaxCalculationResults {
  // Section totals
  section1Total: number;
  section2Total: number;
  section3Total: number; // Code 1460 - Belastbare winst gewoon tarief
  section4Total: number;
  section5Total: number;
  section6Total: number;
  
  // New intermediate calculations
  code1430: number; // Resterend resultaat
  code1440: number; // Grondslag voor de berekening korf
  
  // Detailed calculation sections
  calculationRows: CalculationRow[];
  calculationTotal: number;
  
  // Voorheffingen section
  voorheffingenRows: CalculationRow[];
  voorheffingenTotal: number;
  
  // Vermeerdering en Voorafbetalingen section
  vermeerderingRows: CalculationRow[];
  vermeerderingTotal: number;
  
  // Result section
  resultRows: CalculationRow[];
  finalTaxPayable: number;
  
  // Tax calculations
  taxableIncome: number;
  totalTaxLiability: number;
finalTaxDue: number;
  
  // Display-oriented calculation results
  taxAtReducedRate: number;
  taxAtStandardRate: number;
  nonRefundableWithholding: number;
refundableWithholding: number;
separateAssessment: number;
vermeerderingWegensOntoereikendeVoorafbetalingen: number;
  
  // Prepayment optimization
  requiredPrepayments: number;
  currentPrepayments: number;
  shortfall: number;
  suggestedPrepayments: Prepayments;
  limitedSection4Total: number;
  code1460: number;
}

export interface TaxData {
  declarationSections: DeclarationSection[];
  inputMethod: 'manual' | 'previous' | 'upload';
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

@Injectable({
  providedIn: 'root'
})
export class TaxDataService {
  private readonly STORAGE_KEY = 'sofisk_tax_data';
  private dataSubject = new BehaviorSubject<TaxData | null>(null);
  private resultsSubject = new BehaviorSubject<TaxCalculationResults | null>(null);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  
  public data$ = this.dataSubject.asObservable();
  public results$ = this.resultsSubject.asObservable();
  public isLoading$ = this.isLoadingSubject.asObservable();

  constructor() {
    this.loadData();
    this.setupReactiveCalculations();
  }

  private setupReactiveCalculations(): void {
    // Debounced calculation trigger
    this.data$.pipe(
      debounceTime(300),
      distinctUntilChanged((prev: TaxData | null, curr: TaxData | null) => JSON.stringify(prev) === JSON.stringify(curr))
    ).subscribe(data => {
      if (data) {
        this.performCalculation(data);
      }
    });
  }

  private performCalculation(data: TaxData): void {
    this.isLoadingSubject.next(true);

    let dataForCalculation = data;

    // If the goal is to use a calculated suggestion, we must first run a preliminary calculation
    // to get the inputs needed for the suggestion logic (like `saldo2` and `finalTaxPayable`).
    if (data.useSuggestedPrepayments) {
        const prelimResults = this.calculateTaxResults(data);
        const taxIncreaseBase = prelimResults.voorheffingenRows.find(r => r.description === 'Saldo 2')?.result ?? 0;
        
                    // Separate assessment (code 1508) result row
            const sepRow = prelimResults.resultRows.find(r => r.code === '1508');
            const separateAssessment = sepRow ? sepRow.result : 0;
            const suggestedPrepayments = this._calculateSuggestedPrepayments(
              data.prepaymentCalculationGoal,
              taxIncreaseBase,
              separateAssessment,
              data.isSmallCompanyFirstThreeYears,
              data.prepaymentConcentration
            );
        
        dataForCalculation = {
            ...data,
            prepayments: suggestedPrepayments
        };
    }

    try {
      const results = this.calculateTaxResults(dataForCalculation);
      this.resultsSubject.next(results);
    } catch (error) {
      console.error('Calculation error:', error);
    } finally {
      this.isLoadingSubject.next(false);
    }
  }

  private _calculateSuggestedPrepayments(
    goal: PrepaymentCalculationGoal,
    taxIncreaseBase: number,
    separateAssessment: number,
    isSmallCompany: boolean,
    concentration: PrepaymentConcentration = 'spread'
  ): Prepayments {
    // If it's a small company in first 3 years, no increase is due, so no prepayments are needed to avoid it.
    if (goal === 'GeenVermeerdering' && isSmallCompany) {
        return { va1: 0, va2: 0, va3: 0, va4: 0 };
    }

    function clampPrepayments(p: Prepayments): Prepayments {
      return {
        va1: Math.max(0, p.va1),
        va2: Math.max(0, p.va2),
        va3: Math.max(0, p.va3),
        va4: Math.max(0, p.va4),
      };
    }

    switch (goal) {
        case 'GeenVermeerdering': {
            // The vermeerdering is calculated as 9% of Saldo 2
            const baseVermeerdering = Math.max(0, taxIncreaseBase * 0.09);
            
            // Calculate how much prepayment is needed to offset the vermeerdering
            // Based on the concentration strategy
            switch (concentration) {
                case 'q1':
                    // All in Q1: P * 12% = baseVermeerdering => P = baseVermeerdering / 0.12
                    return clampPrepayments({ va1: baseVermeerdering / 0.12, va2: 0, va3: 0, va4: 0 });
                case 'q2':
                    // All in Q2: P * 10% = baseVermeerdering => P = baseVermeerdering / 0.10
                    return clampPrepayments({ va1: 0, va2: baseVermeerdering / 0.10, va3: 0, va4: 0 });
                case 'q3':
                    // All in Q3: P * 8% = baseVermeerdering => P = baseVermeerdering / 0.08
                    return clampPrepayments({ va1: 0, va2: 0, va3: baseVermeerdering / 0.08, va4: 0 });
                case 'q4':
                    // All in Q4: P * 6% = baseVermeerdering => P = baseVermeerdering / 0.06
                    return clampPrepayments({ va1: 0, va2: 0, va3: 0, va4: baseVermeerdering / 0.06 });
                case 'spread':
                default:
                    // Spread equally: 4*P*0.09 = baseVermeerdering => P = baseVermeerdering / 0.36
                    const p = baseVermeerdering / 0.36;
                    return clampPrepayments({ va1: p, va2: p, va3: p, va4: p });
            }
        }

        case 'SaldoNul': {
            // To get a final balance of zero, we need to solve:
            // 0 = saldo2 - voorafbetalingenTotal + vermeerderingTotal + result1508
            // Where vermeerderingTotal depends on the prepayments
            
            // Solve analytically depending on whether prepayment deduction already cancels vermeerdering
            const saldo2 = taxIncreaseBase;
            const result1508 = separateAssessment; // already 10% applied
            const mBase = Math.max(0, saldo2 * 0.09);

            function solvePrepayment(dRate: number): number {
              // Case A: prepayment big enough so that P*dRate >= mBase
              const thresh = (saldo2 + result1508);
              if (thresh * dRate >= mBase) {
                return thresh; // this satisfies case A
              }
              // Otherwise solve with vermeerdering remaining
              return (saldo2 + result1508 + mBase) / (1 + dRate);
            }

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
              case 'spread':
              default: {
                // spread equally among 4 quarters; deduction factor total 0.36 on total prepayment 4P
                // effective deduction rate on total prepayment is 0.36/4 = 0.09 per quarter but easier treat total
                const dRateTotal = 0.36; // on total prepayment T
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

  private calculateTaxResults(data: TaxData): TaxCalculationResults {
    // Calculate section totals
    const section1Total = this.calculateSection1Total(data.declarationSections);
    const code1420 = this.getFieldValue(data.declarationSections, '1420') || 0;
    const section4Total = this.calculateSection4Total(data.declarationSections); // Aftrekken van de resterende winst
    const section6Total = this.calculateSection6Total(data.declarationSections); // Aftrekken resterende winst - korfbeperking
    const section8Total = this.calculateSection8Total(data.declarationSections); // Afzonderlijk te belasten
    const section9Total = this.calculateSection9Total(data.declarationSections); // Voorheffing
    
    // Calculate code 1430 (Resterend resultaat)
    const resterendResultaat = Math.max(0, section1Total - code1420);
    
    // Calculate code 1440 (Grondslag voor de berekening korf)
    const code1440 = Math.max(0, resterendResultaat - section4Total);
    
    // Apply korfbeperking to section 6 deductions using code 1440
    const korfbeperking = this.calculateKorfbeperking(code1440);
    const limitedSection6Total = Math.min(section6Total, korfbeperking);
    
         // Calculate code 1460 (Belastbare winst gewoon tarief)
     const code1460BeforeConstraint = Math.max(0, code1440 - limitedSection6Total);
     const code1460 = code1460BeforeConstraint + code1420; // Actual result + code 1420

    // Get specific field values for calculation rows
    const code1508 = this.getFieldValue(data.declarationSections, '1508') || 0;
    const code1830 = this.getFieldValue(data.declarationSections, '1830') || 0;
    const code1840 = this.getFieldValue(data.declarationSections, '1840') || 0;

    // Calculate reduced rate portion based on checkbox state
    let reducedRateBase = 0;
    let standardRateBase = 0;
    
    if (data.canUseReducedRate) {
      // If checkbox is checked, apply reduced rate to first €100,000
      reducedRateBase = Math.min(code1460, 100000);
      standardRateBase = Math.max(0, code1460 - 100000);
    } else {
      // If checkbox is unchecked, apply standard rate to full amount
      reducedRateBase = 0;
      standardRateBase = code1460;
    }

    // Build calculation rows - always show these lines
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
     
     const code1508Total = code1508 * 0.10;
     
              // Build voorheffingen rows - always show these lines
    const saldo1 = calculationTotal; // Tax before voorheffingen
    const limitedCode1830 = Math.min(code1830, saldo1); // Niet-terugbetaalbare voorheffingen cannot exceed Saldo 1
     
         // Calculate Saldo 2: Saldo 1 - 1830 - 1840 (can be negative)
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
        let vermeerderingTotal = 0;
    let vermeerderingRows: CalculationRow[] = [];

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
      // Calculate the raw vermeerdering amount (always show this)
      const rawVermeerdering = Math.max(0, saldo2 * 0.09);
      // Prepayment deductions
      const va1 = data.prepayments.va1;
      const va2 = data.prepayments.va2;
      const va3 = data.prepayments.va3;
      const va4 = data.prepayments.va4;
      const deduction1 = -(va1 * 0.12);
      const deduction2 = -(va2 * 0.10);
      const deduction3 = -(va3 * 0.08);
      const deduction4 = -(va4 * 0.06);
      const totalAftrekVA = deduction1 + deduction2 + deduction3 + deduction4;
      
      // Calculate the final vermeerdering before de-minimis rule
      const vermeerderingBeforeDeMinimis = Math.max(0, rawVermeerdering + totalAftrekVA);
      // Apply de-minimis rule to the final result
      const finalVermeerdering = this.applyDeMinimisRule(vermeerderingBeforeDeMinimis, saldo2);
      
      // Always show the raw vermeerdering calculation
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
        // New: Totaal aftrek VA row
        {
          code: '',
          description: 'Totaal aftrek VA',
          amount: 0,
          rate: null,
          result: totalAftrekVA
        },
        // New: Aftrek door VA row (same as above, for clarity)
        {
          code: '',
          description: 'Aftrek door VA',
          amount: 0,
          rate: null,
          result: totalAftrekVA
        },
        // New: Berekening vermeerdering after prepayments (before de-minimis)
        {
          code: '',
          description: 'Berekening vermeerdering',
          amount: 0,
          rate: null,
          result: vermeerderingBeforeDeMinimis
        }
      ];
      // Use final vermeerdering with de-minimis rule applied
      vermeerderingTotal = finalVermeerdering;
    }
     
    // Calculate total taxes payable: Saldo 2 - Voorafbetalingen + Vermeerdering + Code 1508
    const voorafbetalingenTotal = this.calculateTotalPrepayments(data.prepayments);
    const result1508 = code1508 * 0.10;
    const finalTaxPayable = saldo2 - voorafbetalingenTotal + vermeerderingTotal + result1508;

    // Build result rows - always show these lines
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

    // Calculate tax liability and prepayments (keeping existing logic)
    const taxableIncome = code1460;
    const totalTaxLiability = finalTaxPayable;
    
    // Calculate prepayment requirements
    const requiredPrepayments = totalTaxLiability * 0.9; // 90% rule
    const currentPrepayments = this.calculateTotalPrepayments(data.prepayments);
    const shortfall = Math.max(0, requiredPrepayments - currentPrepayments);
    
    // Calculate final tax due
const finalTaxDue = totalTaxLiability;
    
    // Calculate suggested prepayments based on strategy
    const suggestedPrepayments = this.calculateOptimalPrepayments(
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
       section1Total,
       section2Total: code1420, // Now just code 1420
       section3Total: code1460, // Final code 1460 value
       section4Total: section4Total, // Aftrekken van de resterende winst
       section5Total: section6Total, // Aftrekken resterende winst - korfbeperking
       section6Total: section8Total, // Afzonderlijk te belasten
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
       limitedSection4Total: limitedSection6Total,
       code1460,
       code1430: resterendResultaat,
       code1440: code1440,
       taxAtReducedRate,
       taxAtStandardRate,
       nonRefundableWithholding,
refundableWithholding,
separateAssessment,
vermeerderingWegensOntoereikendeVoorafbetalingen: vermeerderingTotal
     };
  }

  private calculateSection1Total(sections: DeclarationSection[]): number {
    return sections[0]?.fields.reduce((acc, field) => acc + (field.value || 0), 0) || 0;
  }

  private calculateSection3Total(sections: DeclarationSection[]): number {
    return sections[2]?.fields.reduce((acc, field) => acc + (field.value || 0), 0) || 0;
  }

  private calculateSection5Total(sections: DeclarationSection[]): number {
    return sections[4]?.fields.reduce((acc, field) => acc + (field.value || 0), 0) || 0;
  }

  private calculateSection6Total(sections: DeclarationSection[]): number {
    return sections[5]?.fields.reduce((acc, field) => acc + (field.value || 0), 0) || 0;
  }

  private calculateSection7Total(sections: DeclarationSection[]): number {
    return sections[6]?.fields.reduce((acc, field) => acc + (field.value || 0), 0) || 0;
  }

  private calculateSection4Total(sections: DeclarationSection[]): number {
    return sections[3]?.fields.reduce((acc, field) => acc + (field.value || 0), 0) || 0;
  }

  private calculateSection8Total(sections: DeclarationSection[]): number {
    return sections[7]?.fields.reduce((acc, field) => acc + (field.value || 0), 0) || 0;
  }

  private calculateSection9Total(sections: DeclarationSection[]): number {
    return sections[8]?.fields.reduce((acc, field) => acc + (field.value || 0), 0) || 0;
  }

  private calculateTotalTaxLiability(taxableIncome: number, canUseReducedRate: boolean): number {
    // Belgian corporate tax calculation
    if (canUseReducedRate) {
      // Apply reduced rate to first €100,000
      const reducedTaxBase = Math.min(taxableIncome, 100000);
      const regularTaxBase = Math.max(0, taxableIncome - 100000);
      return (reducedTaxBase * 0.20) + (regularTaxBase * 0.25);
    } else {
      // Apply standard rate to full amount
      return taxableIncome * 0.25;
    }
  }

  private calculateTotalPrepayments(prepayments: Prepayments): number {
    return prepayments.va1 + prepayments.va2 + prepayments.va3 + prepayments.va4;
  }

  private calculateOptimalPrepayments(
    currentPrepayments: Prepayments,
    strategy: PrepaymentStrategy,
    requiredAmount: number
  ): Prepayments {
    const totalCurrent = this.calculateTotalPrepayments(currentPrepayments);
    const remaining = Math.max(0, requiredAmount - totalCurrent);
    
    let optimized = { ...currentPrepayments };
    
    switch (strategy) {
      case 'spread':
        // Distribute over remaining quarters
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

  private calculateKorfbeperking(code1460: number): number {
    // Korfbeperking formula: MIN(code1460, 1000000) + MAX(0, code1460 - 1000000) * 0.7
    return Math.min(code1460, 1000000) + Math.max(0, code1460 - 1000000) * 0.7;
  }

  private applyDeMinimisRule(vermeerderingAmount: number, taxBase: number): number {
    // De-minimis rule: no increase is due if the amount is less than €50 or 0.5% of the tax base
    const deMinimisThreshold = Math.max(50, taxBase * 0.005);
    
    if (vermeerderingAmount <= deMinimisThreshold) {
      return 0;
    }
    
    return vermeerderingAmount;
  }

  private getFieldValue(sections: DeclarationSection[], code: string): number {
    for (const section of sections) {
      const field = section.fields.find(f => f.code === code);
      if (field) {
        return field.value || 0;
      }
    }
    return 0;
  }

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
      prepaymentCalculationGoal: 'GeenVermeerdering',
      prepaymentConcentration: 'spread',
      useSuggestedPrepayments: false,
      canUseReducedRate: false,
      isSmallCompanyFirstThreeYears: false,
      lastUpdated: new Date()
    };
  }

  private loadData(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
          const data = JSON.parse(stored);
          data.lastUpdated = new Date(data.lastUpdated);
          if (data.prepaymentCalculationGoal === undefined) {
            data.prepaymentCalculationGoal = 'GeenVermeerdering';
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
          this.dataSubject.next(data);
        } else {
          const defaultData = this.getDefaultData();
          this.saveData(defaultData);
          this.dataSubject.next(defaultData);
        }
      } else {
        const defaultData = this.getDefaultData();
        this.dataSubject.next(defaultData);
      }
    } catch (error) {
      console.error('Error loading tax data:', error);
      const defaultData = this.getDefaultData();
      this.saveData(defaultData);
      this.dataSubject.next(defaultData);
    }
  }

  private recalculateTotals(data: TaxData): void {
    // Calculate totals for each section
    data.declarationSections.forEach(section => {
      if (section.total) {
        section.total.value = section.fields.reduce((acc, field) => acc + (field.value || 0), 0);
      }
    });

    // Calculate code 1430 (Resterend resultaat): Section 1 total - code 1420
    const section1Total = data.declarationSections[0].total?.value || 0;
    const code1420 = this.getFieldValue(data.declarationSections, '1420') || 0;
    const subtotalSection1430 = data.declarationSections[2]; // Section 3
    
    if (subtotalSection1430.subtotal) {
      subtotalSection1430.subtotal.value = Math.max(0, section1Total - code1420);
    }

    // Calculate code 1440 (Grondslag voor de berekening korf): Code 1430 - Section 4 total
    const section4Total = data.declarationSections[3].total?.value || 0;
    const subtotalSection1440 = data.declarationSections[4]; // Section 5
    
    if (subtotalSection1440.subtotal) {
      subtotalSection1440.subtotal.value = Math.max(0, (subtotalSection1430.subtotal?.value || 0) - section4Total);
    }

    // Calculate code 1460 (Belastbare winst gewoon tarief): Code 1440 - Section 6 total (with korfbeperking)
    const section6Total = data.declarationSections[5].total?.value || 0;
    const subtotalSection1460 = data.declarationSections[6]; // Section 7
    
    if (subtotalSection1460.subtotal) {
      // Apply korfbeperking to section 6 deductions
      const korfbeperking = this.calculateKorfbeperking(subtotalSection1440.subtotal?.value || 0);
      const limitedSection6Total = Math.min(section6Total, korfbeperking);
      
             // Calculate code 1460: actual result + code 1420
       const code1460BeforeConstraint = Math.max(0, (subtotalSection1440.subtotal?.value || 0) - limitedSection6Total);
       subtotalSection1460.subtotal.value = code1460BeforeConstraint + code1420;
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

  public getData(): TaxData | null {
    return this.dataSubject.value;
  }

  public updateDeclarationSections(sections: DeclarationSection[]): void {
    const currentData = this.getData();
    if (currentData) {
      const updatedData: TaxData = {
        ...currentData,
        declarationSections: sections,
        lastUpdated: new Date()
      };
      this.saveData(updatedData);
      this.dataSubject.next(updatedData);
    }
  }

  public updateInputMethod(method: 'manual' | 'previous' | 'upload'): void {
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

  public updatePrepayments(prepayments: Prepayments, useSuggested: boolean = false): void {
    const currentData = this.getData();
    if (currentData) {
      const updatedData: TaxData = {
        ...currentData,
        prepayments: prepayments,
        useSuggestedPrepayments: useSuggested,
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
        useSuggestedPrepayments: true, // When goal changes, always use suggestions
        lastUpdated: new Date()
      };
      this.saveData(updatedData);
      this.dataSubject.next(updatedData);
    }
  }
  
  public updatePrepaymentConcentration(concentration: PrepaymentConcentration): void {
    const currentData = this.getData();
    if (currentData) {
      const updatedData: TaxData = {
        ...currentData,
        prepaymentConcentration: concentration,
        useSuggestedPrepayments: true, // When concentration changes, always use suggestions
        lastUpdated: new Date()
      };
      this.saveData(updatedData);
      this.dataSubject.next(updatedData);
    }
  }

  public updatePrepaymentStrategy(strategy: PrepaymentStrategy): void {
    const currentData = this.getData();
    if (currentData) {
      const updatedData: TaxData = {
        ...currentData,
        prepaymentStrategy: strategy,
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
    const defaultData = this.getDefaultData();
    this.saveData(defaultData);
    this.dataSubject.next(defaultData);
  }

  public clearData(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem('sofisk_current_step');
    }
    this.dataSubject.next(null);
  }

  public exportData(): string {
    const data = this.getData();
    return data ? JSON.stringify(data, null, 2) : '';
  }

  public importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      data.lastUpdated = new Date();
      this.saveData(data);
      this.dataSubject.next(data);
      return true;
    } catch (error) {
      console.error('Error importing tax data:', error);
      return false;
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

  public getCommittedPrepayments(): Prepayments {
    const currentData = this.getData();
    return currentData?.committedPrepayments || { va1: 0, va2: 0, va3: 0, va4: 0 };
  }
}
