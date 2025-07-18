import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NgClass, NgSwitch, NgSwitchCase, NgIf, NgFor, CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-vereenvoudigde-aangifte',
  standalone: true,
  imports: [NgClass, NgSwitch, NgSwitchCase, NgIf, NgFor, CurrencyPipe],
  templateUrl: './vereenvoudigde-aangifte.component.html',
  styleUrl: './vereenvoudigde-aangifte.component.css'
})
export class VereenvoudigdeAangifteComponent {
  @Input() inputMethod: 'manual' | 'previous' | 'upload' = 'manual';
  @Output() inputMethodChange = new EventEmitter<'manual' | 'previous' | 'upload'>();

  declarationCodes = [
    { code: '1701', value: 0 },
    { code: '1801', value: 0 },
    // Add more codes as needed or load from JSON
  ];

  // Foldable section state
  showAftrekkenResterendeWinst = true;
  showAftrekkenKorbeperking = false;
  showAfzonderlijkTeBelasten = false;
  showVoorheffing = false;

  selectMethod(method: 'manual' | 'previous' | 'upload') {
    this.inputMethod = method;
    this.inputMethodChange.emit(method);
  }
}
