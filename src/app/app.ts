import { Component, signal } from '@angular/core';
import { TaxSimulatorComponent } from './tax-simulator/tax-simulator';

@Component({
  selector: 'app-root',
  imports: [TaxSimulatorComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('sofisk-app');
}
