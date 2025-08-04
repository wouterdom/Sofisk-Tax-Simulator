/**
 * Provides the default TaxData object used when no data is persisted yet.
 * (moved to layout-engine for clearer naming)
 */

import { PrepaymentCalculationGoal } from '../tax-enums';
import {
  TaxData,
  DeclarationField,
  DeclarationSection,
  Prepayments
} from '../tax-data.types';

export function getDefaultTaxData(): TaxData {
  const defaultPrepayments: Prepayments = { va1: 0, va2: 0, va3: 0, va4: 0 };

  const createFields = (
    fieldData: Array<{ code: string; label: string }>
  ): DeclarationField[] => fieldData.map(({ code, label }) => ({ code, label, value: 0 }));

  const createSubtotal = (label: string, code: string) => ({ label, code, value: 0 });

  return {
    declarationSections: [
      {
        title: 'Resultaat van het belastbare tijdperk',
        isFoldable: true,
        isOpen: true,
        fields: createFields([
          { code: '1080', label: 'Belastbare gereserveerde winst' },
          { code: '1240', label: 'Verworpen uitgaven' },
          { code: '1320', label: 'Uitgekeerde dividenden' }
        ]),
        total: { value: 0 }
      },
      {
        title: null,
        isFoldable: false,
        isOpen: true,
        fields: createFields([
          {
            code: '1420',
            label: 'Bestanddelen vh resultaat waarop de aftrekbeperking van toepassing is'
          }
        ])
      },
      {
        title: null,
        isFoldable: false,
        isOpen: true,
        fields: [],
        subtotal: createSubtotal('Resterend resultaat (Code 1430)', '1430')
      },
      {
        title: 'Aftrekken van de resterende winst',
        isFoldable: true,
        isOpen: true,
        fields: createFields([
          { code: '1432', label: 'Octrooi-aftrek' },
          { code: '1433', label: 'Innovatie-aftrek' },
          { code: '1439', label: 'Investeringsaftrek' },
          { code: '1438', label: 'Groepsbijdrage' },
          { code: '1437', label: 'Risicokapitaal-aftrek' },
          { code: '1445', label: 'Overgedragen definitief belast inkomsten' }
        ]),
        total: { value: 0 }
      },
      {
        title: null,
        isFoldable: false,
        isOpen: true,
        fields: [],
        subtotal: createSubtotal('Grondslag voor de berekening korf (Code 1440)', '1440')
      },
      {
        title: 'Aftrekken resterende winst - korfbeperking',
        isFoldable: true,
        isOpen: true,
        fields: createFields([
          { code: '1441', label: 'Overgedragen definitief belaste inkomsten' },
          { code: '1442', label: 'Definitief belaste inkomsten en vrijgestelde roerende inkomsten' },
          { code: '1436', label: 'Gecompenseerde verliezen' },
          { code: '1443', label: 'Overgedragen onbeperkte' }
        ]),
        total: { value: 0 }
      },
      {
        title: null,
        isFoldable: false,
        isOpen: true,
        fields: [],
        subtotal: createSubtotal('Belastbare winst gewoon tarief (Code 1460)', '1460')
      },
      {
        title: 'Afzonderlijk te belasten',
        isFoldable: true,
        isOpen: true,
        fields: createFields([{ code: '1508', label: 'Liquidatiereserve' }]),
        total: { value: 0 }
      },
      {
        title: 'Voorheffing',
        isFoldable: true,
        isOpen: true,
        fields: createFields([
          { code: '1830', label: 'Niet-terugbetaalbare voorheffing' },
          { code: '1840', label: 'Terugbetaalbare voorheffing' }
        ]),
        total: { value: 0 }
      }
    ],
    inputMethod: 'manual',
    prepayments: { ...defaultPrepayments },
    committedPrepayments: { ...defaultPrepayments },
    prepaymentStrategy: 'spread',
    prepaymentCalculationGoal: PrepaymentCalculationGoal.GeenVermeerdering,
    prepaymentConcentration: 'spread',
    useSuggestedPrepayments: false,
    canUseReducedRate: false,
    isSmallCompanyFirstThreeYears: false,
    lastUpdated: new Date()
  };
}
