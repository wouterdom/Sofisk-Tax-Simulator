import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { VereenvoudigdeAangifteComponent } from './vereenvoudigde-aangifte.component';
import { VoorschottenOptimaliserenComponent } from './voorschotten-optimaliseren.component';
import { CommitVoorafbetalingenComponent } from './commit-voorafbetalingen.component';
import { HeaderComponent } from '../header/header';
import { FileSelectionComponent, FileOption } from '../components/file-selection.component';
import { STEP_CONFIG } from '../services/core-engine/parameters';
import { MainCalculationEngineService } from '../services/core-engine/main-calculation-engine.service';
import { ImportService, ImportedDeclaration } from '../services/utils/import.service';
import { TaxData, PeriodData, InvoermethodeData } from '../services/types/tax-data.types';
import { PrepaymentCalculationGoal } from '../services/types/tax-data.types';

@Component({
  selector: 'app-tax-simulator',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, VereenvoudigdeAangifteComponent, VoorschottenOptimaliserenComponent, CommitVoorafbetalingenComponent, FileSelectionComponent],
  templateUrl: './Invoermethode.html'
})
export class TaxSimulatorComponent implements OnInit, AfterViewInit, OnDestroy {
  currentStep: number = STEP_CONFIG.STEPS.SELECT_INVOERMETHODE;

  // Step 1 validation properties
  selectedInvoermethode: 'handmatig' | 'vorig_jaar' | null = null;
  
  // Period data (empty initially) - can be string for display or Date for storage
  periodStart: Date | string | null = null;
  periodEnd: Date | string | null = null;
  calculatedBookYear: string = '';
  calculatedTaxYear: string = '';
  taxYearWarning: string = '';

  // File selection properties
  showFileSelection = false;
  availableFiles: FileOption[] = [];

  @ViewChild(VoorschottenOptimaliserenComponent)
  voorschottenComponent: VoorschottenOptimaliserenComponent | undefined;

  private readonly STEP_STORAGE_KEY = 'sofisk_current_step';
  private dataSubscription: Subscription | null = null;

  constructor(
    private taxDataService: MainCalculationEngineService,
    private importService: ImportService
  ) {}

  ngOnInit(): void {
    this.loadStep();
    this.loadPeriodData();
    
    // Set up reactive subscription to service data changes
    this.dataSubscription = this.taxDataService.data$.subscribe(data => {
      if (data?.periodData) {
        // Update calculated values when period data changes
        this.calculatedBookYear = data.periodData.bookYear || '';
        this.calculatedTaxYear = data.periodData.taxYear || '';
        
        // Check if tax year has specific parameters
        this.checkTaxYearParameters(data.periodData.taxYear);
      }
    });
    
    // Trigger initial calculation if dates are pre-filled or loaded
    if (this.periodStart && this.periodEnd) {
      this.savePeriodData();
    }
  }

  ngAfterViewInit(): void {
    // No-op, but needed for ViewChild
  }

  ngOnDestroy(): void {
    // Clean up subscription
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }
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
      
