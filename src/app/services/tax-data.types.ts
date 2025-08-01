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
  [key: string]: number;  // Add index signature for dynamic access
}

import { PrepaymentCalculationGoal } from './tax-enums';
export { PrepaymentCalculationGoal };
export type PrepaymentStrategy = 'spread' | 'q1' | 'q2' | 'q3' | 'q4';
export type PrepaymentConcentration = 'spread' | 'q1' | 'q2' | 'q3' | 'q4';

export interface CalculationRow {
  code: string;
  description: string;
  amount: number;
  rate: number | null;
  result: number;
}

export interface TaxCalculationResults {
  // Section totals (actual declaration sections)
  resultaatVanHetBelastbareTijdperkTotal: number;
  aftrekkenVanDeResterendeWinstTotal: number;
  aftrekkenResterendeWinstKorfbeperkingTotal: number;
  afzonderlijkTeBelastenTotal: number;
  voorheffingTotal: number;
  
  // Standalone fields
  bestanddelenVhResultaatAftrekbeperking: number;
  
  // Intermediate calculations
  resterendResultaat: number;
  grondslagVoorBerekeningKorf: number;
  belastbareWinstGewoonTarief: number;
  
  // Limited calculations (with korfbeperking applied)
  limitedAftrekkenResterendeWinstKorfbeperkingTotal: number;
  
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