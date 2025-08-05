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

export enum PrepaymentCalculationGoal {
  None = 'none',
  GeenVermeerdering = 'GeenVermeerdering',
  SaldoNul = 'SaldoNul'
}

export type PrepaymentStrategy = 'spread' | 'q1' | 'q2' | 'q3' | 'q4';
export type PrepaymentConcentration = 'none' | 'spread' | 'q1' | 'q2' | 'q3' | 'q4';

export interface CalculationRow {
  code: string;
  description: string;
  amount: number;
  rate: number | null;
  result: number;
}

// New interfaces for enhanced Step 1 and Step 4
export interface PeriodData {
  startDate: Date;
  endDate: Date;
  bookYear: string;
  taxYear: string;
  isConfirmed: boolean;
}

export interface InvoermethodeData {
  selectedMethod: 'handmatig' | 'vorig_jaar';
  isConfirmed: boolean;
}

export interface Declaration {
  id: string;
  name: string;
  assessmentYear: string;
  periodStart: Date;
  periodEnd: Date;
  status: 'draft' | 'submitted' | 'processed';
  lastModified: Date;
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
  
  // Explicit helper fields for UI (avoids magic row indexes)
  berekeningVermeerdering: number;
  totaalAftrekVA: number;
  aftrekDoorVoorafbetalingen: number;
  vermeerderingBeforeDeMinimis: number;
  deMinimisApplied: boolean;
  
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

  // Vereenvoudigde aangifte (simplified tax card)
  simplifiedReturnRows?: CalculationRow[];
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
  // New fields for enhanced functionality
  periodData?: PeriodData;
  invoermethodeData?: InvoermethodeData;
}