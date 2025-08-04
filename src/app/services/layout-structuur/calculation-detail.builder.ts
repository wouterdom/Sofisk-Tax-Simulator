import { FIELD_CODES, TAX_CONSTANTS } from '../tax-constants';
import { CalculationRow, Prepayments } from '../tax-data.types';

/**
 * Input required by the builder to assemble all row arrays that make up the
 * "Detail van de berekening" section.
 */
export interface CalculationDetailParams {
  reducedRateBase: number;
  standardRateBase: number;
  code1508: number;
  code1830: number;
  code1840: number;
  prepayments: Prepayments;
  isSmallCompanyFirstThreeYears: boolean;
}

export interface CalculationDetailResult {
  calculationRows: CalculationRow[];
  calculationTotal: number;
  voorheffingenRows: CalculationRow[];
  voorheffingenTotal: number;
  vermeerderingRows: CalculationRow[];
  vermeerderingTotal: number;
  resultRows: CalculationRow[];
  saldo2: number;
  // Extra UI helper values
  berekeningVermeerdering: number;
  totaalAftrekVA: number;
  aftrekDoorVoorafbetalingen: number;
  vermeerderingBeforeDeMinimis: number;
  deMinimisApplied: boolean;
}

/**
 * Builds all row-arrays and related totals for the calculation detail view.
 * This is **layout-oriented code**; all numerical inputs are provided by the
 * caller (MainCalculationEngineService).
 */
