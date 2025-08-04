import { TAX_CONSTANTS, FIELD_CODES, SECTION_INDICES } from '../tax-constants';
import { 
  TaxData, 
  Prepayments, 
  PrepaymentStrategy, 
  PrepaymentConcentration, 
  PrepaymentCalculationGoal 
} from '../tax-data.types';

export interface CoreEngineInput {
  declarationSections: TaxData['declarationSections'];
  canUseReducedRate: boolean;
  prepayments: Prepayments;
  isSmallCompanyFirstThreeYears: boolean;
  prepaymentCalculationGoal: PrepaymentCalculationGoal;
  prepaymentConcentration: PrepaymentConcentration;
  prepaymentStrategy: PrepaymentStrategy;
}

export interface CoreEngineOutput {
  // Section totals
  resultaatVanHetBelastbareTijdperkTotal: number;
  aftrekkenVanDeResterendeWinstTotal: number;
  aftrekkenResterendeWinstKorfbeperkingTotal: number;
  afzonderlijkTeBelastenTotal: number;
  voorheffingTotal: number;
  bestanddelenVhResultaatAftrekbeperking: number;

  // Intermediate calculations
  resterendResultaat: number;
  grondslagVoorBerekeningKorf: number;
  belastbareWinstGewoonTarief: number;
  limitedAftrekkenResterendeWinstKorfbeperkingTotal: number;

  // Rate bases
  reducedRateBase: number;
  standardRateBase: number;

  // Field values needed by builders
  code1508: number;
  code1830: number;
  code1840: number;

  // Tax components
  taxAtReducedRate: number;
  taxAtStandardRate: number;
  separateAssessment: number;
  nonRefundableWithholding: number;
  refundableWithholding: number;

  // Final results
  taxableIncome: number;
  totalTaxLiability: number;
  finalTaxDue: number;
  requiredPrepayments: number;
  currentPrepayments: number;
  shortfall: number;
  suggestedPrepayments: Prepayments;

  // Values needed for calculation detail builder
  calculationTotal: number;
  saldo2: number;
  vermeerderingTotal: number;
  berekeningVermeerdering: number;
  totaalAftrekVA: number;
  aftrekDoorVoorafbetalingen: number;
  vermeerderingBeforeDeMinimis: number;
  deMinimisApplied: boolean;
  finalTaxPayable: number;
}

