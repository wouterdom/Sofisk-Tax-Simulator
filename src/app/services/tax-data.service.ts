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

export interface TaxCalculationResults {
  // Section totals
  section1Total: number;
  section2Total: number;
  section3Total: number; // Code 1460 - Belastbare winst gewoon tarief
  section4Total: number;
  section5Total: number;
  section6Total: number;
  
  // Tax calculations
  taxableIncome: number;
  totalTaxLiability: number;
  prepaymentPenalty: number;
  finalTaxDue: number;
  
  // Prepayment optimization
  requiredPrepayments: number;
  currentPrepayments: number;
  shortfall: number;
  suggestedPrepayments: Prepayments;
}

export interface TaxData {
  declarationSections: DeclarationSection[];
  inputMethod: 'manual' | 'previous' | 'upload';
  prepayments: Prepayments;
  prepaymentStrategy: PrepaymentStrategy;
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
    
    try {
      const results = this.calculateTaxResults(data);
      this.resultsSubject.next(results);
    } catch (error) {
      console.error('Calculation error:', error);
    } finally {
      this.isLoadingSubject.next(false);
    }
  }

  private calculateTaxResults(data: TaxData): TaxCalculationResults {
    // Calculate section totals
    const section1Total = this.calculateSection1Total(data.declarationSections);
    const section2Total = this.calculateSection2Total(data.declarationSections);
    const section3Total = Math.max(0, section1Total - section2Total); // Code 1460
    const section4Total = this.calculateSection4Total(data.declarationSections);
    const section5Total = this.calculateSection5Total(data.declarationSections);
    const section6Total = this.calculateSection6Total(data.declarationSections);

    // Calculate tax liability
    const taxableIncome = section3Total;
    const totalTaxLiability = this.calculateTotalTaxLiability(taxableIncome);
    
    // Calculate prepayment requirements
    const requiredPrepayments = totalTaxLiability * 0.9; // 90% rule
    const currentPrepayments = this.calculateTotalPrepayments(data.prepayments);
    const shortfall = Math.max(0, requiredPrepayments - currentPrepayments);
    
    // Calculate penalty
    const prepaymentPenalty = shortfall * 0.075; // 7.5% penalty
    
    // Calculate final tax due
    const finalTaxDue = totalTaxLiability + prepaymentPenalty - section6Total;
    
    // Calculate suggested prepayments based on strategy
    const suggestedPrepayments = this.calculateOptimalPrepayments(
      data.prepayments,
      data.prepaymentStrategy,
      requiredPrepayments
    );

    return {
      section1Total,
      section2Total,
      section3Total,
      section4Total,
      section5Total,
      section6Total,
      taxableIncome,
      totalTaxLiability,
      prepaymentPenalty,
      finalTaxDue,
      requiredPrepayments,
      currentPrepayments,
      shortfall,
      suggestedPrepayments
    };
  }

  private calculateSection1Total(sections: DeclarationSection[]): number {
    return sections[0]?.fields.reduce((acc, field) => acc + (field.value || 0), 0) || 0;
  }

  private calculateSection2Total(sections: DeclarationSection[]): number {
    return sections[1]?.fields.reduce((acc, field) => acc + (field.value || 0), 0) || 0;
  }

  private calculateSection4Total(sections: DeclarationSection[]): number {
    return sections[3]?.fields.reduce((acc, field) => acc + (field.value || 0), 0) || 0;
  }

  private calculateSection5Total(sections: DeclarationSection[]): number {
    return sections[4]?.fields.reduce((acc, field) => acc + (field.value || 0), 0) || 0;
  }

  private calculateSection6Total(sections: DeclarationSection[]): number {
    return sections[5]?.fields.reduce((acc, field) => acc + (field.value || 0), 0) || 0;
  }

  private calculateTotalTaxLiability(taxableIncome: number): number {
    // Belgian corporate tax calculation
    const reducedTaxBase = Math.min(taxableIncome, 100000);
    const regularTaxBase = Math.max(0, taxableIncome - 100000);
    
    return (reducedTaxBase * 0.20) + (regularTaxBase * 0.25);
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

  private getDefaultData(): TaxData {
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
          title: 'Aftrekken van de resterende winst',
          isFoldable: true,
          isOpen: true,
          fields: [
            { code: '1420', label: 'Bestanddelen vh resultaat waarop de aftrekbeperking van toepassing is', value: 0 },
            { code: '1432', label: 'Niet-belastbare bestanddelen', value: 0 },
            { code: '1433', label: 'Definitief belaste inkomsten en vrijgestelde RI', value: 0 },
            { code: '1439', label: 'Aftrek innovatie-inkomsten', value: 0 },            
            { code: '1438', label: 'Aftrek voor innovatie-inkomsten', value: 0 },
            { code: '1437', label: 'Investeringsaftrek', value: 0 },
            { code: '1445', label: 'Aftrek groepsbijdrage', value: 0 },
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
      prepayments: { va1: 0, va2: 0, va3: 0, va4: 0 },
      prepaymentStrategy: 'spread',
      lastUpdated: new Date()
    };
  }

  private loadData(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
          const data = JSON.parse(stored);
          // Convert string date back to Date object
          data.lastUpdated = new Date(data.lastUpdated);
          this.dataSubject.next(data);
        } else {
          // No stored data, use defaults
          const defaultData = this.getDefaultData();
          this.saveData(defaultData);
          this.dataSubject.next(defaultData);
        }
      } else {
        // No localStorage available (SSR), use defaults
        const defaultData = this.getDefaultData();
        this.dataSubject.next(defaultData);
      }
    } catch (error) {
      console.error('Error loading tax data:', error);
      // Fallback to defaults
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

    // Calculate the main subtotal (Code 1460): Belastbare winst gewoon tarief
    // This is: (Section 1 total) - (Section 2 total)
    const section1Total = data.declarationSections[0].total?.value || 0;
    const section2Total = data.declarationSections[1].total?.value || 0;
    const subtotalSection = data.declarationSections[2];
    
    if (subtotalSection.subtotal) {
      subtotalSection.subtotal.value = Math.max(0, section1Total - section2Total);
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

  public updatePrepayments(prepayments: Prepayments): void {
    const currentData = this.getData();
    if (currentData) {
      const updatedData: TaxData = {
        ...currentData,
        prepayments: prepayments,
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

  public resetToDefaults(): void {
    const defaultData = this.getDefaultData();
    this.saveData(defaultData);
    this.dataSubject.next(defaultData);
  }

  public clearData(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(this.STORAGE_KEY);
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
} 