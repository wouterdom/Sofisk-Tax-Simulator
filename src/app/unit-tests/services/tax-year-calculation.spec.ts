import { TestBed } from '@angular/core/testing';
import { MainCalculationEngineService } from '../../services/core-engine/main-calculation-engine.service';
import { buildCalculationDetail } from '../../layout-builders/calculation-detail.builder';

describe('Tax Year Calculation', () => {
  let service: MainCalculationEngineService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MainCalculationEngineService]
    });
    service = TestBed.inject(MainCalculationEngineService);
  });

  describe('calculateTaxYear', () => {
    it('should return 2024 for period ending Dec 31, 2023', () => {
      const periodEnd = new Date(2023, 11, 31); // December 31, 2023
      const result = service.calculateTaxYear(periodEnd);
      expect(result).toBe('2024');
    });

    it('should return 2024 for period ending Dec 30, 2024', () => {
      const periodEnd = new Date(2024, 11, 30); // December 30, 2024
      const result = service.calculateTaxYear(periodEnd);
      expect(result).toBe('2024');
    });

    it('should return 2025 for period ending Dec 31, 2024', () => {
      const periodEnd = new Date(2024, 11, 31); // December 31, 2024
      const result = service.calculateTaxYear(periodEnd);
      expect(result).toBe('2025');
    });

    it('should return 2024 for period ending Jan 15, 2024', () => {
      const periodEnd = new Date(2024, 0, 15); // January 15, 2024
      const result = service.calculateTaxYear(periodEnd);
      expect(result).toBe('2024');
    });

    it('should return 2025 for period ending Dec 31, 2025', () => {
      const periodEnd = new Date(2025, 11, 31); // December 31, 2025
      const result = service.calculateTaxYear(periodEnd);
      expect(result).toBe('2026');
    });

    it('should return 2025 for period ending Dec 30, 2025', () => {
      const periodEnd = new Date(2025, 11, 30); // December 30, 2025
      const result = service.calculateTaxYear(periodEnd);
      expect(result).toBe('2025');
    });
  });

  describe('Calculation Detail Builder Tax Year Parameters', () => {
    it('should use correct 2024 parameters when tax year is 2024', () => {
      const result = buildCalculationDetail({
        reducedRateBase: 100000,
        standardRateBase: 0,
        code1508: 0,
        code1830: 0,
        code1840: 0,
        prepayments: { va1: 1000, va2: 1000, va3: 1000, va4: 1000 },
        isSmallCompanyFirstThreeYears: false,
        taxYear: '2024'
      });

      // Check that the vermeerdering calculation uses 2024 rates
      // 2024 vermeerdering rate should be 6.75% (0.0675)
      const vermeerderingRow = result.vermeerderingRows.find(row => 
        row.description === 'Berekening vermeerdering'
      );
      expect(vermeerderingRow?.rate).toBe(6.75); // 6.75%

      // Check that prepayment deductions use 2024 quarterly rates
      const q1Row = result.vermeerderingRows.find(row => row.code === '1811');
      const q2Row = result.vermeerderingRows.find(row => row.code === '1812');
      const q3Row = result.vermeerderingRows.find(row => row.code === '1813');
      const q4Row = result.vermeerderingRows.find(row => row.code === '1814');

      expect(q1Row?.rate).toBe(9); // 9% for 2024 Q1
      expect(q2Row?.rate).toBe(7.5); // 7.5% for 2024 Q2
      expect(q3Row?.rate).toBe(6); // 6% for 2024 Q3
      expect(q4Row?.rate).toBe(4.5); // 4.5% for 2024 Q4
    });

    it('should use correct 2025 parameters when tax year is 2025', () => {
      const result = buildCalculationDetail({
        reducedRateBase: 100000,
        standardRateBase: 0,
        code1508: 0,
        code1830: 0,
        code1840: 0,
        prepayments: { va1: 1000, va2: 1000, va3: 1000, va4: 1000 },
        isSmallCompanyFirstThreeYears: false,
        taxYear: '2025'
      });

      // Check that the vermeerdering calculation uses 2025 rates
      // 2025 vermeerdering rate should be 9% (0.09)
      const vermeerderingRow = result.vermeerderingRows.find(row => 
        row.description === 'Berekening vermeerdering'
      );
      expect(vermeerderingRow?.rate).toBe(9); // 9%

      // Check that prepayment deductions use 2025 quarterly rates
      const q1Row = result.vermeerderingRows.find(row => row.code === '1811');
      const q2Row = result.vermeerderingRows.find(row => row.code === '1812');
      const q3Row = result.vermeerderingRows.find(row => row.code === '1813');
      const q4Row = result.vermeerderingRows.find(row => row.code === '1814');

      expect(q1Row?.rate).toBe(12); // 12% for 2025 Q1
      expect(q2Row?.rate).toBe(10); // 10% for 2025 Q2
      expect(q3Row?.rate).toBe(8); // 8% for 2025 Q3
      expect(q4Row?.rate).toBe(6); // 6% for 2025 Q4
    });

    it('should default to 2025 parameters when no tax year is provided', () => {
      const result = buildCalculationDetail({
        reducedRateBase: 100000,
        standardRateBase: 0,
        code1508: 0,
        code1830: 0,
        code1840: 0,
        prepayments: { va1: 1000, va2: 1000, va3: 1000, va4: 1000 },
        isSmallCompanyFirstThreeYears: false
        // No taxYear provided, should default to 2025
      });

      // Check that it uses 2025 rates (default)
      const vermeerderingRow = result.vermeerderingRows.find(row => 
        row.description === 'Berekening vermeerdering'
      );
      expect(vermeerderingRow?.rate).toBe(9); // 9% (2025 rate)

      const q1Row = result.vermeerderingRows.find(row => row.code === '1811');
      expect(q1Row?.rate).toBe(12); // 12% (2025 Q1 rate)
    });
  });
}); 