import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NgClass, NgSwitch, NgSwitchCase, NgIf, NgFor, CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-tax-calculation-step',
  standalone: true,
  imports: [NgClass, NgSwitch, NgSwitchCase, NgIf, NgFor, CurrencyPipe],
  templateUrl: './tax-calculation-step.html',
  styleUrl: './tax-calculation-step.css'
})
export class TaxCalculationStep {
  @Input() inputMethod: 'manual' | 'previous' | 'upload' = 'manual';
  @Input() declarationCodes: any[] = [];
  @Output() inputMethodChange = new EventEmitter<'manual' | 'previous' | 'upload'>();

  // Foldable section state
  showAftrekkenResterendeWinst = true;
  showAftrekkenKorbeperking = false;
  showAfzonderlijkTeBelasten = false;
  showVoorheffing = false;

  selectMethod(method: 'manual' | 'previous' | 'upload') {
    this.inputMethodChange.emit(method);
  }
}
