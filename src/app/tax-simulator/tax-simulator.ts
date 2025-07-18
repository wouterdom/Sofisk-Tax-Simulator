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
  step = 1;
  inputMethod: 'manual' | 'previous' | 'upload' = 'manual';

  goToStep(step: number) {
    this.step = step;
  }

  setInputMethod(method: 'manual' | 'previous' | 'upload') {
    this.inputMethod = method;
  }
} 