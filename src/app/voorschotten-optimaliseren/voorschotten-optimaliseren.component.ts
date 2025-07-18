import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgFor } from '@angular/common';

@Component({
  selector: 'app-voorschotten-optimaliseren',
  standalone: true,
  imports: [FormsModule, NgFor],
  templateUrl: './voorschotten-optimaliseren.component.html',
  styleUrl: './voorschotten-optimaliseren.component.css'
})
export class VoorschottenOptimaliserenComponent {
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
