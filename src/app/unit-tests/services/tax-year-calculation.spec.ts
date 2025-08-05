import { TestBed } from '@angular/core/testing';
import { MainCalculationEngineService } from '../../services/core-engine/main-calculation-engine.service';

describe('Tax Year Calculation', () => {
  let service: MainCalculationEngineService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MainCalculationEngineService]
    });
    service = TestBed.inject(MainCalculationEngineService);
  });

  describe('calculateTaxYear', () => {
    it('should return following year when period ends on December 31st', () => {
      const periodEnd = new Date(2024, 11, 31); // December 31, 2024
      const result = service.calculateTaxYear(periodEnd);
      expect(result).toBe('2025');
    });

    it('should return same year when period ends on December 30th', () => {
      const periodEnd = new Date(2024, 11, 30); // December 30, 2024
      const result = service.calculateTaxYear(periodEnd);
      expect(result).toBe('2024');
    });

    it('should return same year when period ends on January 15th', () => {
      const periodEnd = new Date(2024, 0, 15); // January 15, 2024
      const result = service.calculateTaxYear(periodEnd);
      expect(result).toBe('2024');
    });

    it('should return following year when period ends on December 31st of 2023', () => {
      const periodEnd = new Date(2023, 11, 31); // December 31, 2023
      const result = service.calculateTaxYear(periodEnd);
      expect(result).toBe('2024');
    });

    it('should return same year when period ends on December 30th of 2023', () => {
      const periodEnd = new Date(2023, 11, 30); // December 30, 2023
      const result = service.calculateTaxYear(periodEnd);
      expect(result).toBe('2023');
    });
  });

  describe('getCurrentTaxYear', () => {
    it('should return default tax year when no period data exists', () => {
      const result = service.getCurrentTaxYear();
      expect(result).toBe('2025');
    });
  });

  describe('Tax Year Parameters', () => {
    it('should return correct quarterly rates for 2024', () => {
      const rates = service.getQuarterlyRates();
      expect(rates.Q1).toBe(0.12);
      expect(rates.Q2).toBe(0.10);
      expect(rates.Q3).toBe(0.08);
      expect(rates.Q4).toBe(0.06);
      expect(rates.TOTAL).toBe(0.36);
    });

    it('should return correct vermeerdering percentage', () => {
      const percentage = service.getVermeerderingsPercentage();
      expect(percentage).toBe(0.09);
    });

    it('should return correct reduced rate', () => {
      const rate = service.getReducedRate();
      expect(rate).toBe(0.20);
    });

    it('should return correct standard rate', () => {
      const rate = service.getStandardRate();
      expect(rate).toBe(0.25);
    });

    it('should return correct reduced rate threshold', () => {
      const threshold = service.getReducedRateThreshold();
      expect(threshold).toBe(100000);
    });

    it('should return correct korfbeperking threshold', () => {
      const threshold = service.getKorfbeperkingThreshold();
      expect(threshold).toBe(1000000);
    });

    it('should return correct korfbeperking rate', () => {
      const rate = service.getKorfbeperkingRate();
      expect(rate).toBe(0.7);
    });

    it('should return correct de minimis threshold', () => {
      const threshold = service.getDeMinimisThreshold();
      expect(threshold).toBe(50);
    });

    it('should return correct de minimis percentage', () => {
      const percentage = service.getDeMinimisPercentage();
      expect(percentage).toBe(0.005);
    });

    it('should return correct required prepayments percentage', () => {
      const percentage = service.getRequiredPrepaymentsPercentage();
      expect(percentage).toBe(0.9);
    });
  });
}); 