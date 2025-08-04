import { Component, OnInit, OnDestroy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MainCalculationEngineService } from '../services/core-engine/main-calculation-engine.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class HeaderComponent implements OnInit, OnDestroy {
  lastSaved: Date = new Date();
  private dataSubscription?: Subscription;

  constructor(private taxDataService: MainCalculationEngineService) {}

  ngOnInit(): void {
    // Subscribe to data changes to get last saved date
    this.dataSubscription = this.taxDataService.data$.subscribe(data => {
      if (data) {
        this.lastSaved = data.lastUpdated;
      }
    });
  }

  ngOnDestroy(): void {
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }
  }

  resetData(): void {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      // Store current step before clearing data
      const currentStep = localStorage.getItem('sofisk_current_step');
      
      // Reset to defaults (this will clear all data and set default values)
      this.taxDataService.resetToDefaults();
      
      // Restore the current step if it exists
      if (currentStep) {
        localStorage.setItem('sofisk_current_step', currentStep);
      }
    }
  }
}
