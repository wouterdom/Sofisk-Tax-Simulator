import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormattedNumberInputComponent } from './formatted-number-input.component';

export interface PrepaymentData {
  va1: number;
  va2: number;
  va3: number;
  va4: number;
  [key: string]: number;
}

@Component({
  selector: 'app-prepayment',
  standalone: true,
  imports: [CurrencyPipe, FormsModule, FormattedNumberInputComponent],
  template: `
    <!-- Header with title, total, and collapse icon -->
    <div class="flex justify-between items-center mb-3 cursor-pointer select-none transition-colors rounded hover:bg-teal-50 p-2" (click)="toggleExpanded()">
      <h4 class="font-medium text-gray-900">{{ title }}</h4>
      <span class="text-sm font-medium flex items-center">
        <span class="mr-2">{{ getTotalPrepayments() | currency:'EUR':'symbol':'1.2-2':'nl-BE' }}</span>
        @if (!isExpanded) {
          <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 5v14m7-7H5"/></svg>
        }
        @if (isExpanded) {
          <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 12H5"/></svg>
        }
      </span>
    </div>
    
    @if (isExpanded) {
      <div>
        <div class="space-y-2 bg-teal-50 p-4 rounded">
          <div class="flex items-center mb-2">
            <span class="flex-1 text-gray-700">{{ readonly ? 'VA1' : 'Voorafbetaling 1' }}</span>
            <span class="text-xs bg-teal-200 text-teal-800 px-2 py-1 rounded mr-2">1811</span>
            <app-formatted-number-input 
              [fieldName]="'1811'" 
              [placeholder]="'0,00'" 
              [(ngModel)]="data.va1" 
              [disabled]="readonly"
              (valueChange)="onPrepaymentChange('va1', $event)">
            </app-formatted-number-input>
          </div>
          
          <div class="flex items-center mb-2">
            <span class="flex-1 text-gray-700">{{ readonly ? 'VA2' : 'Voorafbetaling 2' }}</span>
            <span class="text-xs bg-teal-200 text-teal-800 px-2 py-1 rounded mr-2">1812</span>
            <app-formatted-number-input 
              [fieldName]="'1812'" 
              [placeholder]="'0,00'" 
              [(ngModel)]="data.va2" 
              [disabled]="readonly"
              (valueChange)="onPrepaymentChange('va2', $event)">
            </app-formatted-number-input>
          </div>
          
          <div class="flex items-center mb-2">
            <span class="flex-1 text-gray-700">{{ readonly ? 'VA3' : 'Voorafbetaling 3' }}</span>
            <span class="text-xs bg-teal-200 text-teal-800 px-2 py-1 rounded mr-2">1813</span>
            <app-formatted-number-input 
              [fieldName]="'1813'" 
              [placeholder]="'0,00'" 
              [(ngModel)]="data.va3" 
              [disabled]="readonly"
              (valueChange)="onPrepaymentChange('va3', $event)">
            </app-formatted-number-input>
          </div>
          
          <div class="flex items-center mb-2">
            <span class="flex-1 text-gray-700">{{ readonly ? 'VA4' : 'Voorafbetaling 4' }}</span>
            <span class="text-xs bg-teal-200 text-teal-800 px-2 py-1 rounded mr-2">1814</span>
            <app-formatted-number-input 
              [fieldName]="'1814'" 
              [placeholder]="'0,00'" 
              [(ngModel)]="data.va4" 
              [disabled]="readonly"
              (valueChange)="onPrepaymentChange('va4', $event)">
            </app-formatted-number-input>
          </div>
        </div>
      </div>
    }
  `
})
export class PrepaymentComponent implements OnInit {
  @Input() data: PrepaymentData = { va1: 0, va2: 0, va3: 0, va4: 0 };
  @Input() title = 'Totaal voorafbetalingen (code 1810)';
  @Input() readonly = false;
  @Input() isExpanded = true;
  
  @Output() dataChange = new EventEmitter<PrepaymentData>();
  @Output() valueChange = new EventEmitter<{ key: keyof PrepaymentData; value: number }>();
  @Output() expandedChange = new EventEmitter<boolean>();

  ngOnInit(): void {
    // Ensure data is initialized
    if (!this.data) {
      this.data = { va1: 0, va2: 0, va3: 0, va4: 0 };
    }
  }

  onPrepaymentChange(key: keyof PrepaymentData, value: number): void {
    this.data[key] = value;
    this.dataChange.emit(this.data);
    this.valueChange.emit({ key, value });
  }

  getTotalPrepayments(): number {
    return this.data.va1 + this.data.va2 + this.data.va3 + this.data.va4;
  }

  toggleExpanded(): void {
    this.isExpanded = !this.isExpanded;
    this.expandedChange.emit(this.isExpanded);
  }
}