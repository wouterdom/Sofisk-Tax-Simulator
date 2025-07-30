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

    // Calculate the main subtotal (Code 1460): Belastbare winst gewoon tarief
    const section1Total = this.declarationSections[0].total?.value || 0;
    const section2Total = this.declarationSections[1].total?.value || 0;
    const subtotalSection = this.declarationSections[2];
    
    if (subtotalSection.subtotal) {
      subtotalSection.subtotal.value = Math.max(0, section1Total - section2Total);
    }

    // Save updated data to service
    this.taxDataService.updateDeclarationSections(this.declarationSections);
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
