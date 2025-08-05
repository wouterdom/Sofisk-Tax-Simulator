// =========================================
// Tax Calculation Constants
// =========================================

// Base parameters (2025 as reference year)
const BASE_PARAMETERS = {
  KORFBEPERKING_THRESHOLD: 1000000,
  KORFBEPERKING_RATE: 0.7,
  LIQUIDATION_RESERVE_RATE: 0.10,
  DE_MINIMIS_THRESHOLD: 50,
  DE_MINIMIS_PERCENTAGE: 0.005,
  REDUCED_RATE_THRESHOLD: 100000,
  REDUCED_RATE: 0.20,
  STANDARD_RATE: 0.25,
  REQUIRED_PREPAYMENTS_PERCENTAGE: 0.9
} as const;

// Year-specific overrides (only define what's different from base)
const YEAR_OVERRIDES = {
  '2024': {
    STANDARD_INCREASE_RATE: 0.0675, // 6.75% for VenB AJ 2024
    QUARTERLY_RATES: {
      Q1: 0.09,  // 9% for 1e voorafbetaling
      Q2: 0.075, // 7.5% for 2e voorafbetaling
      Q3: 0.06,  // 6% for 3e voorafbetaling
      Q4: 0.045, // 4.5% for 4e voorafbetaling
      TOTAL: 0.27
    }
  },
  '2025': {
    STANDARD_INCREASE_RATE: 0.09, // 9% for VenB AJ 2025
    QUARTERLY_RATES: {
      Q1: 0.12,  // 12% for 1e voorafbetaling
      Q2: 0.10,  // 10% for 2e voorafbetaling
      Q3: 0.08,  // 8% for 3e voorafbetaling
      Q4: 0.06,  // 6% for 4e voorafbetaling
      TOTAL: 0.36
    }
  },
  '2026': {
    STANDARD_INCREASE_RATE: 0.0675, // 6.75% for VenB AJ 2026
    QUARTERLY_RATES: {
      Q1: 0.09,  // 9% for 1e voorafbetaling
      Q2: 0.075, // 7.5% for 2e voorafbetaling
      Q3: 0.06,  // 6% for 3e voorafbetaling
      Q4: 0.045, // 4.5% for 4e voorafbetaling
      TOTAL: 0.27
    }
  }
} as const;

// Helper function to get parameters for a specific year
export function getTaxYearParameters(taxYear: string) {
  const yearKey = taxYear as keyof typeof YEAR_OVERRIDES;
  
  if (YEAR_OVERRIDES[yearKey]) {
    return { ...BASE_PARAMETERS, ...YEAR_OVERRIDES[yearKey] };
  }
  
  // If year not found, use the most recent available year
  const availableYears = Object.keys(YEAR_OVERRIDES).sort().reverse();
  const fallbackYear = availableYears[0] as keyof typeof YEAR_OVERRIDES;
  
  return { ...BASE_PARAMETERS, ...YEAR_OVERRIDES[fallbackYear] };
}

// Default parameters (2025)
export const TAX_CONSTANTS = getTaxYearParameters('2025');

// Helper functions for dynamic parameter lookup
export function getQuarterlyRates(taxYear: string) {
  return getTaxYearParameters(taxYear).QUARTERLY_RATES;
}

export function getVermeerderingsPercentage(taxYear: string) {
  return getTaxYearParameters(taxYear).STANDARD_INCREASE_RATE;
}

export function getReducedRate(taxYear: string) {
  return getTaxYearParameters(taxYear).REDUCED_RATE;
}

export function getStandardRate(taxYear: string) {
  return getTaxYearParameters(taxYear).STANDARD_RATE;
}

export function getReducedRateThreshold(taxYear: string) {
  return getTaxYearParameters(taxYear).REDUCED_RATE_THRESHOLD;
}

export function getKorfbeperkingThreshold(taxYear: string) {
  return getTaxYearParameters(taxYear).KORFBEPERKING_THRESHOLD;
}

export function getKorfbeperkingRate(taxYear: string) {
  return getTaxYearParameters(taxYear).KORFBEPERKING_RATE;
}

export function getDeMinimisThreshold(taxYear: string) {
  return getTaxYearParameters(taxYear).DE_MINIMIS_THRESHOLD;
}

export function getDeMinimisPercentage(taxYear: string) {
  return getTaxYearParameters(taxYear).DE_MINIMIS_PERCENTAGE;
}

export function getRequiredPrepaymentsPercentage(taxYear: string) {
  return getTaxYearParameters(taxYear).REQUIRED_PREPAYMENTS_PERCENTAGE;
}

export const FIELD_CODES = {
  BESTANDDELEN_VH_RESULTAAT_AFTREKBEPERKING: '1420',
  RESTEREND_RESULTAAT: '1430',
  GRONDSLAG_VOOR_BEREKENING_KORF: '1440',
  BELASTBARE_WINST_GEWOON_TARIEF: '1460',
  LIQUIDATIERESERVE: '1508',
  NIET_TERUGBETAALBARE_VOORHEFFING: '1830',
  TERUGBETAALBARE_VOORHEFFING: '1840'
} as const;

export const SECTION_INDICES = {
  RESULTAAT_VAN_HET_BELASTBARE_TIJDPERK: 0,
  AFTREKKEN_VAN_DE_RESTERENDE_WINST: 3,
  AFTREKKEN_RESTERENDE_WINST_KORFBEPERKING: 5,
  AFZONDERLIJK_TE_BELASTEN: 7,
  VOORHEFFING: 8
} as const;

export const STEP_CONFIG = {
  MIN_STEP: 1,
  MAX_STEP: 4,
  STEPS: {
    SELECT_INVOERMETHODE: 1,
    VEREENVOUDIGDE_AANGIFTE: 2,
    VOORSCHOTTEN_OPTIMALISEREN: 3,
    COMMIT_VOORAFBETALINGEN: 4
  }
} as const; 