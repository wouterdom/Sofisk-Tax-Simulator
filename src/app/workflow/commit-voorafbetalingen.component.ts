import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MainCalculationEngineService } from '../services/core-engine/main-calculation-engine.service';
import { Declaration, Prepayments } from '../services/types/tax-data.types';

@Component({
  selector: 'app-commit-voorafbetalingen',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './commit-voorafbetalingen.component.html'
})
export class CommitVoorafbetalingenComponent implements OnInit {
  availableDeclarations: Declaration[] = [];
  selectedDeclarationId: string = '';
  previewData: Prepayments = { va1: 0, va2: 0, va3: 0, va4: 0 };
  isLoading: boolean = false;
  successMessage: string = '';
  errorMessage: string = '';
  committedDeclaration: Declaration | null = null;
  isCommitted: boolean = false;
  
  // Tax calculation results
  taxCalculationResults: any = null;
  currentPrepayments: Prepayments = { va1: 0, va2: 0, va3: 0, va4: 0 };
  suggestedPrepayments: Prepayments = { va1: 0, va2: 0, va3: 0, va4: 0 };

  constructor(private taxDataService: MainCalculationEngineService) {}

  ngOnInit() {
    this.loadAvailableDeclarations();
    this.loadPreviewData();
    this.loadTaxCalculationData();
  }

  loadAvailableDeclarations() {
    // Mock data for now - in a real implementation this would come from a service
    this.availableDeclarations = [
      {
        id: '1',
        name: 'Aangifte 2024',
        assessmentYear: '2024',
        periodStart: new Date(2024, 0, 1),
        periodEnd: new Date(2024, 11, 31),
        status: 'draft',
        lastModified: new Date()
      },
      {
        id: '2',
        name: 'Aangifte 2023',
        assessmentYear: '2023',
        periodStart: new Date(2023, 0, 1),
        periodEnd: new Date(2023, 11, 31),
        status: 'submitted',
        lastModified: new Date()
      }
    ];
  }

  loadPreviewData() {
    // Get current prepayment data from calculation engine
    const data = this.taxDataService.getData();
    if (data) {
      this.previewData = data.prepayments;
    }
  }

  loadTaxCalculationData() {
    // Get tax calculation results and prepayment data
    const data = this.taxDataService.getData();
    if (data) {
      this.currentPrepayments = data.prepayments;
      this.suggestedPrepayments = data.prepayments; // This would be the optimized prepayments
    }
    
    // Subscribe to tax calculation results
    this.taxDataService.results$.subscribe(results => {
      this.taxCalculationResults = results;
    });
  }

  commitData() {
    if (!this.selectedDeclarationId) return;

    console.log('Starting commit for declaration:', this.selectedDeclarationId);
    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';

    const declaration = this.availableDeclarations.find(
      d => d.id === this.selectedDeclarationId
    );

    if (declaration) {
      console.log('Found declaration:', declaration.name);
      // Immediate commit - no need for timeout since it's hardcoded
      this.isLoading = false;
      this.isCommitted = true;
      this.committedDeclaration = declaration;
      this.successMessage = `Data succesvol gecommit naar ${declaration.name}`;
      this.selectedDeclarationId = '';
      console.log('Commit completed successfully');
    } else {
      console.error('Declaration not found for ID:', this.selectedDeclarationId);
      this.isLoading = false;
      this.errorMessage = 'Fout bij committen: Aangifte niet gevonden';
    }
  }

  cancelCommit() {
    this.selectedDeclarationId = '';
    this.successMessage = '';
    this.errorMessage = '';
    this.isCommitted = false;
    this.committedDeclaration = null;
  }

  clearMessages() {
    this.successMessage = '';
    this.errorMessage = '';
  }
} 