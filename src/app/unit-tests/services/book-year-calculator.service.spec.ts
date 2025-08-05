import { TestBed } from '@angular/core/testing';
import { BookYearCalculatorService, BookYearInfo, ShortBookYearPrepaymentRules, LongBookYearPrepaymentRules, LatestPrepaymentDates } from '../../services/core-engine/book-year-calculator.service';

describe('BookYearCalculatorService', () => {
  let service: BookYearCalculatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BookYearCalculatorService]
    });
    service = TestBed.inject(BookYearCalculatorService);
  });

  describe('calculateBookYearInfo', () => {
    it('should identify normal book year (12 months)', () => {
      const startDate = new Date(2024, 0, 1); // January 1, 2024
      const endDate = new Date(2024, 11, 31); // December 31, 2024
      
      const result = service.calculateBookYearInfo(startDate, endDate);
      
      expect(result.isNormalBookYear).toBe(true);
      expect(result.isShortBookYear).toBe(false);
      expect(result.isLongBookYear).toBe(false);
      expect(result.durationInMonths).toBe(12);
      expect(result.quartersInBookYear).toBe(4);
    });

    it('should identify normal book year for 2025 (01-01-2025 to 31-12-2025)', () => {
      const startDate = new Date(2025, 0, 1); // January 1, 2025
      const endDate = new Date(2025, 11, 31); // December 31, 2025
      
      const result = service.calculateBookYearInfo(startDate, endDate);
      
      expect(result.isNormalBookYear).toBe(true);
      expect(result.isShortBookYear).toBe(false);
      expect(result.isLongBookYear).toBe(false);
      expect(result.durationInMonths).toBe(12);
      expect(result.quartersInBookYear).toBe(4);
    });

    it('should identify short book year (6 months)', () => {
      const startDate = new Date(2024, 0, 1); // January 1, 2024
      const endDate = new Date(2024, 5, 30); // June 30, 2024
      
      const result = service.calculateBookYearInfo(startDate, endDate);
      
      expect(result.isShortBookYear).toBe(true);
      expect(result.isNormalBookYear).toBe(false);
      expect(result.isLongBookYear).toBe(false);
      expect(result.durationInMonths).toBe(6);
      expect(result.quartersInBookYear).toBe(2);
    });

    it('should identify long book year (18 months)', () => {
      const startDate = new Date(2024, 0, 1); // January 1, 2024
      const endDate = new Date(2025, 5, 30); // June 30, 2025
      
      const result = service.calculateBookYearInfo(startDate, endDate);
      
      expect(result.isLongBookYear).toBe(true);
      expect(result.isNormalBookYear).toBe(false);
      expect(result.isShortBookYear).toBe(false);
      expect(result.durationInMonths).toBe(18);
      expect(result.quartersInBookYear).toBe(6);
    });

    it('should calculate quarters correctly for cross-year book year', () => {
      const startDate = new Date(2024, 9, 1); // October 1, 2024
      const endDate = new Date(2025, 2, 31); // March 31, 2025
      
      const result = service.calculateBookYearInfo(startDate, endDate);
      
      expect(result.isShortBookYear).toBe(true);
      expect(result.durationInMonths).toBe(6);
      expect(result.quartersInBookYear).toBe(2); // Q4 2024 + Q1 2025
    });
  });

  describe('calculateShortBookYearPrepayments', () => {
    it('should calculate prepayment rules for 1 quarter book year', () => {
      const bookYearInfo: BookYearInfo = {
        startDate: new Date(2024, 9, 1),
        endDate: new Date(2024, 11, 31),
        durationInMonths: 3,
        durationInDays: 91,
        isShortBookYear: true,
        isLongBookYear: false,
        isNormalBookYear: false,
        quartersInBookYear: 1
      };
      
      const result = service.calculateShortBookYearPrepayments(bookYearInfo, '2025');
      
      expect(result.numberOfPrepayments).toBe(1);
      expect(result.prepaymentAmount).toBe(1); // 1/1
      expect(result.prepaymentOrder).toEqual(['VA 4']);
      expect(result.dueDates.length).toBe(1);
    });

    it('should calculate prepayment rules for 2 quarter book year', () => {
      const bookYearInfo: BookYearInfo = {
        startDate: new Date(2024, 0, 1),
        endDate: new Date(2024, 5, 30),
        durationInMonths: 6,
        durationInDays: 181,
        isShortBookYear: true,
        isLongBookYear: false,
        isNormalBookYear: false,
        quartersInBookYear: 2
      };
      
      const result = service.calculateShortBookYearPrepayments(bookYearInfo, '2025');
      
      expect(result.numberOfPrepayments).toBe(2);
      expect(result.prepaymentAmount).toBe(0.5); // 1/2
      expect(result.prepaymentOrder).toEqual(['VA 3', 'VA 4']);
      expect(result.dueDates.length).toBe(2);
    });

    it('should calculate prepayment rules for 3 quarter book year', () => {
      const bookYearInfo: BookYearInfo = {
        startDate: new Date(2024, 0, 1),
        endDate: new Date(2024, 8, 30),
        durationInMonths: 9,
        durationInDays: 273,
        isShortBookYear: true,
        isLongBookYear: false,
        isNormalBookYear: false,
        quartersInBookYear: 3
      };
      
      const result = service.calculateShortBookYearPrepayments(bookYearInfo, '2025');
      
      expect(result.numberOfPrepayments).toBe(3);
      expect(result.prepaymentAmount).toBe(1/3);
      expect(result.prepaymentOrder).toEqual(['VA 2', 'VA 3', 'VA 4']);
      expect(result.dueDates.length).toBe(3);
    });
  });

  describe('calculateLatestPrepaymentDates', () => {
    it('should calculate latest dates for normal book year', () => {
      const bookYearInfo: BookYearInfo = {
        startDate: new Date(2024, 0, 1),
        endDate: new Date(2024, 11, 31),
        durationInMonths: 12,
        durationInDays: 366,
        isShortBookYear: false,
        isLongBookYear: false,
        isNormalBookYear: true,
        quartersInBookYear: 4
      };
      
      const result = service.calculateLatestPrepaymentDates(bookYearInfo);
      
      expect(result.dates.length).toBe(4);
      expect(result.descriptions.length).toBe(4);
      expect(result.isOverdue.length).toBe(4);
      expect(result.descriptions).toEqual(['10 April', '10 Juli', '10 Oktober', '20 December']);
    });

    it('should calculate correct prepayment dates for 2025 book year (01-01-2025 to 31-12-2025)', () => {
      const bookYearInfo: BookYearInfo = {
        startDate: new Date(2025, 0, 1), // January 1, 2025
        endDate: new Date(2025, 11, 31), // December 31, 2025
        durationInMonths: 12,
        durationInDays: 365,
        isShortBookYear: false,
        isLongBookYear: false,
        isNormalBookYear: true,
        quartersInBookYear: 4
      };
      
      const result = service.calculateLatestPrepaymentDates(bookYearInfo);
      
      expect(result.dates.length).toBe(4);
      expect(result.descriptions).toEqual(['10 April', '10 Juli', '10 Oktober', '20 December']);
      
      // Check specific dates
      expect(result.dates[0].getFullYear()).toBe(2025);
      expect(result.dates[0].getMonth()).toBe(3); // April (0-indexed)
      expect(result.dates[0].getDate()).toBe(10);
      
      expect(result.dates[1].getFullYear()).toBe(2025);
      expect(result.dates[1].getMonth()).toBe(6); // July (0-indexed)
      expect(result.dates[1].getDate()).toBe(10);
      
      expect(result.dates[2].getFullYear()).toBe(2025);
      expect(result.dates[2].getMonth()).toBe(9); // October (0-indexed)
      expect(result.dates[2].getDate()).toBe(10);
      
      expect(result.dates[3].getFullYear()).toBe(2025);
      expect(result.dates[3].getMonth()).toBe(11); // December (0-indexed)
      expect(result.dates[3].getDate()).toBe(20);
    });

    it('should calculate latest dates for short book year', () => {
      const bookYearInfo: BookYearInfo = {
        startDate: new Date(2024, 0, 1),
        endDate: new Date(2024, 5, 30),
        durationInMonths: 6,
        durationInDays: 181,
        isShortBookYear: true,
        isLongBookYear: false,
        isNormalBookYear: false,
        quartersInBookYear: 2
      };
      
      const result = service.calculateLatestPrepaymentDates(bookYearInfo);
      
      expect(result.dates.length).toBe(2);
      expect(result.descriptions.length).toBe(2);
      expect(result.isOverdue.length).toBe(2);
      expect(result.descriptions).toEqual(['10e dag van de 4e maand', '10e dag van de 7e maand']);
    });
  });

  describe('getBookYearTypeDescription', () => {
    it('should return correct description for short book year', () => {
      const bookYearInfo: BookYearInfo = {
        startDate: new Date(2024, 0, 1),
        endDate: new Date(2024, 5, 30),
        durationInMonths: 6,
        durationInDays: 181,
        isShortBookYear: true,
        isLongBookYear: false,
        isNormalBookYear: false,
        quartersInBookYear: 2
      };
      
      const result = service.getBookYearTypeDescription(bookYearInfo);
      
      expect(result).toBe('Verkort boekjaar (6 maanden)');
    });

    it('should return correct description for normal book year', () => {
      const bookYearInfo: BookYearInfo = {
        startDate: new Date(2024, 0, 1),
        endDate: new Date(2024, 11, 31),
        durationInMonths: 12,
        durationInDays: 366,
        isShortBookYear: false,
        isLongBookYear: false,
        isNormalBookYear: true,
        quartersInBookYear: 4
      };
      
      const result = service.getBookYearTypeDescription(bookYearInfo);
      
      expect(result).toBe('Normaal boekjaar (12 maanden)');
    });

    it('should return correct description for long book year', () => {
      const bookYearInfo: BookYearInfo = {
        startDate: new Date(2024, 0, 1),
        endDate: new Date(2025, 5, 30),
        durationInMonths: 18,
        durationInDays: 546,
        isShortBookYear: false,
        isLongBookYear: true,
        isNormalBookYear: false,
        quartersInBookYear: 6
      };
      
      const result = service.getBookYearTypeDescription(bookYearInfo);
      
      expect(result).toBe('Verlengd boekjaar (18 maanden)');
    });
  });

  describe('getShortBookYearPrepaymentDescription', () => {
    it('should return correct description for 1 quarter', () => {
      const bookYearInfo: BookYearInfo = {
        startDate: new Date(2024, 0, 1),
        endDate: new Date(2024, 2, 31),
        durationInMonths: 3,
        durationInDays: 91,
        isShortBookYear: true,
        isLongBookYear: false,
        isNormalBookYear: false,
        quartersInBookYear: 1
      };
      
      const result = service.getShortBookYearPrepaymentDescription(bookYearInfo);
      
      expect(result).toBe('1 voorafbetaling (1/1 van het totaal)');
    });

    it('should return correct description for 2 quarters', () => {
      const bookYearInfo: BookYearInfo = {
        startDate: new Date(2024, 0, 1),
        endDate: new Date(2024, 5, 30),
        durationInMonths: 6,
        durationInDays: 181,
        isShortBookYear: true,
        isLongBookYear: false,
        isNormalBookYear: false,
        quartersInBookYear: 2
      };
      
      const result = service.getShortBookYearPrepaymentDescription(bookYearInfo);
      
      expect(result).toBe('2 voorafbetalingen (elk 1/2 van het totaal)');
    });

    it('should return empty string for normal book year', () => {
      const bookYearInfo: BookYearInfo = {
        startDate: new Date(2024, 0, 1),
        endDate: new Date(2024, 11, 31),
        durationInMonths: 12,
        durationInDays: 366,
        isShortBookYear: false,
        isLongBookYear: false,
        isNormalBookYear: true,
        quartersInBookYear: 4
      };
      
      const result = service.getShortBookYearPrepaymentDescription(bookYearInfo);
      
      expect(result).toBe('');
    });
  });
}); 