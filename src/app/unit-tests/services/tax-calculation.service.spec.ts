import { TestBed } from '@angular/core/testing';
import { TaxCalculationService } from '@app/services/tax-calculation.service';
import { LoggingService } from '@app/services/logging.service';
import { TaxData, DeclarationSection } from '@app/services/tax-data.types';
import { TaxError } from '@app/services/tax-error';

describe('TaxCalculationService', () => {
  let service: TaxCalculationService;
  let loggingService: jasmine.SpyObj<LoggingService>;

  const mockDeclarationSections: DeclarationSection[] = [
    {
      title: 'Resultaat van het belastbare tijdperk',
      isFoldable: true,
      isOpen: true,
      fields: [
        { code: '1080', label: 'Test Field 1', value: 1000 },
        { code: '1240', label: 'Test Field 2', value: 2000 }
      ],
      total: { value: 3000 }
    },
    // Empty section for index 1
    { title: null, isFoldable: false, isOpen: true, fields: [] },
    // Empty section for index 2
    { title: null, isFoldable: false, isOpen: true, fields: [] },
    {
      title: 'Aftrekken van de resterende winst',
      isFoldable: true,
      isOpen: true,
      fields: [
        { code: '1432', label: 'Test Field 3', value: 500 }
      ],
      total: { value: 500 }
    },
    // Empty section for index 4
    { title: null, isFoldable: false, isOpen: true, fields: [] },
    {
      title: 'Aftrekken resterende winst - korfbeperking',
      isFoldable: true,
      isOpen: true,
      fields: [
        { code: '1441', label: 'Test Field 4', value: 300 }
      ],
      total: { value: 300 }
    },
    // Empty section for index 6
    { title: null, isFoldable: false, isOpen: true, fields: [] },
    {
      title: 'Afzonderlijk te belasten',
      isFoldable: true,
      isOpen: true,
      fields: [
        { code: '1508', label: 'Test Field 5', value: 200 }
      ],
      total: { value: 200 }
    },
    {
      title: 'Voorheffing',
      isFoldable: true,
      isOpen: true,
      fields: [
        { code: '1830', label: 'Test Field 6', value: 100 },
        { code: '1840', label: 'Test Field 7', value: 50 }
      ],
      total: { value: 150 }
    }
  ];

  const mockTaxData: TaxData = {
    declarationSections: mockDeclarationSections,
    inputMethod: 'manual',
    prepayments: { va1: 100, va2: 100, va3: 100, va4: 100 },
    committedPrepayments: { va1: 100, va2: 100, va3: 100, va4: 100 },
    prepaymentStrategy: 'spread',
    prepaymentCalculationGoal: 'GeenVermeerdering',
    prepaymentConcentration: 'spread',
    useSuggestedPrepayments: false,
    canUseReducedRate: false,
    isSmallCompanyFirstThreeYears: false,
    lastUpdated: new Date()
  };

  beforeEach(() => {
    loggingService = jasmine.createSpyObj('LoggingService', ['debug', 'warn', 'error']);

    TestBed.configureTestingModule({
      providers: [
        TaxCalculationService,
        { provide: LoggingService, useValue: loggingService }
      ]
    });

    service = TestBed.inject(TaxCalculationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('calculateTaxResults', () => {
    it('should throw error for invalid input data', () => {
      expect(() => service.calculateTaxResults(null)).toThrow(jasmine.any(TaxError));
      expect(loggingService.error).toHaveBeenCalled();
    });

    it('should calculate tax results correctly for standard rate', () => {
      const result = service.calculateTaxResults(mockTaxData);

      expect(result.resultaatVanHetBelastbareTijdperkTotal).toBe(3000);
      expect(result.aftrekkenVanDeResterendeWinstTotal).toBe(500);
      expect(result.aftrekkenResterendeWinstKorfbeperkingTotal).toBe(300);
      expect(result.voorheffingTotal).toBe(150);
      expect(result.calculationRows.length).toBe(2);
      expect(result.voorheffingenRows.length).toBe(3);
      expect(result.vermeerderingRows.length).toBeGreaterThan(0);
      expect(result.resultRows.length).toBe(4);
    });

    it('should apply reduced rate correctly', () => {
      const dataWithReducedRate = {
        ...mockTaxData,
        canUseReducedRate: true
      };

      const result = service.calculateTaxResults(dataWithReducedRate);

      expect(result.taxAtReducedRate).toBeGreaterThan(0);
      expect(result.taxAtStandardRate).toBeGreaterThan(0);
    });

    it('should handle small company exemption correctly', () => {
      const dataWithSmallCompany = {
        ...mockTaxData,
        isSmallCompanyFirstThreeYears: true
      };

      const result = service.calculateTaxResults(dataWithSmallCompany);

      expect(result.vermeerderingTotal).toBe(0);
      expect(result.vermeerderingRows[0].description).toContain('eerste 3 boekjaren');
    });

    it('should apply de-minimis rule correctly', () => {
      // Create data that would result in a small vermeerdering
      const dataWithSmallVermeerdering = {
        ...mockTaxData,
        declarationSections: mockDeclarationSections.map(section => ({
          ...section,
          fields: section.fields.map(field => ({
            ...field,
            value: field.value / 10 // Reduce all values to create small vermeerdering
          }))
        }))
      };

      const result = service.calculateTaxResults(dataWithSmallVermeerdering);

      // If vermeerdering is below threshold, it should be zero
      expect(result.vermeerderingTotal).toBe(0);
    });
  });

  describe('section calculations', () => {
    it('should throw error for missing required sections', () => {
      const invalidData = {
        ...mockTaxData,
        declarationSections: []
      };

      expect(() => service.calculateTaxResults(invalidData)).toThrow(jasmine.any(TaxError));
      expect(loggingService.error).toHaveBeenCalled();
    });

    it('should calculate section totals correctly', () => {
      const result = service.calculateTaxResults(mockTaxData);

      expect(result.resultaatVanHetBelastbareTijdperkTotal).toBe(3000);
      expect(result.aftrekkenVanDeResterendeWinstTotal).toBe(500);
      expect(result.aftrekkenResterendeWinstKorfbeperkingTotal).toBe(300);
      expect(result.afzonderlijkTeBelastenTotal).toBe(200);
      expect(result.voorheffingTotal).toBe(150);
    });
  });

  describe('korfbeperking calculation', () => {
    it('should apply korfbeperking correctly for amounts under 1M', () => {
      const result = service.calculateTaxResults(mockTaxData);
      expect(result.limitedAftrekkenResterendeWinstKorfbeperkingTotal).toBeLessThanOrEqual(300);
    });

    it('should apply korfbeperking correctly for amounts over 1M', () => {
      const dataWithLargeAmount = {
        ...mockTaxData,
        declarationSections: mockDeclarationSections.map(section => ({
          ...section,
          fields: section.fields.map(field => ({
            ...field,
            value: field.value * 1000 // Multiply values to exceed 1M
          }))
        }))
      };

      const result = service.calculateTaxResults(dataWithLargeAmount);
      expect(result.limitedAftrekkenResterendeWinstKorfbeperkingTotal).toBeDefined();
      // Add specific assertions based on the expected korfbeperking calculation for large amounts
    });
  });
});