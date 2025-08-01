import { TestBed } from '@angular/core/testing';
import { PrepaymentService } from '@app/services/prepayment.service';
import { LoggingService } from '@app/services/logging.service';
import { Prepayments } from '@app/services/tax-data.types';
import { TaxError } from '@app/services/tax-error';

describe('PrepaymentService', () => {
  let service: PrepaymentService;
  let loggingService: jasmine.SpyObj<LoggingService>;

  beforeEach(() => {
    loggingService = jasmine.createSpyObj('LoggingService', ['debug', 'info', 'warn', 'error']);

    TestBed.configureTestingModule({
      providers: [
        PrepaymentService,
        { provide: LoggingService, useValue: loggingService }
      ]
    });

    service = TestBed.inject(PrepaymentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('calculateSuggestedPrepayments', () => {
    it('should return zero prepayments for small company with GeenVermeerdering goal', () => {
      const result = service.calculateSuggestedPrepayments(
        'GeenVermeerdering',
        1000,
        0,
        true,
        'spread'
      );

      expect(result).toEqual({ va1: 0, va2: 0, va3: 0, va4: 0 });
      expect(loggingService.info).toHaveBeenCalledWith('Small company in first 3 years, returning zero prepayments');
    });

    it('should calculate spread prepayments for GeenVermeerdering goal', () => {
      const result = service.calculateSuggestedPrepayments(
        'GeenVermeerdering',
        1000,
        0,
        false,
        'spread'
      );

      const expectedPayment = (1000 * 0.09) / 0.36;
      expect(result).toEqual({
        va1: expectedPayment,
        va2: expectedPayment,
        va3: expectedPayment,
        va4: expectedPayment
      });
    });

    it('should calculate concentrated prepayments for SaldoNul goal', () => {
      const result = service.calculateSuggestedPrepayments(
        'SaldoNul',
        1000,
        100,
        false,
        'q1'
      );

      expect(result.va1).toBeGreaterThan(0);
      expect(result.va2).toBe(0);
      expect(result.va3).toBe(0);
      expect(result.va4).toBe(0);
    });

    it('should throw TaxError on calculation failure', () => {
      spyOn(Math, 'max').and.throwError('Calculation error');

      expect(() => service.calculateSuggestedPrepayments(
        'GeenVermeerdering',
        1000,
        0,
        false,
        'spread'
      )).toThrow(jasmine.any(TaxError));
      expect(loggingService.error).toHaveBeenCalled();
    });
  });

  describe('calculateOptimalPrepayments', () => {
    const currentPrepayments: Prepayments = { va1: 100, va2: 100, va3: 0, va4: 0 };

    it('should spread remaining amount over empty quarters', () => {
      const result = service.calculateOptimalPrepayments(
        currentPrepayments,
        'spread',
        400
      );

      const remaining = 400 - 200; // Required - Current
      const perQuarter = remaining / 2; // Split between Q3 and Q4
      expect(result).toEqual({
        va1: 100,
        va2: 100,
        va3: perQuarter,
        va4: perQuarter
      });
    });

    it('should concentrate remaining amount in specified quarter', () => {
      const result = service.calculateOptimalPrepayments(
        currentPrepayments,
        'q3',
        400
      );

      expect(result).toEqual({
        va1: 100,
        va2: 100,
        va3: 200, // Remaining amount added to Q3
        va4: 0
      });
    });

    it('should throw TaxError on invalid strategy', () => {
      expect(() => service.calculateOptimalPrepayments(
        currentPrepayments,
        'invalid' as any,
        400
      )).toThrow(jasmine.any(TaxError));
      expect(loggingService.error).toHaveBeenCalled();
    });
  });

  describe('calculateTotalPrepayments', () => {
    it('should calculate total prepayments correctly', () => {
      const prepayments: Prepayments = { va1: 100, va2: 200, va3: 300, va4: 400 };
      const result = service.calculateTotalPrepayments(prepayments);
      expect(result).toBe(1000);
    });
  });
});