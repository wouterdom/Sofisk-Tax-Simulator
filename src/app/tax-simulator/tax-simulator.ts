import { Component } from '@angular/core';
import { NgClass, NgIf, CurrencyPipe, NgSwitch, NgSwitchCase } from '@angular/common';
import { TaxCalculationStep } from '../tax-calculation-step/tax-calculation-step';
import { PrepaymentStep } from '../prepayment-step/prepayment-step';
import { HttpClient } from '@angular/common/http';
import { OnInit } from '@angular/core';

@Component({
  selector: 'app-tax-simulator',
  standalone: true,
  imports: [NgClass, NgIf, CurrencyPipe, NgSwitch, NgSwitchCase, TaxCalculationStep, PrepaymentStep],
  templateUrl: './tax-simulator.html',
  styleUrl: './tax-simulator.css'
})
export class TaxSimulatorComponent implements OnInit {
  step = 1;
  inputMethod: 'manual' | 'previous' | 'upload' = 'manual';

  showAftrekkenResterendeWinst = true;
  showAftrekkenKorbeperking = true;
  showAfzonderlijkTeBelasten = true;
  showVoorheffing = true;

  // Dummy data for all fields
  taxData = {
    belastbareGereserveerdeWinst: 500000,
    verworpenUitgaven: 0,
    uitgedeeldeDividenden: 0,
    aftrekbeperkingResultaat: 800000,
    nietBelastbareBestanddelen: 0,
    definitiefBelastInkomsten: 0,
    octrooiAftrek: 0,
    innovatieAftrek: 0,
    investeringsaftrek: 0,
    groepsbijdrage: 0,
    risicokapitaalAftrek: 0,
    overgedragenDefinitief: 0,
    overgedragenVrijgesteld: 0,
    gecompenseerdeVerliezen: 0,
    overgedragenOnbeperkt: 0,
    overgedragenRisicokapitaal: 0,
    meerwaarden25: 200000,
    liquidatiereserve: 0,
    nietTerugbetaalbaar: 0,
    terugbetaalbaar: 0
  };

  // Dummy prepayments
  prepayments = { va1: 0, va2: 0, va3: 0, va4: 0 };
  optimizationGoal: 'spread' | 'q3' | 'q4' = 'spread';

  // Calculation settings
  includeSpecialRates = true;
  applyWithholdings = true;

  // Dummy calculated values
  totalEstimatedTax = 50000;
  majoration = 50000;
  bonification = 0;
  finalBalance = 50000;

  declarationCodes: any[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get<any[]>('assets/declaration-codes.json').subscribe(data => {
      this.declarationCodes = data;
    });
  }

  goToStep(step: number) {
    this.step = step;
  }

  setInputMethod(method: 'manual' | 'previous' | 'upload') {
    this.inputMethod = method;
  }
}
