import { Injectable } from '@angular/core';
import { TaxData, Prepayments } from '@app/services/tax-data.types';
import { LoggingService } from '@app/services/logging.service';
import { TaxError, TaxErrorCodes } from '@app/services/tax-error';

@Injectable({
  providedIn: 'root'
})
export class TaxStorageService {
  private readonly STORAGE_KEY = 'sofisk_tax_data';

  constructor(private logger: LoggingService) {}

  loadData(): TaxData | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
          const data = JSON.parse(stored);
          data.lastUpdated = new Date(data.lastUpdated);
          this.ensureDefaultFields(data);
          this.logger.debug('Successfully loaded tax data from storage');
          return data;
        }
      }
      return null;
    } catch (error) {
      this.logger.error('Failed to load tax data from storage', error as Error);
      throw new TaxError(
        'Failed to load tax data from storage',
        TaxErrorCodes.STORAGE.LOAD_FAILED,
        { error }
      );
    }
  }

  saveData(data: TaxData): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        this.logger.debug('Successfully saved tax data to storage');
      }
    } catch (error) {
      this.logger.error('Failed to save tax data to storage', error as Error);
      throw new TaxError(
        'Failed to save tax data to storage',
        TaxErrorCodes.STORAGE.SAVE_FAILED,
        { error }
      );
    }
  }

  clearData(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(this.STORAGE_KEY);
        localStorage.removeItem('sofisk_current_step');
        this.logger.debug('Successfully cleared tax data from storage');
      }
    } catch (error) {
      this.logger.error('Failed to clear tax data from storage', error as Error);
      throw new TaxError(
        'Failed to clear tax data from storage',
        TaxErrorCodes.STORAGE.SAVE_FAILED,
        { error }
      );
    }
  }

  private ensureDefaultFields(data: TaxData): void {
    try {
      if (data.prepaymentCalculationGoal === undefined) {
        data.prepaymentCalculationGoal = 'GeenVermeerdering';
      }
      if (data.useSuggestedPrepayments === undefined) {
        data.useSuggestedPrepayments = false;
      }
      if (data.prepaymentConcentration === undefined) {
        data.prepaymentConcentration = 'spread';
      }
      if (data.committedPrepayments === undefined) {
        data.committedPrepayments = { ...data.prepayments };
      }
    } catch (error) {
      this.logger.error('Failed to ensure default fields', error as Error);
      throw new TaxError(
        'Failed to ensure default fields',
        TaxErrorCodes.STORAGE.INVALID_DATA,
        { error }
      );
    }
  }

  getDefaultData(): TaxData {
    const defaultPrepayments = { va1: 0, va2: 0, va3: 0, va4: 0 };
    return {
      declarationSections: [
        {
          title: 'Resultaat van het belastbare tijdperk',
          isFoldable: true,
          isOpen: true,
          fields: [
            { code: '1080', label: 'Belastbare gereserveerde winst', value: 0 },
            { code: '1240', label: 'Verworpen uitgaven', value: 0 },
            { code: '1320', label: 'Uitgekeerde dividenden', value: 0 },
          ],
          total: { value: 0 }
        },
        // ... rest of the default sections
      ],
      inputMethod: 'manual',
      prepayments: { ...defaultPrepayments },
      committedPrepayments: { ...defaultPrepayments },
      prepaymentStrategy: 'spread',
      prepaymentCalculationGoal: 'GeenVermeerdering',
      prepaymentConcentration: 'spread',
      useSuggestedPrepayments: false,
      canUseReducedRate: false,
      isSmallCompanyFirstThreeYears: false,
      lastUpdated: new Date()
    };
  }
}