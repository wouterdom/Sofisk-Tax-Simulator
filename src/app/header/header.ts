import { Component, OnInit, OnDestroy } from '@angular/core';
import { NgIf, DatePipe } from '@angular/common';
import { TaxDataService } from '../services/tax-data.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  imports: [NgIf, DatePipe],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class Header implements OnInit, OnDestroy {
  lastSaved: Date = new Date();
  private dataSubscription?: Subscription;

  constructor(private taxDataService: TaxDataService) {}

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
      this.taxDataService.clearData();
      // Refresh the page after clearing data
      window.location.reload();
    }
  }
}
