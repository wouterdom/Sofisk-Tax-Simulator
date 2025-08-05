import { Component, OnInit, OnDestroy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MainCalculationEngineService } from '../services/core-engine/main-calculation-engine.service';
import { Subscription } from 'rxjs';

interface Declaration {
  id: string;
  name: string;
  assessmentYear: string;
  period: string;
  lastModified: string;
}

interface DeclarationYear {
  year: string;
  declarations: Declaration[];
  isExpanded: boolean;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class HeaderComponent implements OnInit, OnDestroy {
  lastSaved: Date = new Date();
  showSaveDialog = false;
  showResetDialog = false;
  canCommit = false;
  selectedDeclaration: Declaration | null = null;
  declarationYears: DeclarationYear[] = [];
  showSuccessBanner = false;
  successMessage = '';
  private dataSubscription?: Subscription;
  private successBannerTimer?: any;

  constructor(private taxDataService: MainCalculationEngineService) {
    this.initializeDeclarationData();
  }

  ngOnInit(): void {
    // Subscribe to data changes to get last saved date
    this.dataSubscription = this.taxDataService.data$.subscribe(data => {
      if (data) {
        this.lastSaved = data.lastUpdated;
        // Enable commit button if we're on step 2 or 3 and have data
        this.canCommit = this.isOnCommitableStep() && this.hasDataToCommit();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }
    if (this.successBannerTimer) {
      clearTimeout(this.successBannerTimer);
    }
  }

  private initializeDeclarationData(): void {
    // Hardcoded example declarations based on the Sofisk application structure
    this.declarationYears = [
      {
        year: '2025',
        isExpanded: true,
        declarations: [
          {
            id: 'decl-2025-1',
            name: 'Voorbeeld aangifte 2025',
            assessmentYear: '2025',
            period: '01/01/2025 → 31/12/2025',
            lastModified: '08/07/2025'
          }
        ]
      },
      {
        year: '2024',
        isExpanded: true,
        declarations: [
          {
            id: 'decl-2024-1',
            name: 'Voorbeeld aangifte 2024',
            assessmentYear: '2025',
            period: '01/01/2024 → 31/12/2024',
            lastModified: '07/05/2025'
          }
        ]
      },
      {
        year: '2021',
        isExpanded: true,
        declarations: [
          {
            id: 'decl-2021-1',
            name: 'test',
            assessmentYear: '2024',
            period: '01/01/2021 → 31/12/2021',
            lastModified: '15/03/2024'
          }
        ]
      }
    ];
  }

  private isOnCommitableStep(): boolean {
    if (typeof window !== 'undefined' && window.localStorage) {
      const currentStep = localStorage.getItem('sofisk_current_step');
      return currentStep === '2' || currentStep === '3';
    }
    return false;
  }

  private hasDataToCommit(): boolean {
    // Check if there's meaningful data to commit
    // This is a simplified check - you might want to make this more sophisticated
    return true; // For now, always allow commit if on correct step
  }

  commitData(): void {
    this.showSaveDialog = true;
    this.selectedDeclaration = null; // Reset selection when opening dialog
  }

  selectDeclaration(declaration: Declaration): void {
    this.selectedDeclaration = declaration;
  }

  saveData(): void {
    if (this.selectedDeclaration) {
      // TODO: Implement actual save functionality
      console.log('Committing data to declaration:', this.selectedDeclaration);
      console.log('Prepayment data to commit:', this.taxDataService.getData());
      
      // Show success banner instead of alert
      this.showSuccessMessage(`Data successfully committed to declaration: ${this.selectedDeclaration.name} (${this.selectedDeclaration.assessmentYear})`);
    }
    this.showSaveDialog = false;
    this.selectedDeclaration = null;
  }

  showSuccessMessage(message: string): void {
    this.successMessage = message;
    this.showSuccessBanner = true;
    
    // Auto-hide after 5 seconds
    if (this.successBannerTimer) {
      clearTimeout(this.successBannerTimer);
    }
    this.successBannerTimer = setTimeout(() => {
      this.hideSuccessBanner();
    }, 5000);
  }

  hideSuccessBanner(): void {
    this.showSuccessBanner = false;
    if (this.successBannerTimer) {
      clearTimeout(this.successBannerTimer);
      this.successBannerTimer = undefined;
    }
  }

  cancelSave(): void {
    this.showSaveDialog = false;
    this.selectedDeclaration = null;
  }

  showResetConfirmation(): void {
    this.showResetDialog = true;
  }

  cancelReset(): void {
    this.showResetDialog = false;
  }

  confirmReset(): void {
    // Store current step before clearing data
    const currentStep = localStorage.getItem('sofisk_current_step');
    
    // Reset to defaults (this will clear all data and set default values)
    this.taxDataService.resetToDefaults();
    
    // Restore the current step if it exists
    if (currentStep) {
      localStorage.setItem('sofisk_current_step', currentStep);
    }
    
    // Close the dialog
    this.showResetDialog = false;
    
    // Show success message
    this.showSuccessMessage('All data has been reset successfully');
  }
}
