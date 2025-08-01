import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgFor, CurrencyPipe, NgIf, NgClass, SlicePipe } from '@angular/common';
import { TaxDataService, Prepayments, PrepaymentCalculationGoal, PrepaymentConcentration, TaxCalculationResults, TaxData } from '../services/tax-data.service';
import { FormattedNumberInputComponent } from '../components/formatted-number-input.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-voorschotten-optimaliseren',
  standalone: true,
  imports: [FormsModule, NgFor, CurrencyPipe, NgIf, NgClass, FormattedNumberInputComponent, SlicePipe],
  templateUrl: './voorschotten-optimaliseren.component.html',
  styleUrl: './voorschotten-optimaliseren.component.css'
})
export class VoorschottenOptimaliserenComponent implements OnInit, OnDestroy {
  // --- Component State ---
  public prepayments: Prepayments = { va1: 0, va2: 0, va3: 0, va4: 0 };
  public calculationGoal: PrepaymentCalculationGoal = 'GeenVermeerdering';
  public prepaymentConcentration: PrepaymentConcentration = 'spread';
  
  public calculationResults: TaxCalculationResults | null = null;
  public isLoading = false;

  // Expose object keys for type-safe iteration in the template
  public prepaymentKeys: (keyof Prepayments)[] = ['va1', 'va2', 'va3', 'va4'];
  
  // To hold the original prepayments from the service (from step 2)
  public originalPrepayments: Prepayments = { va1: 0, va2: 0, va3: 0, va4: 0 };
  
  // Track if prepayments have been modified
  public hasModifiedPrepayments = false;

  // --- Subscriptions ---
  private dataSubscription?: Subscription;
  private resultsSubscription?: Subscription;
  private loadingSubscription?: Subscription;

  public showCommitDialog: boolean = false;
  private commitCallback: ((proceed: boolean) => void) | null = null;

  constructor(public taxDataService: TaxDataService) {}

  ngOnInit(): void {
    // Always get the last committed values for the original column
    this.originalPrepayments = this.taxDataService.getCommittedPrepayments();
    this.subscribeToData();
    this.subscribeToResults();
    this.subscribeToLoading();
  }

  ngOnDestroy(): void {
    this.dataSubscription?.unsubscribe();
    this.resultsSubscription?.unsubscribe();
    this.loadingSubscription?.unsubscribe();
  }

  // --- Subscription Handlers ---
  private subscribeToData(): void {
    this.dataSubscription = this.taxDataService.data$.subscribe(data => {
      if (data) {
        // Update the simulation prepayments based on the current state.
        // Always reflect the goal and concentration from the service.
        this.calculationGoal = data.prepaymentCalculationGoal;
        this.prepaymentConcentration = data.prepaymentConcentration;
        this.checkIfModified();
      }
    });
  }

  private subscribeToResults(): void {
    this.resultsSubscription = this.taxDataService.results$.subscribe(results => {
      if (results) {
        this.calculationResults = results;
        // Only update prepayments from results if we're using suggested prepayments
        const currentData = this.taxDataService.getData();
        if (currentData?.useSuggestedPrepayments) {
          this.prepayments = { ...results.suggestedPrepayments };
        }
      }
    });
  }

  private subscribeToLoading(): void {
    this.loadingSubscription = this.taxDataService.isLoading$.subscribe(isLoading => {
      this.isLoading = isLoading;
    });
  }

  // --- Event Handlers for UI ---

  /**
   * Handles changes from the "Resultaat berekening" radio buttons.
   * This tells the service to start using a calculation strategy.
   */
  public handleCalculationGoalChange(): void {
    this.taxDataService.updatePrepaymentCalculationGoal(this.calculationGoal);
  }
  
  /**
   * Handles changes from the concentration options.
   */
  public handleConcentrationChange(): void {
    this.taxDataService.updatePrepaymentConcentration(this.prepaymentConcentration);
  }

  /**
   * Handles manual input into one of the prepayment fields (VA1-VA4).
   * This tells the service to stop using suggestions and use these manual values instead.
   */
  public handlePrepaymentInputChange(): void {
    // Update the service with the new manual values.
    // The `false` flag indicates this is a manual override, not a suggestion.
    this.taxDataService.updatePrepayments({ ...this.prepayments }, false);
    
    // Check if prepayments have been modified compared to original
    this.checkIfModified();
  }
  
  /**
   * Check if current prepayments differ from original
   */
  private checkIfModified(): void {
    this.hasModifiedPrepayments = 
      this.prepayments.va1 !== this.originalPrepayments.va1 ||
      this.prepayments.va2 !== this.originalPrepayments.va2 ||
      this.prepayments.va3 !== this.originalPrepayments.va3 ||
      this.prepayments.va4 !== this.originalPrepayments.va4;
  }
  
  /**
   * Called before navigating away - returns true if navigation should proceed
   */
  public canDeactivate(): boolean {
    if (this.hasModifiedPrepayments) {
      const confirmSave = confirm(
        'De waarden in de voorafbetalingen verschillen met wat u in stap 2 heeft ingevuld, wenst u de waarden te overschrijven?'
      );
      
      if (confirmSave) {
        // If confirmed, update the service with the simulation values and commit them.
        this.taxDataService.updatePrepayments(this.prepayments, false);
        this.taxDataService.commitPrepayments();
        // Update the originalPrepayments for the next time this screen is loaded
        this.originalPrepayments = this.taxDataService.getCommittedPrepayments();
      }
      // If not confirmed, the original values in the service remain untouched.
    }
    return true; // Always allow navigation.
  }

  public revertSimulationToCommitted(): void {
    this.prepayments = this.taxDataService.getCommittedPrepayments();
  }

  public confirmAndCommitIfNeeded(callback?: (commit: boolean) => void): boolean {
    const orig = this.originalPrepayments;
    const sim = this.prepayments;
    const differs = orig.va1 !== sim.va1 || orig.va2 !== sim.va2 || orig.va3 !== sim.va3 || orig.va4 !== sim.va4;
    if (differs) {
      this.showCommitDialog = true;
      this.commitCallback = callback || null;
      return callback ? false : false; // Always block navigation until dialog
    }
    if (callback) callback(true);
    return true;
  }
  
  public handleCommitDialogResult(proceed: boolean): void {
    this.showCommitDialog = false;
    if (proceed) {
      this.taxDataService.updatePrepayments(this.prepayments, false);
      this.taxDataService.commitPrepayments();
      this.originalPrepayments = this.taxDataService.getCommittedPrepayments();
    }
    if (this.commitCallback) {
      this.commitCallback(proceed);
      this.commitCallback = null;
    }
  }
  
  /**
   * Helper to get a specific row from the calculation results for display.
   */
  public getResultRow(code: string, descriptionPrefix: string): any {
    return this.calculationResults?.resultRows.find(
      row => row.code === code && row.description.startsWith(descriptionPrefix)
    );
  }

  public getVermeerderingRow(descriptionPrefix: string): any {
    return this.calculationResults?.vermeerderingRows.find(
        row => row.description.startsWith(descriptionPrefix)
    );
  }
}
