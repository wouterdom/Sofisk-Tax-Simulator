import { Component, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Prepayments, PrepaymentConcentration, TaxData, TaxCalculationResults } from '../services/tax-data.types';
import { PrepaymentCalculationGoal } from '../services/tax-enums';

// Make enum available in the template
const PREPAYMENT_GOAL = PrepaymentCalculationGoal;
import { CalculationDetailsComponent } from '../components/calculation-details.component';
import { BaseTaxComponent } from '../components/base-tax.component';
import { VoorafbetalingenComponent } from '../components/voorafbetalingen.component';
import { UIClassDirective } from '../components/ui-classes.directive';

@Component({
  selector: 'app-voorschotten-optimaliseren',
  standalone: true,
  imports: [FormsModule, CalculationDetailsComponent, VoorafbetalingenComponent, UIClassDirective],
  templateUrl: './voorschotten-optimaliseren.component.html',
  styleUrl: './voorschotten-optimaliseren.component.css'
})
export class VoorschottenOptimaliserenComponent extends BaseTaxComponent {
  // --- Component State ---
  public prepayments: Prepayments = { va1: 0, va2: 0, va3: 0, va4: 0 };
  public calculationGoal: PrepaymentCalculationGoal = PREPAYMENT_GOAL.GeenVermeerdering;
  public readonly PREPAYMENT_GOAL = PREPAYMENT_GOAL; // Make enum available in template
  public prepaymentConcentration: PrepaymentConcentration = 'spread';
  public isSmallCompanyFirstThreeYears = false;

  constructor(private cdr: ChangeDetectorRef) {
    super();
  }
  


  // Expose object keys for type-safe iteration in the template
  public prepaymentKeys: (keyof Prepayments)[] = ['va1', 'va2', 'va3', 'va4'];
  
  // To hold the original prepayments from the service (from step 2)
  public originalPrepayments: Prepayments = { va1: 0, va2: 0, va3: 0, va4: 0 };
  
  // Track if prepayments have been modified
  public hasModifiedPrepayments = false;

  public showCommitDialog: boolean = false;
  private commitCallback: ((proceed: boolean) => void) | null = null;

  protected override onInit(): void {
    // Always get the last committed values for the original column
    this.originalPrepayments = this.taxDataService.getCommittedPrepayments();
    
    // Trigger an initial calculation to ensure simulation values are calculated immediately
    const currentData = this.taxDataService.getData();
    if (currentData) {
      // Force a recalculation by updating the prepayment calculation goal
      // This will trigger the reactive calculation system
      this.taxDataService.updatePrepaymentCalculationGoal(currentData.prepaymentCalculationGoal);
    }
  }

  protected override handleDataChange(data: TaxData | null): void {
    if (data) {
      // Update the simulation prepayments based on the current state.
      // Always reflect the goal and concentration from the service.
      this.calculationGoal = data.prepaymentCalculationGoal;
      this.prepaymentConcentration = data.prepaymentConcentration;
      this.isSmallCompanyFirstThreeYears = data.isSmallCompanyFirstThreeYears;
      this.checkIfModified();
    }
  }

  protected override handleResultsChange(results: TaxCalculationResults | null): void {
    if (results) {
      console.log('Results changed, suggested prepayments:', results.suggestedPrepayments);
      const currentData = this.taxDataService.getData();
      
      let newPrepayments: Prepayments;
      
      if (currentData?.prepaymentCalculationGoal === PrepaymentCalculationGoal.SaldoNul) {
        // For "Saldo belasting = 0", use the suggested prepayments
        newPrepayments = results.suggestedPrepayments;
      } else {
        // For other cases, get values from vermeerderingRows
        const va1Row = results.vermeerderingRows.find(r => r.code === '1811');
        const va2Row = results.vermeerderingRows.find(r => r.code === '1812');
        const va3Row = results.vermeerderingRows.find(r => r.code === '1813');
        const va4Row = results.vermeerderingRows.find(r => r.code === '1814');
        
        newPrepayments = {
          va1: va1Row?.amount || 0,
          va2: va2Row?.amount || 0,
          va3: va3Row?.amount || 0,
          va4: va4Row?.amount || 0
        };
      }

      // Only update if values actually changed to prevent loops
      if (JSON.stringify(this.prepayments) !== JSON.stringify(newPrepayments)) {
        this.prepayments = { ...newPrepayments };
        
        // Reset manual changes flag when new calculated results come in
        // (unless user is currently in edit mode)
        this.checkIfModified();
        // Force change detection to update the UI immediately
        this.cdr.detectChanges();
      }
    }
  }

  // --- Event Handlers for UI ---

  /**
   * Handles changes from the "Resultaat berekening" radio buttons.
   * This tells the service to start using a calculation strategy.
   */
  public handleCalculationGoalChange(): void {
    console.log('Calculation goal changed to:', this.calculationGoal);
    
    // When switching to "Geen vermeerdering", reset prepayments to 0
    if (this.calculationGoal === PrepaymentCalculationGoal.GeenVermeerdering && this.isSmallCompanyFirstThreeYears) {
      this.prepayments = { va1: 0, va2: 0, va3: 0, va4: 0 };
      this.taxDataService.updatePrepayments(this.prepayments, false);
    }
    
    this.taxDataService.updatePrepaymentCalculationGoal(this.calculationGoal);
    // Single change detection is sufficient
    this.cdr.detectChanges();
  }


  
  /**
   * Handles changes from the concentration options.
   */
  public handleConcentrationChange(): void {
    console.log('Concentration changed to:', this.prepaymentConcentration);
    this.taxDataService.updatePrepaymentConcentration(this.prepaymentConcentration);
    // Single change detection is sufficient
    this.cdr.detectChanges();
  }

  public onPrepaymentsDataChange(newData: Prepayments): void {
    this.prepayments = { ...newData };
    this.taxDataService.updatePrepayments(this.prepayments, false);
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
    // Also update the service to ensure calculation results are reset
    this.taxDataService.updatePrepayments(this.prepayments, false);
    this.taxDataService.stopUsingSuggestedPrepayments();
    this.checkIfModified();
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
  public getResultRow(code: string, descriptionPrefix: string): { code: string; description: string; amount: number; rate: number | null; result: number; } | undefined {
    return this.calculationResults?.resultRows.find(
      row => row.code === code && row.description.startsWith(descriptionPrefix)
    );
  }

  public getVermeerderingRow(descriptionPrefix: string): { code: string; description: string; amount: number; rate: number | null; result: number; } | undefined {
    return this.calculationResults?.vermeerderingRows.find(
        row => row.description.startsWith(descriptionPrefix)
    );
  }


}
