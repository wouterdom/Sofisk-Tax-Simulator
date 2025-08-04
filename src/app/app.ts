import { Component, signal } from '@angular/core';
import { TaxSimulatorComponent } from './Workflow-steps/Invoermethode';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [TaxSimulatorComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('sofisk-app');
}
