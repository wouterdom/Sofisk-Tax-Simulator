import { Component } from '@angular/core';
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
export class TaxSimulatorComponent {
  currentStep = 1;
  inputMethod: 'manual' | 'previous' | 'upload' = 'manual';
  showSaveDialog = false;

  goToStep(step: number): void {
    if (step >= 1 && step <= 3) {
      this.currentStep = step;
    }
  }

  setInputMethod(method: 'manual' | 'previous' | 'upload'): void {
    this.inputMethod = method;
  }

  nextStep(): void {
    if (this.currentStep < 3) {
      this.currentStep++;
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
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