export function buildCalculationDetail({
  reducedRateBase,
  standardRateBase,
  code1508,
  code1830,
  code1840,
  prepayments,
  isSmallCompanyFirstThreeYears,
}: CalculationDetailParams): CalculationDetailResult {
  /* -------------------------------------------------------------
   * 1. Calculation rows (tariff split)
   * -----------------------------------------------------------*/
  const calculationRows: CalculationRow[] = [
    {
      code: FIELD_CODES.BELASTBARE_WINST_GEWOON_TARIEF,
      description: 'Belastbaar tegen verminderd tarief',
      amount: reducedRateBase,
      rate: TAX_CONSTANTS.REDUCED_RATE * 100,
      result: reducedRateBase * TAX_CONSTANTS.REDUCED_RATE,
    },
    {
      code: FIELD_CODES.BELASTBARE_WINST_GEWOON_TARIEF,
      description: 'Belastbaar tegen gewoon tarief',
      amount: standardRateBase,
      rate: TAX_CONSTANTS.STANDARD_RATE * 100,
      result: standardRateBase * TAX_CONSTANTS.STANDARD_RATE,
    },
  ];
  const calculationTotal = calculationRows.reduce((sum, r) => sum + r.result, 0);

  /* -------------------------------------------------------------
   * 2. Voorheffingen rows
   * -----------------------------------------------------------*/
  const saldo1 = calculationTotal;
  const limitedCode1830 = Math.min(code1830, saldo1);
  const saldo2 = saldo1 - limitedCode1830 - code1840;

  const voorheffingenRows: CalculationRow[] = [
    {
      code: FIELD_CODES.NIET_TERUGBETAALBARE_VOORHEFFING,
      description: 'Niet-terugbetaalbare voorheffingen',
      amount: limitedCode1830,
      rate: null,
      result: -limitedCode1830,
    },
    {
      code: FIELD_CODES.TERUGBETAALBARE_VOORHEFFING,
      description: 'Terugbetaalbare voorheffingen',
      amount: code1840,
      rate: null,
      result: -code1840,
    },
    {
      code: '',
      description: 'Saldo 2',
      amount: saldo2,
      rate: null,
      result: saldo2,
    },
  ];
  const voorheffingenTotal = voorheffingenRows.reduce((sum, r) => sum + r.result, 0);

  /* -------------------------------------------------------------
   * 3. Vermeerdering rows (advance-payment penalty)
   * -----------------------------------------------------------*/
  let vermeerderingRows: CalculationRow[] = [];
  let vermeerderingTotal = 0;
  let berekeningVermeerdering = 0;
  let totaalAftrekVA = 0;
  let aftrekDoorVoorafbetalingen = 0;
  let vermeerderingBeforeDeMinimis = 0;
  let deMinimisApplied = false;

  if (isSmallCompanyFirstThreeYears) {
    vermeerderingRows.push({
      code: '1801',
      description: 'Vermeerdering niet van toepassing (eerste 3 boekjaren)',
      amount: 0,
      rate: null,
      result: 0,
    });
  } else {
    berekeningVermeerdering = Math.max(0, saldo2 * TAX_CONSTANTS.STANDARD_INCREASE_RATE);

    const { va1, va2, va3, va4 } = prepayments;
    const deduction1 = -(va1 * TAX_CONSTANTS.QUARTERLY_RATES.Q1);
    const deduction2 = -(va2 * TAX_CONSTANTS.QUARTERLY_RATES.Q2);
    const deduction3 = -(va3 * TAX_CONSTANTS.QUARTERLY_RATES.Q3);
    const deduction4 = -(va4 * TAX_CONSTANTS.QUARTERLY_RATES.Q4);

    totaalAftrekVA = deduction1 + deduction2 + deduction3 + deduction4;
    aftrekDoorVoorafbetalingen = totaalAftrekVA;

    vermeerderingBeforeDeMinimis = Math.max(0, berekeningVermeerdering + totaalAftrekVA);
    const deMinimisThreshold = Math.max(
      TAX_CONSTANTS.DE_MINIMIS_THRESHOLD,
      saldo2 * TAX_CONSTANTS.DE_MINIMIS_PERCENTAGE,
    );
    vermeerderingTotal =
      vermeerderingBeforeDeMinimis <= deMinimisThreshold ? 0 : vermeerderingBeforeDeMinimis;
    deMinimisApplied = vermeerderingTotal === 0 && vermeerderingBeforeDeMinimis > 0;

    vermeerderingRows = [
      {
        code: '',
        description: 'Berekening vermeerdering',
        amount: saldo2,
        rate: TAX_CONSTANTS.STANDARD_INCREASE_RATE * 100,
        result: berekeningVermeerdering,
      },
      {
        code: '1811',
        description: 'Voorafbetaling 1',
        amount: va1,
        rate: TAX_CONSTANTS.QUARTERLY_RATES.Q1 * 100,
        result: deduction1,
      },
      {
        code: '1812',
        description: 'Voorafbetaling 2',
        amount: va2,
        rate: TAX_CONSTANTS.QUARTERLY_RATES.Q2 * 100,
        result: deduction2,
      },
      {
        code: '1813',
        description: 'Voorafbetaling 3',
        amount: va3,
        rate: TAX_CONSTANTS.QUARTERLY_RATES.Q3 * 100,
        result: deduction3,
      },
      {
        code: '1814',
        description: 'Voorafbetaling 4',
        amount: va4,
        rate: TAX_CONSTANTS.QUARTERLY_RATES.Q4 * 100,
        result: deduction4,
      },
      {
        code: '',
        description: 'Totaal aftrek VA',
        amount: 0,
        rate: null,
        result: totaalAftrekVA,
      },
      {
        code: '',
        description: 'Aftrek door VA',
        amount: 0,
        rate: null,
        result: totaalAftrekVA,
      },
      {
        code: '',
        description: 'Berekening vermeerdering',
        amount: 0,
        rate: null,
        result: vermeerderingBeforeDeMinimis,
      },
    ];
  }

  /* -------------------------------------------------------------
   * 4. Result rows
   * -----------------------------------------------------------*/
  const result1508 = code1508 * TAX_CONSTANTS.LIQUIDATION_RESERVE_RATE;
  // Use the tax deductions instead of raw prepayment amounts
  const voorafbetalingenTotal = totaalAftrekVA;

  const resultRows: CalculationRow[] = [
    {
      code: '',
      description: 'Saldo 2',
      amount: 0,
      rate: null,
      result: saldo2,
    },
    {
      code: '1810',
      description: 'Voorafbetalingen',
      amount: 0, // Don't show raw amount in result summary
      rate: null,
      result: totaalAftrekVA, // Use the tax deductions
    },
    {
      code: '',
      description:
        'Vermeerdering wegens ontoereikende voorafbetalingen' +
        (vermeerderingTotal === 0 && !isSmallCompanyFirstThreeYears
          ? ' (de-minimis regel toegepast)'
          : ''),
      amount: vermeerderingTotal,
      rate: null,
      result: vermeerderingTotal,
    },
    {
      code: FIELD_CODES.LIQUIDATIERESERVE,
      description:
        'Afzonderlijke aanslag van het gedeelte van de boekhoudkundige winst na belasting dat is overgeboekt naar de liquidatiereserve',
      amount: code1508,
      rate: TAX_CONSTANTS.LIQUIDATION_RESERVE_RATE * 100,
      result: result1508,
    },
  ];

  return {
    calculationRows,
    calculationTotal,
    voorheffingenRows,
    voorheffingenTotal,
    vermeerderingRows,
    vermeerderingTotal,
    resultRows,
    saldo2,
    berekeningVermeerdering,
    totaalAftrekVA,
    aftrekDoorVoorafbetalingen,
    vermeerderingBeforeDeMinimis,
    deMinimisApplied,
  };
}
