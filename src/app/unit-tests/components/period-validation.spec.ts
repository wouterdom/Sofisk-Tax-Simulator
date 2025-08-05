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
    it('should return false when period is not confirmed', () => {
      component.periodConfirmed = false;
      component.taxYearConfirmed = true;
      component.selectedInvoermethode = 'handmatig';

      const result = component.canProceedToStep2();
      expect(result).toBe(false);
    });

    it('should return false when tax year is not confirmed', () => {
      component.periodConfirmed = true;
      component.taxYearConfirmed = false;
      component.selectedInvoermethode = 'handmatig';

      const result = component.canProceedToStep2();
      expect(result).toBe(false);
    });

    it('should return false when invoermethode is not selected', () => {
      component.periodConfirmed = true;
      component.taxYearConfirmed = true;
      component.selectedInvoermethode = null;

      const result = component.canProceedToStep2();
      expect(result).toBe(false);
    });

    it('should return true when all validations pass', () => {
      component.periodConfirmed = true;
      component.taxYearConfirmed = true;
      component.selectedInvoermethode = 'handmatig';

      const result = component.canProceedToStep2();
      expect(result).toBe(true);
    });

    it('should return true when all validations pass with vorig_jaar', () => {
      component.periodConfirmed = true;
      component.taxYearConfirmed = true;
      component.selectedInvoermethode = 'vorig_jaar';

      const result = component.canProceedToStep2();
      expect(result).toBe(true);
    });
  });

  describe('getValidationMessage', () => {
    it('should return period confirmation message when period not confirmed', () => {
      component.periodConfirmed = false;
      component.taxYearConfirmed = true;
      component.selectedInvoermethode = 'handmatig';

      const result = component.getValidationMessage();
      expect(result).toBe('Bevestig eerst de periode');
    });

    it('should return tax year confirmation message when tax year not confirmed', () => {
      component.periodConfirmed = true;
      component.taxYearConfirmed = false;
      component.selectedInvoermethode = 'handmatig';

      const result = component.getValidationMessage();
      expect(result).toBe('Bevestig eerst het aanslagjaar');
    });

    it('should return invoermethode selection message when not selected', () => {
      component.periodConfirmed = true;
      component.taxYearConfirmed = true;
      component.selectedInvoermethode = null;

      const result = component.getValidationMessage();
      expect(result).toBe('Selecteer een invoermethode');
    });

    it('should return empty string when all validations pass', () => {
      component.periodConfirmed = true;
      component.taxYearConfirmed = true;
      component.selectedInvoermethode = 'handmatig';

      const result = component.getValidationMessage();
      expect(result).toBe('');
    });
  });

  describe('tax year calculation', () => {
    it('should calculate correct tax year for December 31st period end', () => {
      component.periodEnd = new Date(2024, 11, 31);
      component.calculateTaxYear();
      
      expect(component.calculatedTaxYear).toBe('2025');
      expect(component.calculatedBookYear).toBe('2024');
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
  });

  describe('period change handling', () => {
    it('should reset confirmations when period changes', () => {
      component.periodConfirmed = true;
      component.taxYearConfirmed = true;
      component.selectedInvoermethode = 'handmatig';

      component.onPeriodChange();

      expect(component.periodConfirmed).toBe(false);
      expect(component.taxYearConfirmed).toBe(false);
    });

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