import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { VereenvoudigdeAangifteComponent } from './vereenvoudigde-aangifte.component';
import { VoorschottenOptimaliserenComponent } from './voorschotten-optimaliseren.component';
import { CommitVoorafbetalingenComponent } from './commit-voorafbetalingen.component';
import { HeaderComponent } from '../header/header';
import { STEP_CONFIG } from '../services/core-engine/parameters';
import { MainCalculationEngineService } from '../services/core-engine/main-calculation-engine.service';
import { TaxData, PeriodData, InvoermethodeData } from '../services/types/tax-data.types';
import { PrepaymentCalculationGoal } from '../services/types/tax-data.types';

@Component({
  selector: 'app-tax-simulator',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, VereenvoudigdeAangifteComponent, VoorschottenOptimaliserenComponent, CommitVoorafbetalingenComponent],
  templateUrl: './Invoermethode.html'
})
export class TaxSimulatorComponent implements OnInit, AfterViewInit {
  currentStep: number = STEP_CONFIG.STEPS.SELECT_INVOERMETHODE;

  // Step 1 validation properties
  periodConfirmed: boolean = false;
  taxYearConfirmed: boolean = false;
  selectedInvoermethode: 'handmatig' | 'vorig_jaar' | null = null;
  
  // Period data (pre-filled from previous software)
  periodStart: Date = new Date(2024, 0, 1); // January 1, 2024
  periodEnd: Date = new Date(2024, 11, 31); // December 31, 2024
  calculatedBookYear: string = '2024';
  calculatedTaxYear: string = '2025';

  @ViewChild(VoorschottenOptimaliserenComponent)
  voorschottenComponent: VoorschottenOptimaliserenComponent | undefined;

  private readonly STEP_STORAGE_KEY = 'sofisk_current_step';

  constructor(private taxDataService: MainCalculationEngineService) {}

  ngOnInit(): void {
    this.loadStep();
    this.loadPeriodData();
    this.calculateTaxYear();
  }

  ngAfterViewInit(): void {
    // No-op, but needed for ViewChild
  }

