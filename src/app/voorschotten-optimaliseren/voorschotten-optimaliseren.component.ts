import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgFor, CurrencyPipe, NgIf, NgClass } from '@angular/common';
import { TaxDataService, Prepayments, PrepaymentStrategy, TaxCalculationResults } from '../services/tax-data.service';
import { FormattedNumberInputComponent } from '../components/formatted-number-input.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-voorschotten-optimaliseren',
  standalone: true,
  imports: [FormsModule, NgFor, CurrencyPipe, NgIf, NgClass, FormattedNumberInputComponent],
  templateUrl: './voorschotten-optimaliseren.component.html',
  styleUrl: './voorschotten-optimaliseren.component.css'
})
export class VoorschottenOptimaliserenComponent implements OnInit, OnDestroy {
  prepayments: Prepayments = { va1: 0, va2: 0, va3: 0, va4: 0 };
  prepaymentStrategy: PrepaymentStrategy = 'spread';
  calculationResults: TaxCalculationResults | null = null;
  isLoading = false;

  optimizationOptions = [
    { value: 'spread', label: 'VA verdelen over de 4 kwartalen' },
    { value: 'q1', label: 'Voorafbetaling eerste kwartaal' },
    { value: 'q2', label: 'Voorafbetaling tweede kwartaal' },
    { value: 'q3', label: 'Voorafbetaling derde kwartaal' },
    { value: 'q4', label: 'Voorafbetaling vierde kwartaal' }
  ];

  quarters: (keyof Prepayments)[] = ['va1', 'va2', 'va3', 'va4'];
  quarterLabels = ['voor 10 april', 'voor 10 juli', 'voor 10 oktober', 'voor 20 december'];

  private dataSubscription?: Subscription;
  private resultsSubscription?: Subscription;
  private loadingSubscription?: Subscription;

  constructor(private taxDataService: TaxDataService) {}

  ngOnInit(): void {
    // Subscribe to data changes
    this.dataSubscription = this.taxDataService.data$.subscribe(data => {
      if (data) {
        this.prepayments = data.prepayments;
        this.prepaymentStrategy = data.prepaymentStrategy;
      }
    });

    // Subscribe to calculation results
    this.resultsSubscription = this.taxDataService.results$.subscribe(results => {
      this.calculationResults = results;
    });

    // Subscribe to loading state
    this.loadingSubscription = this.taxDataService.isLoading$.subscribe(isLoading => {
      this.isLoading = isLoading;
    });
  }

  ngOnDestroy(): void {
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }
    if (this.resultsSubscription) {
      this.resultsSubscription.unsubscribe();
    }
    if (this.loadingSubscription) {
      this.loadingSubscription.unsubscribe();
    }
  }

  onPrepaymentChange(quarter: keyof Prepayments, value: number): void {
    this.prepayments[quarter] = value;
    this.taxDataService.updatePrepayments(this.prepayments);
  }

  onOptimizationGoalChange(): void {
    this.taxDataService.updatePrepaymentStrategy(this.prepaymentStrategy);
  }

  applySuggestedPrepayments(): void {
    if (this.calculationResults?.suggestedPrepayments) {
      this.prepayments = { ...this.calculationResults.suggestedPrepayments };
      this.taxDataService.updatePrepayments(this.prepayments);
    }
  }
}
