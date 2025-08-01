export class TaxError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, any>
  ) {
    super(message);
    this.name = 'TaxError';
  }
}

export const TaxErrorCodes = {
  CALCULATION: {
    INVALID_INPUT: 'CALC_001',
    MISSING_FIELD: 'CALC_002',
    INVALID_SECTION: 'CALC_003',
    CALCULATION_FAILED: 'CALC_004'
  },
  STORAGE: {
    LOAD_FAILED: 'STOR_001',
    SAVE_FAILED: 'STOR_002',
    INVALID_DATA: 'STOR_003'
  },
  PREPAYMENT: {
    INVALID_STRATEGY: 'PREP_001',
    INVALID_GOAL: 'PREP_002',
    CALCULATION_FAILED: 'PREP_003'
  }
} as const;