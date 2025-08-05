import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormattedNumberInputComponent } from './formatted-number-input.component';
import { BookYearInfo } from '../services/core-engine/book-year-calculator.service';

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
  imports: [CurrencyPipe, DatePipe, FormsModule, FormattedNumberInputComponent],
  template: `
    <!-- Header with title, total, book year info, and collapse icon -->
    <div class="flex justify-between items-center mb-3 cursor-pointer select-none transition-colors rounded hover:bg-teal-50 p-2" (click)="toggleExpanded()">
      <div class="flex items-center space-x-4">
        <h4 class="font-medium text-gray-900">{{ title }}</h4>
        @if (bookYearInfo) {
          <div class="flex items-center space-x-3 text-xs text-gray-600">
            <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded">{{ getBookYearTypeDescription() }}</span>
            @if (bookYearInfo.isShortBookYear) {
              <span class="bg-orange-100 text-orange-800 px-2 py-1 rounded">{{ getShortBookYearPrepaymentDescription() }}</span>
            }
          </div>
        }
      </div>
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
                     <!-- Show prepayment fields based on book year type with integrated due dates -->
           @if (shouldShowPrepaymentField('va1')) {
             @if (getDueDateInfo('va1').date) {
                               <div class="mb-3">
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-gray-700 font-medium">{{ readonly ? 'VA1' : 'Voorafbetaling 1' }}</span>
                    <div class="flex items-center gap-2">
                      <span class="text-xs bg-teal-200 text-teal-800 px-2 py-1 rounded">1811</span>
                      <app-formatted-number-input 
                        [fieldName]="'1811'" 
                        [placeholder]="'0,00'" 
                        [(ngModel)]="data.va1" 
                        [disabled]="readonly"
                        (valueChange)="onPrepaymentChange('va1', $event)">
                      </app-formatted-number-input>
                    </div>
                  </div>
                  <div class="flex items-center gap-1 ml-0">
                    <span class="text-xs text-gray-500">Uiterste betaaldatum:</span>
                    <span class="text-xs font-medium" [class.text-red-600]="getDueDateInfo('va1').isOverdue" [class.text-gray-700]="!getDueDateInfo('va1').isOverdue">
                      {{ getDueDateInfo('va1').date | date:'dd MMMM yyyy':'':'nl-BE' }}
                    </span>
                    @if (getDueDateInfo('va1').isOverdue) {
                      <span class="text-xs text-red-500 font-medium">(Verstreken)</span>
                    }
                  </div>
                </div>
             }
           }
          
                     @if (shouldShowPrepaymentField('va2')) {
             @if (getDueDateInfo('va2').date) {
                               <div class="mb-3">
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-gray-700 font-medium">{{ readonly ? 'VA2' : 'Voorafbetaling 2' }}</span>
                    <div class="flex items-center gap-2">
                      <span class="text-xs bg-teal-200 text-teal-800 px-2 py-1 rounded">1812</span>
                      <app-formatted-number-input 
                        [fieldName]="'1812'" 
                        [placeholder]="'0,00'" 
                        [(ngModel)]="data.va2" 
                        [disabled]="readonly"
                        (valueChange)="onPrepaymentChange('va2', $event)">
                      </app-formatted-number-input>
                    </div>
                  </div>
                  <div class="flex items-center gap-1 ml-0">
                    <span class="text-xs text-gray-500">Uiterste betaaldatum:</span>
                    <span class="text-xs font-medium" [class.text-red-600]="getDueDateInfo('va2').isOverdue" [class.text-gray-700]="!getDueDateInfo('va2').isOverdue">
                      {{ getDueDateInfo('va2').date | date:'dd MMMM yyyy':'':'nl-BE' }}
                    </span>
                    @if (getDueDateInfo('va2').isOverdue) {
                      <span class="text-xs text-red-500 font-medium">(Verstreken)</span>
                    }
                  </div>
                </div>
             }
           }
          
                     @if (shouldShowPrepaymentField('va3')) {
             @if (getDueDateInfo('va3').date) {
                               <div class="mb-3">
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-gray-700 font-medium">{{ readonly ? 'VA3' : 'Voorafbetaling 3' }}</span>
                    <div class="flex items-center gap-2">
                      <span class="text-xs bg-teal-200 text-teal-800 px-2 py-1 rounded">1813</span>
                      <app-formatted-number-input 
                        [fieldName]="'1813'" 
                        [placeholder]="'0,00'" 
                        [(ngModel)]="data.va3" 
                        [disabled]="readonly"
                        (valueChange)="onPrepaymentChange('va3', $event)">
                      </app-formatted-number-input>
                    </div>
                  </div>
                  <div class="flex items-center gap-1 ml-0">
                    <span class="text-xs text-gray-500">Uiterste betaaldatum:</span>
                    <span class="text-xs font-medium" [class.text-red-600]="getDueDateInfo('va3').isOverdue" [class.text-gray-700]="!getDueDateInfo('va3').isOverdue">
                      {{ getDueDateInfo('va3').date | date:'dd MMMM yyyy':'':'nl-BE' }}
                    </span>
                    @if (getDueDateInfo('va3').isOverdue) {
                      <span class="text-xs text-red-500 font-medium">(Verstreken)</span>
                    }
                  </div>
                </div>
             }
           }
          
                     @if (shouldShowPrepaymentField('va4')) {
             @if (getDueDateInfo('va4').date) {
                               <div class="mb-3">
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-gray-700 font-medium">{{ readonly ? 'VA4' : 'Voorafbetaling 4' }}</span>
                    <div class="flex items-center gap-2">
                      <span class="text-xs bg-teal-200 text-teal-800 px-2 py-1 rounded">1814</span>
                      <app-formatted-number-input 
                        [fieldName]="'1814'" 
                        [placeholder]="'0,00'" 
                        [(ngModel)]="data.va4" 
                        [disabled]="readonly"
                        (valueChange)="onPrepaymentChange('va4', $event)">
                      </app-formatted-number-input>
                    </div>
                  </div>
                  <div class="flex items-center gap-1 ml-0">
                    <span class="text-xs text-gray-500">Uiterste betaaldatum:</span>
                    <span class="text-xs font-medium" [class.text-red-600]="getDueDateInfo('va4').isOverdue" [class.text-gray-700]="!getDueDateInfo('va4').isOverdue">
                      {{ getDueDateInfo('va4').date | date:'dd MMMM yyyy':'':'nl-BE' }}
                    </span>
                    @if (getDueDateInfo('va4').isOverdue) {
                      <span class="text-xs text-red-500 font-medium">(Verstreken)</span>
                    }
                  </div>
                </div>
             }
           }
          
        </div>
      </div>
    }
  `
})
export class PrepaymentComponent implements OnInit, OnChanges {
  @Input() data: PrepaymentData = { va1: 0, va2: 0, va3: 0, va4: 0 };
  @Input() title = 'Totaal voorafbetalingen (code 1810)';
  @Input() readonly = false;
  @Input() isExpanded = true;
  @Input() bookYearInfo?: BookYearInfo;
  @Input() latestPrepaymentDates?: any;
  
