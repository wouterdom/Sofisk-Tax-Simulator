import { TestBed } from '@angular/core/testing';
import { TaxStorageService } from '@app/services/utils/storage.service';
import { LoggingService } from '@app/services/utils/logging.service';
import { TaxError } from '@app/services/types/tax-error';
import { TaxData } from '@app/services/types/tax-data.types';
import { PrepaymentCalculationGoal } from '@app/services/types/tax-data.types';

describe('TaxStorageService', () => {
  let service: TaxStorageService;
  let loggingService: jasmine.SpyObj<LoggingService>;
  let localStorageSpy: jasmine.SpyObj<Storage>;

  const mockTaxData: TaxData = {
    declarationSections: [],
    inputMethod: 'manual',
    prepayments: { va1: 0, va2: 0, va3: 0, va4: 0 },
    committedPrepayments: { va1: 0, va2: 0, va3: 0, va4: 0 },
    prepaymentStrategy: 'spread',
    prepaymentCalculationGoal: PrepaymentCalculationGoal.GeenVermeerdering,
    prepaymentConcentration: 'spread',
    useSuggestedPrepayments: false,
    canUseReducedRate: false,
    isSmallCompanyFirstThreeYears: false,
    lastUpdated: new Date()
  };

  beforeEach(() => {
    loggingService = jasmine.createSpyObj('LoggingService', ['debug', 'error']);
    localStorageSpy = jasmine.createSpyObj('Storage', ['getItem', 'setItem', 'removeItem']);

    Object.defineProperty(window, 'localStorage', {
      value: localStorageSpy,
      writable: true
    });

    TestBed.configureTestingModule({
      providers: [
        TaxStorageService,
        { provide: LoggingService, useValue: loggingService }
      ]
    });

    service = TestBed.inject(TaxStorageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('loadData', () => {
    it('should load data from localStorage', () => {
      const storedData = { ...mockTaxData, lastUpdated: new Date().toISOString() };
      localStorageSpy.getItem.and.returnValue(JSON.stringify(storedData));

      const result = service.loadData();

      expect(result).toBeTruthy();
      expect(result?.inputMethod).toBe('manual');
      expect(loggingService.debug).toHaveBeenCalledWith('Successfully loaded tax data from storage');
    });

    it('should return null if no data in localStorage', () => {
      localStorageSpy.getItem.and.returnValue(null);

      const result = service.loadData();

      expect(result).toBeNull();
    });

    it('should throw TaxError on invalid data', () => {
      localStorageSpy.getItem.and.returnValue('invalid json');

      expect(() => service.loadData()).toThrow(jasmine.any(TaxError));
      expect(loggingService.error).toHaveBeenCalled();
    });
  });

  describe('saveData', () => {
    it('should save data to localStorage', () => {
      service.saveData(mockTaxData);

      expect(localStorageSpy.setItem).toHaveBeenCalled();
      expect(loggingService.debug).toHaveBeenCalledWith('Successfully saved tax data to storage');
    });

    it('should throw TaxError on save failure', () => {
      localStorageSpy.setItem.and.throwError('Storage error');

      expect(() => service.saveData(mockTaxData)).toThrow(jasmine.any(TaxError));
      expect(loggingService.error).toHaveBeenCalled();
    });
  });

  describe('clearData', () => {
    it('should clear data from localStorage', () => {
      service.clearData();

      expect(localStorageSpy.removeItem).toHaveBeenCalledWith('sofisk_tax_data');
      expect(localStorageSpy.removeItem).toHaveBeenCalledWith('sofisk_current_step');
      expect(loggingService.debug).toHaveBeenCalledWith('Successfully cleared tax data from storage');
    });

    it('should throw TaxError on clear failure', () => {
      localStorageSpy.removeItem.and.throwError('Storage error');

      expect(() => service.clearData()).toThrow(jasmine.any(TaxError));
      expect(loggingService.error).toHaveBeenCalled();
    });
  });
});