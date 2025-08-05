import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { TaxSimulatorComponent } from '../../workflow/Invoermethode';
import { MainCalculationEngineService } from '../../services/core-engine/main-calculation-engine.service';
import { PeriodData, InvoermethodeData } from '../../services/types/tax-data.types';

describe('Period Validation', () => {
  let component: TaxSimulatorComponent;
  let fixture: ComponentFixture<TaxSimulatorComponent>;
  let service: MainCalculationEngineService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule, TaxSimulatorComponent],
      providers: [MainCalculationEngineService]
    }).compileComponents();

    fixture = TestBed.createComponent(TaxSimulatorComponent);
    component = fixture.componentInstance;
    service = TestBed.inject(MainCalculationEngineService);
    fixture.detectChanges();
  });

  describe('canProceedToStep2', () => {
    it('should return false when start date is not filled in', () => {
      component.periodStart = null;
      component.periodEnd = new Date(2023, 11, 31);
      component.selectedInvoermethode = 'handmatig';

      const result = component.canProceedToStep2();
      expect(result).toBe(false);
    });

    it('should return false when end date is not filled in', () => {
      component.periodStart = new Date(2023, 0, 1);
      component.periodEnd = null;
      component.selectedInvoermethode = 'handmatig';

      const result = component.canProceedToStep2();
      expect(result).toBe(false);
    });

    it('should return false when invoermethode is not selected', () => {
      component.periodStart = new Date(2023, 0, 1);
      component.periodEnd = new Date(2023, 11, 31);
      component.selectedInvoermethode = null;

      const result = component.canProceedToStep2();
      expect(result).toBe(false);
    });

    it('should return true when all validations pass', () => {
      component.periodStart = new Date(2023, 0, 1);
      component.periodEnd = new Date(2023, 11, 31);
      component.selectedInvoermethode = 'handmatig';

      const result = component.canProceedToStep2();
      expect(result).toBe(true);
    });

    it('should return true when all validations pass with vorig_jaar', () => {
      component.periodStart = new Date(2023, 0, 1);
      component.periodEnd = new Date(2023, 11, 31);
      component.selectedInvoermethode = 'vorig_jaar';

      const result = component.canProceedToStep2();
      expect(result).toBe(true);
    });
  });

  describe('getValidationMessage', () => {
    it('should return date validation message when dates not filled in', () => {
      component.periodStart = null;
      component.periodEnd = null;
      component.selectedInvoermethode = 'handmatig';

      const result = component.getValidationMessage();
      expect(result).toBe('Vul eerst de begin- en einddatum in');
    });

    it('should return invoermethode selection message when not selected', () => {
      component.periodStart = new Date(2023, 0, 1);
      component.periodEnd = new Date(2023, 11, 31);
      component.selectedInvoermethode = null;

      const result = component.getValidationMessage();
      expect(result).toBe('Selecteer een invoermethode');
    });

    it('should return empty string when all validations pass', () => {
      component.periodStart = new Date(2023, 0, 1);
      component.periodEnd = new Date(2023, 11, 31);
      component.selectedInvoermethode = 'handmatig';

      const result = component.getValidationMessage();
      expect(result).toBe('');
    });
  });

  describe('tax year calculation', () => {
    it('should calculate correct tax year for December 31st period end', () => {
      component.periodEnd = new Date(2023, 11, 31);
      component.calculateTaxYear();
      
      expect(component.calculatedTaxYear).toBe('2024');
      expect(component.calculatedBookYear).toBe('2023');
    });

    it('should calculate correct tax year for December 30th period end', () => {
      component.periodEnd = new Date(2024, 11, 30);
      component.calculateTaxYear();
      
      expect(component.calculatedTaxYear).toBe('2024');
      expect(component.calculatedBookYear).toBe('2024');
    });

    it('should calculate correct tax year for January 15th period end', () => {
      component.periodEnd = new Date(2024, 0, 15);
      component.calculateTaxYear();
      
      expect(component.calculatedTaxYear).toBe('2024');
      expect(component.calculatedBookYear).toBe('2024');
    });

    it('should calculate correct boekjaar for multi-year period', () => {
      component.periodStart = new Date(2024, 6, 1); // July 1, 2024
      component.periodEnd = new Date(2025, 5, 30); // June 30, 2025
      component.calculateTaxYear();
      
      expect(component.calculatedTaxYear).toBe('2025');
      expect(component.calculatedBookYear).toBe('2024/2025');
    });

    it('should calculate correct boekjaar for fiscal year period', () => {
      component.periodStart = new Date(2024, 3, 1); // April 1, 2024
      component.periodEnd = new Date(2025, 2, 31); // March 31, 2025
      component.calculateTaxYear();
      
      expect(component.calculatedTaxYear).toBe('2025');
      expect(component.calculatedBookYear).toBe('2024/2025');
    });

    it('should calculate correct boekjaar for same year period', () => {
      component.periodStart = new Date(2024, 0, 1); // January 1, 2024
      component.periodEnd = new Date(2024, 11, 31); // December 31, 2024
      component.calculateTaxYear();
      
      expect(component.calculatedTaxYear).toBe('2025');
      expect(component.calculatedBookYear).toBe('2024');
    });
  });

  describe('period change handling', () => {
    it('should recalculate tax year when period changes', () => {
      const originalTaxYear = component.calculatedTaxYear;
      component.periodEnd = new Date(2023, 11, 31);

      component.onPeriodChange();

      expect(component.calculatedTaxYear).not.toBe(originalTaxYear);
      expect(component.calculatedTaxYear).toBe('2024');
    });
  });

  describe('invoermethode selection', () => {
    it('should set selected invoermethode when handmatig is selected', () => {
      component.onInvoermethodeSelect('handmatig');
      expect(component.selectedInvoermethode).toBe('handmatig');
    });

    it('should set selected invoermethode when vorig_jaar is selected', () => {
      component.onInvoermethodeSelect('vorig_jaar');
      expect(component.selectedInvoermethode).toBe('vorig_jaar');
    });
  });
}); 