export function runCoreEngine(input: CoreEngineInput): CoreEngineOutput {
  // =========================================
  // Section Totals & Intermediate Calculations
  // =========================================
  const getFieldValue = (sections: TaxData['declarationSections'], code: string): number => {
    for (const section of sections) {
      const field = section.fields.find(f => f.code === code);
      if (field) {
        return field.value || 0;
      }
    }
    return 0;
  };

  const calculateSectionTotal = (sections: TaxData['declarationSections'], sectionIndex: number): number => {
    return sections[sectionIndex]?.fields.reduce((acc, field) => acc + (field.value || 0), 0) || 0;
  };

  const resultaatVanHetBelastbareTijdperkTotal = calculateSectionTotal(input.declarationSections, SECTION_INDICES.RESULTAAT_VAN_HET_BELASTBARE_TIJDPERK);
  const bestanddelenVhResultaatAftrekbeperking = getFieldValue(input.declarationSections, FIELD_CODES.BESTANDDELEN_VH_RESULTAAT_AFTREKBEPERKING) || 0;
  const aftrekkenVanDeResterendeWinstTotal = calculateSectionTotal(input.declarationSections, SECTION_INDICES.AFTREKKEN_VAN_DE_RESTERENDE_WINST);
  const aftrekkenResterendeWinstKorfbeperkingTotal = calculateSectionTotal(input.declarationSections, SECTION_INDICES.AFTREKKEN_RESTERENDE_WINST_KORFBEPERKING);
  const afzonderlijkTeBelastenTotal = calculateSectionTotal(input.declarationSections, SECTION_INDICES.AFZONDERLIJK_TE_BELASTEN);
  const voorheffingTotal = calculateSectionTotal(input.declarationSections, SECTION_INDICES.VOORHEFFING);

  const resterendResultaat = Math.max(0, resultaatVanHetBelastbareTijdperkTotal - bestanddelenVhResultaatAftrekbeperking);
  const grondslagVoorBerekeningKorf = Math.max(0, resterendResultaat - aftrekkenVanDeResterendeWinstTotal);

  const calculateKorfbeperking = (grondslagVoorBerekeningKorf: number): number => {
    return Math.min(grondslagVoorBerekeningKorf, TAX_CONSTANTS.KORFBEPERKING_THRESHOLD) +
           Math.max(0, grondslagVoorBerekeningKorf - TAX_CONSTANTS.KORFBEPERKING_THRESHOLD) * TAX_CONSTANTS.KORFBEPERKING_RATE;
  };
  const korfbeperking = calculateKorfbeperking(grondslagVoorBerekeningKorf);
  const limitedAftrekkenResterendeWinstKorfbeperkingTotal = Math.min(aftrekkenResterendeWinstKorfbeperkingTotal, korfbeperking);

  const belastbareWinstGewoonTariefBeforeConstraint = Math.max(0, grondslagVoorBerekeningKorf - limitedAftrekkenResterendeWinstKorfbeperkingTotal);
  const belastbareWinstGewoonTarief = belastbareWinstGewoonTariefBeforeConstraint + bestanddelenVhResultaatAftrekbeperking;

  const code1508 = getFieldValue(input.declarationSections, FIELD_CODES.LIQUIDATIERESERVE) || 0;
  const code1830 = getFieldValue(input.declarationSections, FIELD_CODES.NIET_TERUGBETAALBARE_VOORHEFFING) || 0;
  const code1840 = getFieldValue(input.declarationSections, FIELD_CODES.TERUGBETAALBARE_VOORHEFFING) || 0;

  let reducedRateBase = 0;
  let standardRateBase = 0;
  if (input.canUseReducedRate) {
    reducedRateBase = Math.min(belastbareWinstGewoonTarief, TAX_CONSTANTS.REDUCED_RATE_THRESHOLD);
    standardRateBase = Math.max(0, belastbareWinstGewoonTarief - TAX_CONSTANTS.REDUCED_RATE_THRESHOLD);
  } else {
    reducedRateBase = 0;
    standardRateBase = belastbareWinstGewoonTarief;
  }

  const calculationTotal = (reducedRateBase * TAX_CONSTANTS.REDUCED_RATE) + (standardRateBase * TAX_CONSTANTS.STANDARD_RATE);
  const saldo1 = calculationTotal;
  const limitedCode1830 = Math.min(code1830, saldo1);
  const saldo2 = saldo1 - limitedCode1830 - code1840;

  // =========================================
  // Prepayment Calculations
  // =========================================
  const calculateTotalPrepayments = (prepayments: Prepayments): number => {
    return prepayments.va1 + prepayments.va2 + prepayments.va3 + prepayments.va4;
  };

  const applyDeMinimisRule = (vermeerderingAmount: number, taxBase: number): number => {
    const deMinimisThreshold = Math.max(TAX_CONSTANTS.DE_MINIMIS_THRESHOLD, taxBase * TAX_CONSTANTS.DE_MINIMIS_PERCENTAGE);
    return vermeerderingAmount <= deMinimisThreshold ? 0 : vermeerderingAmount;
  };

  const _calculateSuggestedPrepayments = (
    goal: PrepaymentCalculationGoal,
    taxIncreaseBase: number,
    separateAssessment: number,
    isSmallCompany: boolean,
    concentration: PrepaymentConcentration = 'spread'
  ): Prepayments => {
    if (concentration === 'none') {
      return { va1: 0, va2: 0, va3: 0, va4: 0 };
    }
    const increaseRate = isSmallCompany ? 0 : TAX_CONSTANTS.STANDARD_INCREASE_RATE;

    const clampPrepayments = (p: Prepayments): Prepayments => ({
      va1: Math.max(0, p.va1),
      va2: Math.max(0, p.va2),
      va3: Math.max(0, p.va3),
      va4: Math.max(0, p.va4),
    });

    switch (goal) {
      case 'GeenVermeerdering': {
        const baseVermeerdering = Math.max(0, taxIncreaseBase * TAX_CONSTANTS.STANDARD_INCREASE_RATE);
        switch (concentration) {
          case 'q1':
            return clampPrepayments({ va1: baseVermeerdering / TAX_CONSTANTS.QUARTERLY_RATES.Q1, va2: 0, va3: 0, va4: 0 });
          case 'q2':
            return clampPrepayments({ va1: 0, va2: baseVermeerdering / TAX_CONSTANTS.QUARTERLY_RATES.Q2, va3: 0, va4: 0 });
          case 'q3':
            return clampPrepayments({ va1: 0, va2: 0, va3: baseVermeerdering / TAX_CONSTANTS.QUARTERLY_RATES.Q3, va4: 0 });
          case 'q4':
            return clampPrepayments({ va1: 0, va2: 0, va3: 0, va4: baseVermeerdering / TAX_CONSTANTS.QUARTERLY_RATES.Q4 });
          default:
            const p = baseVermeerdering / TAX_CONSTANTS.QUARTERLY_RATES.TOTAL;
            return clampPrepayments({ va1: p, va2: p, va3: p, va4: p });
        }
      }
      case 'SaldoNul': {
        const mBase = Math.max(0, saldo2 * TAX_CONSTANTS.STANDARD_INCREASE_RATE);
        const solvePrepayment = (dRate: number): number => {
          const thresh = (saldo2 + separateAssessment);
          if (increaseRate === 0) {
            return thresh;
          }
          return thresh * dRate >= mBase ? thresh : (saldo2 + separateAssessment + mBase) / (1 + dRate);
        };
        switch (concentration) {
          case 'q1': {
            const P = solvePrepayment(TAX_CONSTANTS.QUARTERLY_RATES.Q1);
            return clampPrepayments({ va1: P, va2: 0, va3: 0, va4: 0 });
          }
          case 'q2': {
            const P = solvePrepayment(TAX_CONSTANTS.QUARTERLY_RATES.Q2);
            return clampPrepayments({ va1: 0, va2: P, va3: 0, va4: 0 });
          }
          case 'q3': {
            const P = solvePrepayment(TAX_CONSTANTS.QUARTERLY_RATES.Q3);
            return clampPrepayments({ va1: 0, va2: 0, va3: P, va4: 0 });
          }
          case 'q4': {
            const P = solvePrepayment(TAX_CONSTANTS.QUARTERLY_RATES.Q4);
            return clampPrepayments({ va1: 0, va2: 0, va3: 0, va4: P });
          }
          default: {
            const dRateTotal = TAX_CONSTANTS.QUARTERLY_RATES.TOTAL;
            const T = solvePrepayment(dRateTotal);
            const P = T / 4;
            return clampPrepayments({ va1: P, va2: P, va3: P, va4: P });
          }
        }
      }
      default:
        return { va1: 0, va2: 0, va3: 0, va4: 0 };
    }
  };

  const calculateOptimalPrepayments = (
    currentPrepayments: Prepayments,
    strategy: PrepaymentStrategy,
    requiredAmount: number
  ): Prepayments => {
    const totalCurrent = calculateTotalPrepayments(currentPrepayments);
    const remaining = Math.max(0, requiredAmount - totalCurrent);
    const optimized = { ...currentPrepayments };
    switch (strategy) {
      case 'spread': {
        const emptyQuarters = ['va1', 'va2', 'va3', 'va4'].filter(q =>
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
  };

  let vermeerderingTotal = 0;
  let berekeningVermeerdering = 0;
  let totaalAftrekVA = 0;
  let aftrekDoorVoorafbetalingen = 0;
  let vermeerderingBeforeDeMinimis = 0;
  let deMinimisApplied = false;

  if (input.isSmallCompanyFirstThreeYears) {
    vermeerderingTotal = 0;
  } else {
    const rawVermeerdering = Math.max(0, saldo2 * TAX_CONSTANTS.STANDARD_INCREASE_RATE);
    berekeningVermeerdering = rawVermeerdering;

    const va1 = input.prepayments.va1;
    const va2 = input.prepayments.va2;
    const va3 = input.prepayments.va3;
    const va4 = input.prepayments.va4;
    const deduction1 = -(va1 * TAX_CONSTANTS.QUARTERLY_RATES.Q1);
    const deduction2 = -(va2 * TAX_CONSTANTS.QUARTERLY_RATES.Q2);
    const deduction3 = -(va3 * TAX_CONSTANTS.QUARTERLY_RATES.Q3);
    const deduction4 = -(va4 * TAX_CONSTANTS.QUARTERLY_RATES.Q4);
    const totalAftrekVA = deduction1 + deduction2 + deduction3 + deduction4;
    totaalAftrekVA = totalAftrekVA;
    aftrekDoorVoorafbetalingen = totalAftrekVA;

    vermeerderingBeforeDeMinimis = Math.max(0, rawVermeerdering + totalAftrekVA);
    vermeerderingTotal = applyDeMinimisRule(vermeerderingBeforeDeMinimis, saldo2);
    deMinimisApplied = vermeerderingTotal === 0 && vermeerderingBeforeDeMinimis > 0;
  }

  const taxAtReducedRate = reducedRateBase * TAX_CONSTANTS.REDUCED_RATE;
  const taxAtStandardRate = standardRateBase * TAX_CONSTANTS.STANDARD_RATE;
  const separateAssessment = code1508 * TAX_CONSTANTS.LIQUIDATION_RESERVE_RATE;
  const nonRefundableWithholding = -limitedCode1830;
  const refundableWithholding = -code1840;

  const voorafbetalingenTotal = calculateTotalPrepayments(input.prepayments);
  const finalTaxPayable = saldo2 - voorafbetalingenTotal + vermeerderingTotal + separateAssessment;

  const taxableIncome = belastbareWinstGewoonTarief;
  const totalTaxLiability = finalTaxPayable;
  const finalTaxDue = totalTaxLiability;
  const requiredPrepayments = totalTaxLiability * TAX_CONSTANTS.REQUIRED_PREPAYMENTS_PERCENTAGE;
  const currentPrepayments = calculateTotalPrepayments(input.prepayments);
  const shortfall = Math.max(0, requiredPrepayments - currentPrepayments);

  // Calculate suggested prepayments (after all required values are available)
  let suggestedPrepayments: Prepayments;
  
  if (input.prepaymentCalculationGoal === 'GeenVermeerdering' || input.prepaymentCalculationGoal === 'SaldoNul') {
    // For both "Geen vermeerdering" and "SaldoNul", use the existing helper function
    suggestedPrepayments = _calculateSuggestedPrepayments(
      input.prepaymentCalculationGoal,
      saldo2,
      separateAssessment,
      input.isSmallCompanyFirstThreeYears,
      input.prepaymentConcentration
    );
  } else {
    // Default case
    suggestedPrepayments = { va1: 0, va2: 0, va3: 0, va4: 0 };
  }

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
    reducedRateBase,
    standardRateBase,
    code1508,
    code1830,
    code1840,
    taxAtReducedRate,
    taxAtStandardRate,
    separateAssessment,
    nonRefundableWithholding,
    refundableWithholding,
    taxableIncome,
    totalTaxLiability,
    finalTaxDue,
    requiredPrepayments,
    currentPrepayments,
    shortfall,
    suggestedPrepayments,
    calculationTotal,
    saldo2,
    vermeerderingTotal,
    berekeningVermeerdering,
    totaalAftrekVA,
    aftrekDoorVoorafbetalingen,
    vermeerderingBeforeDeMinimis,
    deMinimisApplied,
    finalTaxPayable
  };
}