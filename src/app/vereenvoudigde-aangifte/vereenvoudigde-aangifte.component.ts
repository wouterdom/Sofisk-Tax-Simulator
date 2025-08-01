import { Component, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DeclarationSection } from '../services/main-calculation-engine.service';
import { CalculationDetailsComponent } from '../components/calculation-details.component';
import { BaseTaxComponent } from '../components/base-tax.component';
import { VoorafbetalingenComponent } from '../components/voorafbetalingen.component';
import { UIClassDirective } from '../components/ui-classes.directive';
import { FormattedNumberInputComponent } from '../components/formatted-number-input.component';

@Component({
  selector: 'app-vereenvoudigde-aangifte',
  standalone: true,
  imports: [
    CurrencyPipe,
    FormsModule, CalculationDetailsComponent,
    VoorafbetalingenComponent, UIClassDirective, FormattedNumberInputComponent
  ],
  templateUrl: './vereenvoudigde-aangifte.component.html',
  styleUrl: './vereenvoudigde-aangifte.component.css'
})
export class VereenvoudigdeAangifteComponent extends BaseTaxComponent {
  declarationSections: DeclarationSection[] = [];

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
  

  protected override handleDataChange(data: any): void {
    if (data) {
      this.declarationSections = data.declarationSections;
      this.canUseReducedRate = data.canUseReducedRate;
      this.isSmallCompanyFirstThreeYears = data.isSmallCompanyFirstThreeYears;
      // Always update the UI fields to the latest committed prepayments
      this.voorafbetalingen = this.taxDataService.getCommittedPrepayments();
    }
  }

  onFieldValueChange(field: any, value: number): void {
    console.log('Field value changed:', field.label, 'to:', value);
    field.value = value;
    this.calculate();
    // Don't force change detection during typing to avoid interference
  }

  calculate(): void {
    console.log('Calculating with sections:', this.declarationSections);
    // Calculate totals for each section
    this.declarationSections.forEach((section, index) => {
      if (section.total) {
        section.total.value = section.fields.reduce((acc, field) => acc + (field.value || 0), 0);
      }
    });

    // Calculate resterend resultaat (Code 1430): ResultaatVanHetBelastbareTijdperkTotal - BestanddelenVhResultaatAftrekbeperking
    const resultaatVanHetBelastbareTijdperkTotal = this.declarationSections[0].total?.value || 0;
    const bestanddelenVhResultaatAftrekbeperking = this.declarationSections[1].fields[0]?.value || 0;
    const subtotalSection1430 = this.declarationSections[2]; // Section 3
    
    if (subtotalSection1430.subtotal) {
      subtotalSection1430.subtotal.value = Math.max(0, resultaatVanHetBelastbareTijdperkTotal - bestanddelenVhResultaatAftrekbeperking);
    }

    // Calculate grondslag voor de berekening korf (Code 1440): ResterendResultaat - AftrekkenVanDeResterendeWinstTotal
    const aftrekkenVanDeResterendeWinstTotal = this.declarationSections[3].total?.value || 0;
    const subtotalSection1440 = this.declarationSections[4]; // Section 5
    
    if (subtotalSection1440.subtotal) {
      subtotalSection1440.subtotal.value = Math.max(0, (subtotalSection1430.subtotal?.value || 0) - aftrekkenVanDeResterendeWinstTotal);
    }

    // Calculate belastbare winst gewoon tarief (Code 1460): GrondslagVoorBerekeningKorf - LimitedAftrekkenResterendeWinstKorfbeperkingTotal
    const aftrekkenResterendeWinstKorfbeperkingTotal = this.declarationSections[5].total?.value || 0;
    const subtotalSection1460 = this.declarationSections[6]; // Section 7
    
    if (subtotalSection1460.subtotal) {
      // Apply korfbeperking to section 6 deductions
      const korfbeperking = this.calculateKorfbeperking(subtotalSection1440.subtotal?.value || 0);
      const limitedAftrekkenResterendeWinstKorfbeperkingTotal = Math.min(aftrekkenResterendeWinstKorfbeperkingTotal, korfbeperking);
      
      // Calculate belastbare winst gewoon tarief: actual result + bestanddelenVhResultaatAftrekbeperking
      const belastbareWinstGewoonTariefBeforeConstraint = Math.max(0, (subtotalSection1440.subtotal?.value || 0) - limitedAftrekkenResterendeWinstKorfbeperkingTotal);
      subtotalSection1460.subtotal.value = belastbareWinstGewoonTariefBeforeConstraint + bestanddelenVhResultaatAftrekbeperking;
    }

    // Save updated data to service immediately
    this.taxDataService.updateDeclarationSections(this.declarationSections);
  }

  private calculateKorfbeperking(grondslagVoorBerekeningKorf: number): number {
    // Korfbeperking formula: MIN(grondslagVoorBerekeningKorf, 1000000) + MAX(0, grondslagVoorBerekeningKorf - 1000000) * 0.7
    return Math.min(grondslagVoorBerekeningKorf, 1000000) + Math.max(0, grondslagVoorBerekeningKorf - 1000000) * 0.7;
  }

  onTaxRateCheckboxChange(): void {
    // Trigger recalculation when checkbox state changes
    this.taxDataService.updateTaxRateEligibility(this.canUseReducedRate, this.isSmallCompanyFirstThreeYears);
  }

  onVoorafbetalingenDataChange(newData: typeof this.voorafbetalingen) {
    this.voorafbetalingen = newData;
    this.taxDataService.updatePrepayments(this.voorafbetalingen);
  }

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
}
