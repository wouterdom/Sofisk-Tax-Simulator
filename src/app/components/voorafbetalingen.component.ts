import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormattedNumberInputComponent } from './formatted-number-input.component';

export interface VoorafbetalingenData {
  va1: number;
  va2: number;
  va3: number;
  va4: number;
}

@Component({
  selector: 'app-voorafbetalingen',
  standalone: true,
  imports: [CurrencyPipe, FormsModule, FormattedNumberInputComponent],
  template: `
    <div class="bg-white border rounded-xl shadow-sm p-6">
      <div class="flex items-center justify-between mb-4 cursor-pointer" (click)="toggleExpanded()">
        <h3 class="text-lg font-semibold text-gray-900">{{ title }}</h3>
        <button type="button" class="text-gray-400 hover:text-gray-600">
          <svg class="w-5 h-5 transform transition-transform" [class.rotate-180]="!isExpanded" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
      </div>
      
      @if (isExpanded) {
        <div class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ readonly ? 'Origineel' : 'Voorafbetaling 1' }} (1811)
              </label>
              <app-formatted-number-input 
                [fieldName]="'1811'" 
                [placeholder]="'0,00'" 
                [(ngModel)]="data.va1" 
                [disabled]="readonly"
                (valueChange)="onVoorafbetalingChange('va1', $event)">
              </app-formatted-number-input>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ readonly ? 'Origineel' : 'Voorafbetaling 3' }} (1813)
              </label>
              <app-formatted-number-input 
                [fieldName]="'1813'" 
                [placeholder]="'0,00'" 
                [(ngModel)]="data.va3" 
                [disabled]="readonly"
                (valueChange)="onVoorafbetalingChange('va3', $event)">
              </app-formatted-number-input>
            </div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ readonly ? 'Origineel' : 'Voorafbetaling 2' }} (1812)
              </label>
              <app-formatted-number-input 
                [fieldName]="'1812'" 
                [placeholder]="'0,00'" 
                [(ngModel)]="data.va2" 
                [disabled]="readonly"
                (valueChange)="onVoorafbetalingChange('va2', $event)">
              </app-formatted-number-input>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ readonly ? 'Origineel' : 'Voorafbetaling 4' }} (1814)
              </label>
              <app-formatted-number-input 
                [fieldName]="'1814'" 
                [placeholder]="'0,00'" 
                [(ngModel)]="data.va4" 
                [disabled]="readonly"
                (valueChange)="onVoorafbetalingChange('va4', $event)">
              </app-formatted-number-input>
            </div>
          </div>
          
          <div class="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
            <span class="text-sm font-medium text-gray-700">Totaal Voorafbetalingen:</span>
            <span class="text-lg font-bold text-teal-600">{{ getTotalVoorafbetalingen() | currency:'EUR':'symbol':'1.2-2':'nl-BE' }}</span>
          </div>
        </div>
      }
    </div>
  `
})
export class VoorafbetalingenComponent implements OnInit {
  @Input() data: VoorafbetalingenData = { va1: 0, va2: 0, va3: 0, va4: 0 };
  @Input() title = 'Voorafbetalingen';
  @Input() readonly = false;
  @Input() isExpanded = true;
  
  @Output() dataChange = new EventEmitter<VoorafbetalingenData>();
  @Output() valueChange = new EventEmitter<{ key: string; value: number }>();
  @Output() expandedChange = new EventEmitter<boolean>();

  ngOnInit(): void {
    // Ensure data is initialized
    if (!this.data) {
      this.data = { va1: 0, va2: 0, va3: 0, va4: 0 };
    }
  }

  onVoorafbetalingChange(key: keyof VoorafbetalingenData, value: number): void {
    this.data[key] = value;
    this.dataChange.emit(this.data);
    this.valueChange.emit({ key, value });
  }

  getTotalVoorafbetalingen(): number {
    return this.data.va1 + this.data.va2 + this.data.va3 + this.data.va4;
  }

  toggleExpanded(): void {
    this.isExpanded = !this.isExpanded;
    this.expandedChange.emit(this.isExpanded);
  }
}