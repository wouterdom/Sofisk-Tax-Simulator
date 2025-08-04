import { Directive, OnInit, OnDestroy, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { MainCalculationEngineService } from '../services/core-engine/main-calculation-engine.service';
import { TaxData, TaxCalculationResults } from '../services/tax-data.types';

/**
 * Base class for components that need to subscribe to TaxDataService observables.
 * Handles common subscription patterns and lifecycle management.
 */
@Directive()
export abstract class BaseTaxComponent implements OnInit, OnDestroy {
  protected calculationResults: TaxCalculationResults | null = null;
  protected isLoading = false;
  protected taxData: TaxData | null = null;
  
  private dataSubscription?: Subscription;
  private resultsSubscription?: Subscription;
  private loadingSubscription?: Subscription;

  protected taxDataService = inject(MainCalculationEngineService);

  ngOnInit(): void {
    this.setupSubscriptions();
    this.onInit();
  }

  ngOnDestroy(): void {
    this.dataSubscription?.unsubscribe();
    this.resultsSubscription?.unsubscribe();
    this.loadingSubscription?.unsubscribe();
    this.onDestroy();
  }

  private setupSubscriptions(): void {
    this.dataSubscription = this.taxDataService.data$.subscribe(data => {
      this.taxData = data;
      this.handleDataChange(data);
    });
    
    this.resultsSubscription = this.taxDataService.results$.subscribe(results => {
      this.calculationResults = results;
      this.handleResultsChange(results);
    });
    
    this.loadingSubscription = this.taxDataService.isLoading$.subscribe(isLoading => {
      this.isLoading = isLoading;
      this.handleLoadingChange(isLoading);
    });
  }

  /**
   * Hooks for subclasses to react to data, results, or loading changes, and to perform extra init/cleanup.
   * Override these in child components as needed.
   *
   * - handleDataChange: Called when tax data changes
   * - handleResultsChange: Called when calculation results change
   * - handleLoadingChange: Called when loading state changes
   * - onInit: Called after subscriptions are set up (ngOnInit)
   * - onDestroy: Called before subscriptions are cleaned up (ngOnDestroy)
   * - triggerCalculation: Utility to trigger recalculation (by updating sections or prepayments)
   */
  protected handleDataChange(data: TaxData | null): void {}
  protected handleResultsChange(results: TaxCalculationResults | null): void {}
  protected handleLoadingChange(isLoading: boolean): void {}
  protected onInit(): void {}
  protected onDestroy(): void {}
  protected triggerCalculation(): void {
    // No direct calculateTax method; update sections or prepayments to trigger recalculation
    // Example: this.taxDataService.updateDeclarationSections([...]);
    // or: this.taxDataService.updatePrepayments({...});
  }
}