  @Output() dataChange = new EventEmitter<PrepaymentData>();
  @Output() valueChange = new EventEmitter<{ key: keyof PrepaymentData; value: number }>();
  @Output() expandedChange = new EventEmitter<boolean>();

  ngOnInit(): void {
    // Ensure data is initialized
    if (!this.data) {
      this.data = { va1: 0, va2: 0, va3: 0, va4: 0 };
    }
    
    // Debug logging
    console.log('PrepaymentComponent ngOnInit - bookYearInfo:', this.bookYearInfo);
    console.log('PrepaymentComponent ngOnInit - latestPrepaymentDates:', this.latestPrepaymentDates);
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Debug logging when inputs change
    if (changes['bookYearInfo']) {
      console.log('PrepaymentComponent ngOnChanges - bookYearInfo changed:', this.bookYearInfo);
    }
    if (changes['latestPrepaymentDates']) {
      console.log('PrepaymentComponent ngOnChanges - latestPrepaymentDates changed:', this.latestPrepaymentDates);
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

  /**
   * Determine if a prepayment field should be shown based on book year type
   */
  shouldShowPrepaymentField(field: keyof PrepaymentData): boolean {
    console.log('shouldShowPrepaymentField called for:', field, 'bookYearInfo:', this.bookYearInfo);
    
    if (!this.bookYearInfo) {
      console.log('No book year info, showing all fields');
      return true; // Show all fields if no book year info
    }

    if (this.bookYearInfo.isNormalBookYear || this.bookYearInfo.isLongBookYear) {
      console.log('Normal or long book year, showing all fields');
      return true; // Show all fields for normal and long book years
    }

    if (this.bookYearInfo.isShortBookYear) {
      const quarters = this.bookYearInfo.quartersInBookYear;
      console.log('Short book year with', quarters, 'quarters');
      
      let shouldShow = false;
      switch (field) {
        case 'va1':
          shouldShow = quarters >= 4;
          break;
        case 'va2':
          shouldShow = quarters >= 3;
          break;
        case 'va3':
          shouldShow = quarters >= 2;
          break;
        case 'va4':
          shouldShow = quarters >= 1;
          break;
        default:
          shouldShow = true;
      }
      console.log('Field', field, 'should show:', shouldShow);
      return shouldShow;
    }

    return true;
  }

  /**
   * Get book year type description
   */
  getBookYearTypeDescription(): string {
    if (!this.bookYearInfo) {
      return '';
    }
    
    if (this.bookYearInfo.isShortBookYear) {
      return `Verkort boekjaar (${this.bookYearInfo.durationInMonths} maanden)`;
    } else if (this.bookYearInfo.isLongBookYear) {
      return `Verlengd boekjaar (${this.bookYearInfo.durationInMonths} maanden)`;
    } else {
      return 'Normaal boekjaar (12 maanden)';
    }
  }

  /**
   * Get short book year prepayment description
   */
  getShortBookYearPrepaymentDescription(): string {
    if (!this.bookYearInfo || !this.bookYearInfo.isShortBookYear) {
      return '';
    }
    
    const quarters = this.bookYearInfo.quartersInBookYear;
    switch (quarters) {
      case 1:
        return '1 voorafbetaling (1/1 van het totaal)';
      case 2:
        return '2 voorafbetalingen (elk 1/2 van het totaal)';
      case 3:
        return '3 voorafbetalingen (elk 1/3 van het totaal)';
      case 4:
        return '4 voorafbetalingen (elk 1/4 van het totaal)';
      default:
        return '';
    }
  }

  /**
   * Get the due date index for a specific prepayment field
   */
  getDueDateIndex(field: keyof PrepaymentData): number {
    if (!this.bookYearInfo || !this.latestPrepaymentDates) {
      return -1;
    }

    if (this.bookYearInfo.isNormalBookYear || this.bookYearInfo.isLongBookYear) {
      // For normal/long book years, use the standard mapping
      switch (field) {
        case 'va1': return 0;
        case 'va2': return 1;
        case 'va3': return 2;
        case 'va4': return 3;
        default: return -1;
      }
    }

    if (this.bookYearInfo.isShortBookYear) {
      const quarters = this.bookYearInfo.quartersInBookYear;
      
      // For short book years, map based on the prepayment order
      switch (quarters) {
        case 1:
          // Only VA4
          return field === 'va4' ? 0 : -1;
        case 2:
          // VA3, VA4
          switch (field) {
            case 'va3': return 0;
            case 'va4': return 1;
            default: return -1;
          }
        case 3:
          // VA2, VA3, VA4
          switch (field) {
            case 'va2': return 0;
            case 'va3': return 1;
            case 'va4': return 2;
            default: return -1;
          }
        case 4:
          // VA1, VA2, VA3, VA4 (normal order)
          switch (field) {
            case 'va1': return 0;
            case 'va2': return 1;
            case 'va3': return 2;
            case 'va4': return 3;
            default: return -1;
          }
        default:
          return -1;
      }
    }

    return -1;
  }

  /**
   * Get due date info for a specific prepayment field
   */
  getDueDateInfo(field: keyof PrepaymentData): { date: Date | null; isOverdue: boolean; description: string | null } {
    const index = this.getDueDateIndex(field);
    
    if (index === -1 || !this.latestPrepaymentDates || !this.latestPrepaymentDates.dates[index]) {
      return { date: null, isOverdue: false, description: null };
    }

    return {
      date: this.latestPrepaymentDates.dates[index],
      isOverdue: this.latestPrepaymentDates.isOverdue[index],
      description: this.latestPrepaymentDates.descriptions[index]
    };
  }
}