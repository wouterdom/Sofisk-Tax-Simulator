import { Component, Input, Output, EventEmitter, forwardRef, ChangeDetectorRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NumberFormattingService } from '../services/number-formatting.service';

@Component({
  selector: 'app-formatted-number-input',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative">
      <input
        type="text"
        [value]="displayValue"
        (input)="onInputChange($event)"
        (blur)="onBlur()"
        (focus)="onFocus()"
        [class]="inputClasses"
        [placeholder]="placeholder"
        [disabled]="disabled"
      />
      <div *ngIf="showError" class="absolute -bottom-5 left-0 text-xs text-red-600">
        {{ errorMessage }}
      </div>
    </div>
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FormattedNumberInputComponent),
      multi: true
    }
  ]
})
export class FormattedNumberInputComponent implements ControlValueAccessor {
  @Input() placeholder: string = '';
  @Input() disabled: boolean = false;
  @Input() fieldName: string = '';
  
  @Output() valueChange = new EventEmitter<number>();
  @Output() formattedValueChange = new EventEmitter<string>();

  displayValue: string = '';
  numericValue: number = 0;
  isFocused: boolean = false;
  showError: boolean = false;
  errorMessage: string = '';

  private onChange = (value: number) => {};
  private onTouched = () => {};

  constructor(
    private numberFormatting: NumberFormattingService,
    private cdr: ChangeDetectorRef
  ) {}

  onInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = target.value;
    
    this.displayValue = value;
    this.formattedValueChange.emit(value);
    
    const numericValue = this.numberFormatting.parseNumberEU(value);
    this.numericValue = numericValue;
    
    // Validate
    this.validateInput(value);
    
    // Emit numeric value
    this.valueChange.emit(numericValue);
    this.onChange(numericValue);
    
    // Force update
    this.cdr.detectChanges();
  }

  onBlur(): void {
    this.isFocused = false;
    this.formatDisplayValue();
    this.onTouched();
  }

  onFocus(): void {
    this.isFocused = true;
    this.showError = false;
  }

  private validateInput(value: string): void {
    if (!this.numberFormatting.isValidEuropeanNumber(value)) {
      this.showError = true;
      this.errorMessage = 'Invalid number format';
    } else {
      this.showError = false;
      this.errorMessage = '';
    }
  }

  private formatDisplayValue(): void {
    if (!this.isFocused && this.numericValue !== 0) {
      this.displayValue = this.numberFormatting.formatNumberEU(this.numericValue);
    }
  }

  get inputClasses(): string {
    const baseClasses = 'w-40 text-right text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500';
    const errorClasses = this.showError ? 'border-red-500' : 'border-gray-300';
    const disabledClasses = this.disabled ? 'bg-gray-100 cursor-not-allowed' : '';
    
    return `${baseClasses} ${errorClasses} ${disabledClasses}`;
  }

  // ControlValueAccessor implementation
  writeValue(value: number): void {
    this.numericValue = value || 0;
    this.displayValue = this.numberFormatting.formatNumberEU(this.numericValue);
    // Ensure the component view is updated
    this.cdr.detectChanges();
  }

  registerOnChange(fn: (value: number) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
} 