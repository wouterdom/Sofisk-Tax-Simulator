import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './header/header';
import { TaxSimulatorComponent } from './tax-simulator/tax-simulator';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, TaxSimulatorComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('sofisk-app');
}
