import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgFor } from '@angular/common';

@Component({
  selector: 'app-prepayment-step',
  standalone: true,
  imports: [FormsModule, NgFor],
  templateUrl: './prepayment-step.html',
  styleUrl: './prepayment-step.css'
})
export class PrepaymentStep {
  optimizationGoal: string = 'spread';

  optimizationOptions = [
    { value: 'none', label: 'Zonder optimalisatie voorafbetalingen' },
    { value: 'va1', label: 'VA1' },
    { value: 'va2', label: 'VA2' },
    { value: 'va3', label: 'VA3' },
    { value: 'va4', label: 'VA4' },
    { value: 'spread', label: 'VA verdelen over de 4 periodes' }
  ];
}