  private loadStep(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedStep = localStorage.getItem(this.STEP_STORAGE_KEY);
      if (storedStep) {
        this.currentStep = JSON.parse(storedStep);
      }
    }
  }

  private saveStep(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(this.STEP_STORAGE_KEY, JSON.stringify(this.currentStep));
    }
  }

  private loadPeriodData(): void {
    // Load period data from stored data or use defaults
    const data = this.taxDataService.getData();
    if (data?.periodData) {
      this.periodStart = data.periodData.startDate;
      this.periodEnd = data.periodData.endDate;
      this.calculatedBookYear = data.periodData.bookYear;
      this.calculatedTaxYear = data.periodData.taxYear;
      this.periodConfirmed = data.periodData.isConfirmed;
    }
    
    // Load invoermethode data
    if (data?.invoermethodeData) {
      this.selectedInvoermethode = data.invoermethodeData.selectedMethod;
      this.taxYearConfirmed = data.invoermethodeData.isConfirmed;
    }
  }

  public calculateTaxYear(): void {
    this.calculatedTaxYear = this.taxDataService.calculateTaxYear(this.periodEnd);
    this.calculatedBookYear = this.periodEnd.getFullYear().toString();
  }

  onPeriodChange(): void {
    this.calculateTaxYear();
    this.periodConfirmed = false;
    this.taxYearConfirmed = false;
    this.savePeriodData();
  }

  onPeriodConfirmationChange(): void {
    this.savePeriodData();
  }

  onTaxYearConfirmationChange(): void {
    this.saveTaxYearData();
  }

  onInvoermethodeSelect(method: 'handmatig' | 'vorig_jaar'): void {
    this.selectedInvoermethode = method;
    this.saveInvoermethodeData();
  }

  private savePeriodData(): void {
    const periodData: PeriodData = {
      startDate: this.periodStart,
      endDate: this.periodEnd,
      bookYear: this.calculatedBookYear,
      taxYear: this.calculatedTaxYear,
      isConfirmed: this.periodConfirmed
    };
    this.taxDataService.savePeriodData(periodData);
  }

  private saveTaxYearData(): void {
    // Update period data with tax year confirmation
    const periodData: PeriodData = {
      startDate: this.periodStart,
      endDate: this.periodEnd,
      bookYear: this.calculatedBookYear,
      taxYear: this.calculatedTaxYear,
      isConfirmed: this.periodConfirmed
    };
    this.taxDataService.savePeriodData(periodData);
  }

  private saveInvoermethodeData(): void {
    if (this.selectedInvoermethode) {
      const invoermethodeData: InvoermethodeData = {
        selectedMethod: this.selectedInvoermethode,
        isConfirmed: this.taxYearConfirmed
      };
      this.taxDataService.saveInvoermethodeData(invoermethodeData);
    }
  }

  canProceedToStep2(): boolean {
    return this.periodConfirmed && 
           this.taxYearConfirmed && 
           this.selectedInvoermethode !== null;
  }

  getValidationMessage(): string {
    if (!this.periodConfirmed) return 'Bevestig eerst de periode';
    if (!this.taxYearConfirmed) return 'Bevestig eerst het aanslagjaar';
    if (!this.selectedInvoermethode) return 'Selecteer een invoermethode';
    return '';
  }

  goToStep(step: number): void {
    // Validate step progression - prevent skipping steps
    if (!this.canNavigateToStep(step)) {
      console.warn('Cannot navigate to step', step, 'from current step', this.currentStep);
      return;
    }

    // Additional validation for step progression
    if (step > this.currentStep) {
      // Forward navigation - check prerequisites
      switch (step) {
        case 2:
          if (!this.canProceedToStep2()) {
            console.warn('Cannot proceed to step 2:', this.getValidationMessage());
            return;
          }
          break;
        case 3:
          // Allow navigation to step 3 if step 1 is completed
          if (!this.canProceedToStep2()) {
            console.warn('Cannot proceed to step 3: Step 1 not completed');
            return;
          }
          break;
        case 4:
          // Allow navigation to step 4 if step 1 is completed
          if (!this.canProceedToStep2()) {
            console.warn('Cannot proceed to step 4: Step 1 not completed');
            return;
          }
          break;
      }
    }

    if (step >= STEP_CONFIG.MIN_STEP && step <= STEP_CONFIG.MAX_STEP) {
      // Check if we're navigating away from step 3 and there are unsaved changes
      if (this.currentStep === STEP_CONFIG.STEPS.VOORSCHOTTEN_OPTIMALISEREN && 
          step !== STEP_CONFIG.STEPS.VOORSCHOTTEN_OPTIMALISEREN && 
          this.voorschottenComponent) {
        
        this.voorschottenComponent.confirmAndCommitIfNeeded((commit: boolean) => {
          if (commit) {
            // Data was committed, proceed with navigation
            this.proceedToStep(step);
          } else {
            // User cancelled, revert changes and proceed
            this.voorschottenComponent?.revertSimulationToCommitted();
            this.proceedToStep(step);
          }
        });
        return;
      }
      
      this.proceedToStep(step);
    }
  }

  private proceedToStep(step: number): void {
    this.currentStep = step;
    this.saveStep();
    // Force recalculation after step change
    this.taxDataService.forceRecalculation();
  }

  // New method to check if navigation to a step is allowed
  canNavigateToStep(targetStep: number): boolean {
    // Can always navigate to current step
    if (targetStep === this.currentStep) return true;
    
    // Can navigate to previous steps (for review/editing)
    if (targetStep < this.currentStep) return true;
    
    // For forward navigation, check prerequisites
    switch (targetStep) {
      case 2:
        // Can go to step 2 if step 1 is completed
        return this.canProceedToStep2();
      case 3:
        // Can go to step 3 if step 1 is completed (step 2 data is optional)
        return this.canProceedToStep2();
      case 4:
        // Can go to step 4 if step 1 is completed (step 2 and 3 data are optional)
        return this.canProceedToStep2();
      default:
        return false;
    }
  }

  // Check if step 2 has been completed (has declaration sections with data)
  hasCompletedStep2(): boolean {
    const data = this.taxDataService.getData();
    // Check if we have meaningful data in step 2 (declaration sections with values)
    if (!data || !data.declarationSections || data.declarationSections.length === 0) {
      return false;
    }
    
    // Check if at least one section has fields with values
    return data.declarationSections.some(section => 
      section.fields && section.fields.some(field => field.value > 0)
    );
  }

  // Check if step 3 has been completed (has prepayment data)
  hasCompletedStep3(): boolean {
    const data = this.taxDataService.getData();
    if (!data || !data.prepayments) {
      return false;
    }
    
    // Check if we have meaningful prepayment data
    const totalPrepayments = data.prepayments.va1 + data.prepayments.va2 + 
                            data.prepayments.va3 + data.prepayments.va4;
    return totalPrepayments > 0;
  }
} 