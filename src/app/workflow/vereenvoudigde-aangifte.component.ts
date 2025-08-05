import { Component, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DeclarationSection } from '../services/types/tax-data.types';
import { CalculationDetailsComponent } from '../components/calculation-details.component';
import { BaseTaxComponent } from '../components/base-tax.component';
import { PrepaymentComponent } from '../components/prepayment.component';
import { UIClassDirective } from '../components/ui-classes.directive';
import { FormattedNumberInputComponent } from '../components/formatted-number-input.component';

/**
 * Component for handling the simplified tax declaration form.
 * 
 * This component focuses purely on UI concerns and delegates all business logic
 * to the MainCalculationEngineService to eliminate code duplication and ensure
 * consistency across the application.
 * 
 * Key responsibilities:
 * - Display and manage the tax declaration form UI
 * - Handle user input and field value changes
 * - Manage checkbox states for tax rate eligibility
 * - Handle prepayment data changes
 * - Delegate all calculations to the service layer
 */
@Component({
  selector: 'app-vereenvoudigde-aangifte',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    FormsModule, CalculationDetailsComponent,
    PrepaymentComponent, UIClassDirective, FormattedNumberInputComponent
  ],
  templateUrl: './vereenvoudigde-aangifte.component.html',

})
export class VereenvoudigdeAangifteComponent extends BaseTaxComponent {
  declarationSections: DeclarationSection[] = [];

  @Output() step3Requested = new EventEmitter<void>();

  constructor(private cdr: ChangeDetectorRef) {
    super();
  }
  
  // Checkbox states for tax rate eligibility
  canUseReducedRate = false; // Code 1701
  isSmallCompanyFirstThreeYears = false; // Code 1801
  
  // Voorafbetalingen data
  voorafbetalingen = {
    va1: 0,
    va2: 0,
    va3: 0,
    va4: 0
  };
  voorafbetalingenOpen = true;
  
  // Book year information
  bookYearInfo: any = null;
  latestPrepaymentDates: any = null;
  

  protected override handleDataChange(data: any): void {
    if (data) {
      this.declarationSections = data.declarationSections;
      this.canUseReducedRate = data.canUseReducedRate;
      this.isSmallCompanyFirstThreeYears = data.isSmallCompanyFirstThreeYears;
      // Always update the UI fields to the latest committed prepayments
      this.voorafbetalingen = this.taxDataService.getCommittedPrepayments();
      
      // Get book year information
      this.bookYearInfo = this.taxDataService.getBookYearInfo();
      this.latestPrepaymentDates = this.taxDataService.getLatestPrepaymentDates();
      
      // Debug logging for short book year issue
      console.log('Book year info:', this.bookYearInfo);
      console.log('Latest prepayment dates:', this.latestPrepaymentDates);
      console.log('Period data:', this.taxDataService.getData()?.periodData);
    }
  }

  /**
   * Handles field value changes from user input.
   * Updates the field value and triggers recalculation through the service.
   * 
   * @param field - The declaration field that was changed
   * @param value - The new value entered by the user
   */
  onFieldValueChange(field: any, value: number): void {
    console.log('Field value changed:', field.label, 'to:', value);
    field.value = value;
    this.calculate();
    // Don't force change detection during typing to avoid interference
  }

  calculate(): void {
    console.log('Calculating with sections:', this.declarationSections);
    
    // Delegate all calculations to the main calculation engine service
    // This eliminates code duplication and ensures consistency
    this.taxDataService.updateDeclarationSections(this.declarationSections);
  }

  /**
   * Handles tax rate eligibility checkbox changes.
   * Updates the service with new eligibility settings and triggers recalculation.
   */
  onTaxRateCheckboxChange(): void {
    // Trigger recalculation when checkbox state changes
    this.taxDataService.updateTaxRateEligibility(this.canUseReducedRate, this.isSmallCompanyFirstThreeYears);
  }

  /**
   * Handles prepayment data changes from the VoorafbetalingenComponent.
   * Updates the service with new prepayment values.
   * 
   * @param newData - The updated prepayment data
   */
  onVoorafbetalingenDataChange(newData: typeof this.voorafbetalingen) {
    this.voorafbetalingen = newData;
    this.taxDataService.updatePrepayments(this.voorafbetalingen);
  }

  /**
   * Determines the appropriate title for the tax card based on calculation results.
   * 
   * @returns The title string for the tax card
   */
  getTaxCardTitle(): string {
    if (!this.calculationResults) {
      return 'Te betalen belastingen';
    }
    
    const finalTaxDue = this.calculationResults.finalTaxDue;
    
    if (finalTaxDue > 0) {
      return 'Te betalen belastingen';
    } else if (finalTaxDue < 0) {
      return 'Terug te vorderen belastingen';
    } else {
      return 'Te betalen belastingen'; // When it's 0, keep as taxes to be paid
    }
  }

  // Book year helper methods
  getBookYearTypeDescription(): string {
    return this.taxDataService.getBookYearTypeDescription();
  }

  getShortBookYearPrepaymentDescription(): string {
    return this.taxDataService.getShortBookYearPrepaymentDescription();
  }

  isShortBookYear(): boolean {
    return this.taxDataService.isShortBookYear();
  }

  isLongBookYear(): boolean {
    return this.taxDataService.isLongBookYear();
  }

  isNormalBookYear(): boolean {
    return this.taxDataService.isNormalBookYear();
  }

  /**
   * Emits an event to request navigation to step 3
   */
  goToStep3(): void {
    this.step3Requested.emit();
  }
}
