import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { NgClass, NgSwitch, NgSwitchCase, NgIf, NgFor, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaxDataService, DeclarationSection, TaxCalculationResults } from '../services/tax-data.service';
import { FormattedNumberInputComponent } from '../components/formatted-number-input.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-vereenvoudigde-aangifte',
  standalone: true,
  imports: [
    NgClass, NgSwitch, NgSwitchCase, NgIf, NgFor, CurrencyPipe, DatePipe, DecimalPipe,
    FormsModule, FormattedNumberInputComponent
  ],
  templateUrl: './vereenvoudigde-aangifte.component.html',
  styleUrl: './vereenvoudigde-aangifte.component.css'
})
export class VereenvoudigdeAangifteComponent implements OnInit, OnDestroy {
  @Input() inputMethod: 'manual' | 'previous' | 'upload' = 'manual';
  @Output() inputMethodChange = new EventEmitter<'manual' | 'previous' | 'upload'>();

  declarationSections: DeclarationSection[] = [];
  calculationResults: TaxCalculationResults | null = null;
  isLoading = false;
  
  // Checkbox states for tax rate eligibility
  canUseReducedRate = true; // Code 1701
  isSmallCompanyFirstThreeYears = true; // Code 1801
  
  // Data management properties
  showImportDialog = false;
  importDataText = '';
  importMessage = '';
  importSuccess = false;
  lastSaved: Date = new Date();

  private dataSubscription?: Subscription;
  private resultsSubscription?: Subscription;
  private loadingSubscription?: Subscription;

  constructor(private taxDataService: TaxDataService) {}

  ngOnInit(): void {
    // Subscribe to data changes
    this.dataSubscription = this.taxDataService.data$.subscribe(data => {
      if (data) {
        this.declarationSections = data.declarationSections;
        this.inputMethod = data.inputMethod;
        this.canUseReducedRate = data.canUseReducedRate;
        this.isSmallCompanyFirstThreeYears = data.isSmallCompanyFirstThreeYears;
        this.lastSaved = data.lastUpdated;
      }
    });

    // Subscribe to calculation results
    this.resultsSubscription = this.taxDataService.results$.subscribe(results => {
      this.calculationResults = results;
    });

    // Subscribe to loading state
    this.loadingSubscription = this.taxDataService.isLoading$.subscribe(isLoading => {
      this.isLoading = isLoading;
    });
  }

  ngOnDestroy(): void {
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }
    if (this.resultsSubscription) {
      this.resultsSubscription.unsubscribe();
    }
    if (this.loadingSubscription) {
      this.loadingSubscription.unsubscribe();
    }
  }

  onFieldValueChange(field: any, value: number): void {
    field.value = value;
    this.calculate();
  }

  calculate(): void {
    // Calculate totals for each section
    this.declarationSections.forEach((section, index) => {
      if (section.total) {
        section.total.value = section.fields.reduce((acc, field) => acc + (field.value || 0), 0);
      }
    });

    // Calculate code 1430 (Resterend resultaat): Section 1 total - code 1420
    const section1Total = this.declarationSections[0].total?.value || 0;
    const code1420 = this.declarationSections[1].fields[0]?.value || 0;
    const subtotalSection1430 = this.declarationSections[2]; // Section 3
    
    if (subtotalSection1430.subtotal) {
      subtotalSection1430.subtotal.value = Math.max(0, section1Total - code1420);
    }

    // Calculate code 1440 (Grondslag voor de berekening korf): Code 1430 - Section 4 total
    const section4Total = this.declarationSections[3].total?.value || 0;
    const subtotalSection1440 = this.declarationSections[4]; // Section 5
    
    if (subtotalSection1440.subtotal) {
      subtotalSection1440.subtotal.value = Math.max(0, (subtotalSection1430.subtotal?.value || 0) - section4Total);
    }

    // Calculate code 1460 (Belastbare winst gewoon tarief): Code 1440 - Section 6 total (with korfbeperking)
    const section6Total = this.declarationSections[5].total?.value || 0;
    const subtotalSection1460 = this.declarationSections[6]; // Section 7
    
    if (subtotalSection1460.subtotal) {
      // Apply korfbeperking to section 6 deductions
      const korfbeperking = this.calculateKorfbeperking(subtotalSection1440.subtotal?.value || 0);
      const limitedSection6Total = Math.min(section6Total, korfbeperking);
      
      // Calculate code 1460: actual result + code 1420
      const code1460BeforeConstraint = Math.max(0, (subtotalSection1440.subtotal?.value || 0) - limitedSection6Total);
      subtotalSection1460.subtotal.value = code1460BeforeConstraint + code1420;
    }

    // Save updated data to service
    this.taxDataService.updateDeclarationSections(this.declarationSections);
  }

  private calculateKorfbeperking(code1440: number): number {
    // Korfbeperking formula: MIN(code1440, 1000000) + MAX(0, code1440 - 1000000) * 0.7
    return Math.min(code1440, 1000000) + Math.max(0, code1440 - 1000000) * 0.7;
  }

  onTaxRateCheckboxChange(): void {
    // Trigger recalculation when checkbox state changes
    this.taxDataService.updateTaxRateEligibility(this.canUseReducedRate, this.isSmallCompanyFirstThreeYears);
  }

  selectMethod(method: 'manual' | 'previous' | 'upload'): void {
    this.inputMethod = method;
    this.inputMethodChange.emit(method);
    this.taxDataService.updateInputMethod(method);
  }

  // Data management methods
  resetToDefaults(): void {
    this.taxDataService.resetToDefaults();
  }

  exportData(): void {
    const data = this.taxDataService.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tax-data-' + new Date().toISOString().split('T')[0] + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  clearData(): void {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      this.taxDataService.clearData();
    }
  }

  importData(): void {
    if (!this.importDataText.trim()) {
      this.importMessage = 'Please enter data to import.';
      this.importSuccess = false;
      return;
    }

    const success = this.taxDataService.importData(this.importDataText);
    if (success) {
      this.importMessage = 'Data imported successfully!';
      this.importSuccess = true;
      this.showImportDialog = false;
      this.importDataText = '';
    } else {
      this.importMessage = 'Failed to import data. Please check the JSON format.';
      this.importSuccess = false;
    }
  }
}
