import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { VereenvoudigdeAangifteComponent } from './vereenvoudigde-aangifte.component';
import { VoorschottenOptimaliserenComponent } from './voorschotten-optimaliseren.component';
import { HeaderComponent } from '../header/header';
import { STEP_CONFIG } from '../services/core-engine/parameters';
import { MainCalculationEngineService } from '../services/core-engine/main-calculation-engine.service';
import { TaxData } from '../services/types/tax-data.types';
import { PrepaymentCalculationGoal } from '../services/types/tax-data.types';

@Component({
  selector: 'app-tax-simulator',
  standalone: true,
  imports: [CommonModule, HeaderComponent, VereenvoudigdeAangifteComponent, VoorschottenOptimaliserenComponent],
  templateUrl: './Invoermethode.html'
})
export class TaxSimulatorComponent implements OnInit, AfterViewInit {
  currentStep: number = STEP_CONFIG.STEPS.SELECT_INVOERMETHODE;
  showSaveDialog = false;

  @ViewChild(VoorschottenOptimaliserenComponent)
  voorschottenComponent: VoorschottenOptimaliserenComponent | undefined;

  private readonly STEP_STORAGE_KEY = 'sofisk_current_step';

  constructor(private taxDataService: MainCalculationEngineService) {}

  ngOnInit(): void {
    this.loadStep();
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

  goToStep(step: number): void {
    if (step >= STEP_CONFIG.MIN_STEP && step <= STEP_CONFIG.MAX_STEP) {
      // Intercept navigation from 3 to 2 for confirmation
      if (this.currentStep === STEP_CONFIG.STEPS.VOORSCHOTTEN_OPTIMALISEREN && step === STEP_CONFIG.STEPS.VEREENVOUDIGDE_AANGIFTE && this.voorschottenComponent) {
        this.voorschottenComponent.confirmAndCommitIfNeeded((commit: boolean) => {
          if (commit) {
            // Already committed in child
          } else {
            // Revert simulation values to committed values
            this.voorschottenComponent?.revertSimulationToCommitted();
          }
          this.currentStep = STEP_CONFIG.STEPS.VEREENVOUDIGDE_AANGIFTE;
          this.saveStep();
          // Force recalculation after step change
          this.taxDataService.forceRecalculation();
        });
        return;
      }
      this.currentStep = step;
      this.saveStep();
      // Force recalculation after step change
      this.taxDataService.forceRecalculation();
    }
  }

  nextStep(): void {
    if (this.currentStep < 3) {
      this.currentStep++;
      this.saveStep();
      // Force recalculation after step change
      this.taxDataService.forceRecalculation();
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      // Intercept navigation from 3 to 2 for confirmation
      if (this.currentStep === 3 && this.voorschottenComponent) {
        this.voorschottenComponent.confirmAndCommitIfNeeded((commit: boolean) => {
          if (commit) {
            // Already committed in child
          } else {
            // Revert simulation values to committed values
            this.voorschottenComponent?.revertSimulationToCommitted();
          }
          this.currentStep = 2;
          this.saveStep();
          // Force recalculation after step change
          this.taxDataService.forceRecalculation();
        });
        return;
      }
      this.currentStep--;
      this.saveStep();
      // Force recalculation after step change
      this.taxDataService.forceRecalculation();
    }
  }

  commitData(): void {
    this.showSaveDialog = true;
  }

  saveData(): void {
    // TODO: Implement save functionality
    console.log('Saving data...');
    this.showSaveDialog = false;
    // Could navigate to a success page or show success message
  }

  cancelSave(): void {
    this.showSaveDialog = false;
  }
} 