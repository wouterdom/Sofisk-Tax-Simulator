import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VereenvoudigdeAangifteComponent } from '../vereenvoudigde-aangifte/vereenvoudigde-aangifte.component';
import { VoorschottenOptimaliserenComponent } from '../voorschotten-optimaliseren/voorschotten-optimaliseren.component';
import { Header } from '../header/header';

@Component({
  selector: 'app-tax-simulator',
  standalone: true,
  imports: [CommonModule, Header, VereenvoudigdeAangifteComponent, VoorschottenOptimaliserenComponent],
  templateUrl: './tax-simulator.html'
})
export class TaxSimulatorComponent implements OnInit {
  currentStep = 1;
  inputMethod: 'manual' | 'previous' | 'upload' = 'manual';
  showSaveDialog = false;

  private readonly STEP_STORAGE_KEY = 'sofisk_current_step';

  ngOnInit(): void {
    this.loadStep();
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
    if (step >= 1 && step <= 3) {
      this.currentStep = step;
      this.saveStep();
    }
  }

  setInputMethod(method: 'manual' | 'previous' | 'upload'): void {
    this.inputMethod = method;
  }

  nextStep(): void {
    if (this.currentStep < 3) {
      this.currentStep++;
      this.saveStep();
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.saveStep();
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