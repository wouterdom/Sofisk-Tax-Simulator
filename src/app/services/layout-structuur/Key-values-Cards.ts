import { CalculationRow } from '../tax-data.types';
import { FIELD_CODES } from '../tax-constants';

/**
 * Builds the "Vereenvoudigde aangifte" (Simplified Return) table.
 * High-level summary showing: taxable profit, corporate tax, withholdings, final amount.
 * Separate from calculation detail which shows the detailed breakdown.
 */
export interface SimplifiedReturnParams {
  belastbareWinstGewoonTarief: number;
  calculationTotal: number;
  voorheffingTotal: number;
  finalTaxPayable: number;
}

export function buildSimplifiedReturn({
  belastbareWinstGewoonTarief,
  calculationTotal,
  voorheffingTotal,
  finalTaxPayable,
}: SimplifiedReturnParams): CalculationRow[] {
  return [
    {
      code: FIELD_CODES.BELASTBARE_WINST_GEWOON_TARIEF,
      description: 'Belastbare winst',
      amount: belastbareWinstGewoonTarief,
      rate: null,
      result: belastbareWinstGewoonTarief,
    },
    {
      code: '',
      description: 'Vennootschapsbelasting (voorheffing niet meegerekend)',
      amount: 0,
      rate: null,
      result: calculationTotal,
    },
    {
      code: '',
      description: 'Voorheffingen',
      amount: 0,
      rate: null,
      result: -voorheffingTotal,
    },
    {
      code: '',
      description: 'Te betalen / te ontvangen',
      amount: 0,
      rate: null,
      result: finalTaxPayable,
    },
  ];
}