      // Check if tax year has specific parameters
      this.checkTaxYearParameters(data.periodData.taxYear);
    }
    
    // Load invoermethode data
    if (data?.invoermethodeData) {
      this.selectedInvoermethode = data.invoermethodeData.selectedMethod;
    }
  }



  onPeriodChange(): void {
    // Trigger reactive update by saving period data
    // This will automatically trigger calculations through the service
    this.savePeriodData();
  }

  onInvoermethodeSelect(method: 'handmatig' | 'vorig_jaar'): void {
    this.selectedInvoermethode = method;
    this.saveInvoermethodeData();
    
    // If vorig jaar is selected, show file selection popup
    if (method === 'vorig_jaar') {
      this.loadAvailableFiles();
      this.showFileSelection = true;
    }
  }

  private checkTaxYearParameters(taxYear: string): void {
    // Check if the tax year has specific parameters defined
    const availableYears = ['2024', '2025', '2026'];
    
    if (taxYear && !availableYears.includes(taxYear)) {
      // Find the closest available year (same logic as getTaxYearParameters)
      const currentYear = parseInt(taxYear);
      const closestYear = availableYears.reduce((prev, curr) => {
        return Math.abs(parseInt(curr) - currentYear) < Math.abs(parseInt(prev) - currentYear) ? curr : prev;
      });
      
      this.taxYearWarning = `Let op: Voor aanslagjaar ${taxYear} zijn geen specifieke parameters beschikbaar. Parameters van ${closestYear} worden gebruikt.`;
    } else {
      this.taxYearWarning = '';
    }
  }

  private savePeriodData(): void {
    // Only save if both dates are filled in
    if (!this.periodStart || !this.periodEnd) {
      return;
    }

    // Convert to Date objects for storage if they're strings
    let startDate: Date;
    let endDate: Date;

    if (this.periodStart instanceof Date) {
      startDate = this.periodStart;
    } else if (typeof this.periodStart === 'string') {
      const startStr = this.periodStart as string;
      if (startStr.trim() !== '') {
        startDate = new Date(startStr + 'T00:00:00');
        if (isNaN(startDate.getTime())) {
          return; // Don't save invalid dates
        }
      } else {
        return; // Don't save empty dates
      }
    } else {
      return; // Don't save invalid data
    }

    if (this.periodEnd instanceof Date) {
      endDate = this.periodEnd;
    } else if (typeof this.periodEnd === 'string') {
      const endStr = this.periodEnd as string;
      if (endStr.trim() !== '') {
        endDate = new Date(endStr + 'T00:00:00');
        if (isNaN(endDate.getTime())) {
          return; // Don't save invalid dates
        }
      } else {
        return; // Don't save empty dates
      }
    } else {
      return; // Don't save invalid data
    }

    // Calculate boekjaar and aanslagjaar
    const calculatedTaxYear = this.taxDataService.calculateTaxYear(endDate);
    
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    
    let calculatedBookYear: string;
    if (startYear === endYear) {
      calculatedBookYear = startYear.toString();
    } else {
      calculatedBookYear = `${startYear}/${endYear}`;
    }

    const periodData: PeriodData = {
      startDate: startDate,
      endDate: endDate,
      bookYear: calculatedBookYear,
      taxYear: calculatedTaxYear,
    };
    this.taxDataService.savePeriodData(periodData);
  }

  private saveInvoermethodeData(): void {
    if (this.selectedInvoermethode) {
      const invoermethodeData: InvoermethodeData = {
        selectedMethod: this.selectedInvoermethode
      };
      this.taxDataService.saveInvoermethodeData(invoermethodeData);
    }
  }

  canProceedToStep2(): boolean {
    // Check if both dates are filled in (either as strings or Date objects)
    const hasStartDate = this.periodStart !== null && 
                        (typeof this.periodStart === 'string' ? this.periodStart.trim() !== '' : true);
    const hasEndDate = this.periodEnd !== null && 
                      (typeof this.periodEnd === 'string' ? this.periodEnd.trim() !== '' : true);
    
    return hasStartDate && hasEndDate && this.selectedInvoermethode !== null;
  }

  getValidationMessage(): string {
    const hasStartDate = this.periodStart !== null && 
                        (typeof this.periodStart === 'string' ? this.periodStart.trim() !== '' : true);
    const hasEndDate = this.periodEnd !== null && 
                      (typeof this.periodEnd === 'string' ? this.periodEnd.trim() !== '' : true);
    
    if (!hasStartDate || !hasEndDate) return 'Vul eerst de begin- en einddatum in';
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

  /**
   * Loads available files for import (mock data for now)
   */
  private loadAvailableFiles(): void {
    // Mock data - in a real application, this would come from an API
    this.availableFiles = [
      {
        id: '92166ea1-9314-4928-8322-9774b5be66d0',
        name: 'Macros Venb (204.3)',
        fiscalYear: 2024,
        lastModified: '2025-05-08T13:54:52.129765Z',
        status: 'toDo'
      },
      {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        name: 'Test Company 2023',
        fiscalYear: 2023,
        lastModified: '2024-05-15T10:30:00.000000Z',
        status: 'submitted'
      },
      {
        id: 'b2c3d4e5-f6g7-8901-bcde-f23456789012',
        name: 'Sample Corp 2022',
        fiscalYear: 2022,
        lastModified: '2023-06-20T14:45:00.000000Z',
        status: 'processed'
      }
    ];
  }

  /**
   * Handles file selection from the popup
   */
  onFileSelected(fileId: string): void {
    this.showFileSelection = false;
    
    // Find the selected file
    const selectedFile = this.availableFiles.find(file => file.id === fileId);
    if (!selectedFile) {
      console.error('Selected file not found');
      return;
    }

    console.log('File selected:', fileId, 'Starting import...');
    
    // In a real application, you would fetch the file data from an API
    // For now, we'll use mock data based on the file ID
    this.importFileData(fileId);
    
    // Immediately proceed to step 2 after successful import
    console.log('Import completed, navigating to step 2...');
    this.goToStep(2);
  }

  /**
   * Handles file selection cancellation
   */
  onFileSelectionCancelled(): void {
    this.showFileSelection = false;
    // Reset the selection if user cancels
    this.selectedInvoermethode = null;
    this.saveInvoermethodeData();
    
    // Show a message to the user that they need to select an invoermethode
    console.log('File selection cancelled. Please select an invoermethode to continue.');
  }

  /**
   * Imports data from the selected file
   */
  private importFileData(fileId: string): void {
    // In a real application, this would fetch the actual file data from an API
    // For now, we'll create mock data based on the file ID
    const mockData: ImportedDeclaration = {
      id: fileId,
      legalPersonId: '2bf4745a-6ba8-428d-ba11-9e23d5bf76a0',
      periodId: 'aa640756-2d1e-49e5-bf9f-335def08a0cb',
      name: 'Mock Import Data',
      declarationType: 'tax',
      protocolType: 'rCorp',
      fiscalYear: 2024,
      status: 'toDo',
      deadline: '2024-09-30',
      lastEdited: '2025-05-08T13:54:52.129765Z',
      version: 13,
      contents: {
        '_1080': 10000.04,
        '_1240': 58023.89,
        '_1320': 6516.1,
        '_1420': 13736,
        '_1432': 6420.17,
        '_1433': 32732.05,
        '_1439': 123.45,
        '_1438': 1438,
        '_1437': 15807,
        '_1445': 1445,
        '_1441': 280.62,
        '_1442': 1338.40,
        '_1436': 1436,
        '_1443': 1443,
        '_1508': 1508,
        '_1701': 1, // boolean field - 1 for true, 0 for false
        '_1801': 0, // boolean field - 1 for true, 0 for false
        '_1830': 41399.89,
        '_1840': 12925
        // Only importing codes that exist in the application
      }
    };

    try {
      // Import the data using the import service
      const importedData = this.importService.importDeclarationData(mockData);
      
      // Update the service with the imported data
      this.taxDataService.updateDeclarationSections(importedData.declarationSections);
      
      console.log('File imported successfully:', fileId);
      console.log('Imported data sections:', importedData.declarationSections.length);
    } catch (error) {
      console.error('Error importing file:', error);
      // In a real application, you would show an error message to the user
    }
  }
} 