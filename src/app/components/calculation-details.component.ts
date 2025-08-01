import { Component, Input } from '@angular/core';
import { NgClass, CurrencyPipe, DecimalPipe } from '@angular/common';
import { TaxCalculationResults } from '../services/tax-data.service';
import { LoadingIndicatorComponent } from './loading-indicator.component';

@Component({
  selector: 'app-calculation-details',
  standalone: true,
  imports: [NgClass, CurrencyPipe, DecimalPipe, LoadingIndicatorComponent],
  template: `
    <!-- Cards Section -->
    <div class="bg-white border rounded-xl shadow-sm p-6 mb-6">
      @if (!isLoading && calculationResults) {
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <!-- Vermeerdering Card -->
          <div class="p-4 rounded-lg text-white text-center" [ngClass]="{
            'bg-gray-400': isSmallCompanyFirstThreeYears,
            'bg-teal-400': !isSmallCompanyFirstThreeYears
          }">
            @if (isSmallCompanyFirstThreeYears) {
              <div class="text-lg font-bold">N/A</div>
            }
            @if (!isSmallCompanyFirstThreeYears) {
              <div class="text-2xl font-bold">
                {{ calculationResults.vermeerderingWegensOntoereikendeVoorafbetalingen | currency:'EUR':'symbol':'1.2-2':'nl-BE' }}
              </div>
            }
            <div class="text-sm">Vermeerdering</div>
            @if (isSmallCompanyFirstThreeYears) {
              <div class="text-xs mt-1">(Eerste 3 boekjaren)</div>
            }
          </div>

          <!-- Te Betalen Card -->
          <div class="p-4 bg-teal-400 rounded-lg text-white text-center">
            <div class="text-2xl font-bold">{{ calculationResults.finalTaxDue | currency:'EUR':'symbol':'1.2-2':'nl-BE' }}</div>
            <div class="text-sm">{{ getTaxCardTitle() }}</div>
          </div>
        </div>
      }
      
      <app-loading-indicator [show]="isLoading"></app-loading-indicator>
    </div>
    
    <!-- Detailed Calculation Tables -->
    <div class="bg-white border rounded-xl shadow-sm p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Detail van de berekening</h3>
      <!-- Loading indicator -->
      <app-loading-indicator [show]="isLoading"></app-loading-indicator>

      <!-- Results display -->
      @if (!isLoading) {
        <div class="space-y-6">
          <!-- Berekening section -->
          <div class="border rounded mb-4">
            <table class="min-w-full text-sm">
              <thead>
                <tr class="border-b bg-teal-50">
                  <th class="px-3 py-2 text-left font-medium w-1/2">Berekening</th>
                  <th class="px-3 py-2 text-center font-medium w-16">Code</th>
                  <th class="px-3 py-2 text-right font-medium w-24">Bedrag</th>
                  <th class="px-3 py-2 text-right font-medium w-20">Tarief</th>
                  <th class="px-3 py-2 text-right font-medium w-24">Resultaat</th>
                </tr>
              </thead>
              <tbody>
                @if (!calculationResults || !calculationResults.calculationRows || calculationResults.calculationRows.length === 0) {
                  <tr>
                    <td colspan="5" class="px-3 py-4 text-center text-gray-500">Berekeningen worden geladen...</td>
                  </tr>
                }
                @for (row of calculationResults?.calculationRows; track row) {
                  <tr class="border-b last:border-b-0 hover:bg-teal-50" [ngClass]="{'bg-teal-50': row.description === 'Saldo 1'}">
                    <td class="px-3 py-2 text-sm">{{ row.description }}</td>
                    <td class="px-3 py-2 text-center">{{ row.code }}</td>
                    <td class="px-3 py-2 text-right">{{ row.amount | currency:'EUR':'symbol':'1.2-2':'nl-BE' }}</td>
                    <td class="px-3 py-2 text-right">{{ row.rate !== null ? (row.rate | number:'1.2-2') + '%' : '' }}</td>
                    <td class="px-3 py-2 text-right font-medium">{{ row.result | currency:'EUR':'symbol':'1.2-2':'nl-BE' }}</td>
                  </tr>
                }
                @if (calculationResults) {
                  <tr class="font-bold bg-teal-50 border-t-2">
                    <td class="px-3 py-2" colspan="4">Saldo 1</td>
                    <td class="px-3 py-2 text-right">{{ calculationResults.calculationTotal | currency:'EUR':'symbol':'1.2-2':'nl-BE' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Verrekenbare voorheffingen section -->
          <div class="mb-4">
            <h4 class="text-md font-semibold text-gray-900 mb-2">Verrekenbare voorheffingen</h4>
            <div class="border rounded">
              <table class="min-w-full text-sm">
                <tbody>
                  @if (!calculationResults || !calculationResults.voorheffingenRows || calculationResults.voorheffingenRows.length === 0) {
                    <tr>
                      <td colspan="5" class="px-3 py-4 text-center text-gray-500">Geen voorheffingen</td>
                    </tr>
                  }
                  @for (row of calculationResults?.voorheffingenRows; track row) {
                    <tr [ngClass]="{'bg-teal-50': row.description === 'Saldo 2'}" class="border-b last:border-b-0 hover:bg-teal-50">
                      @if (row.description !== 'Saldo 2') {
                        <td class="px-3 py-2 text-sm w-1/2">{{ row.description }}</td>
                        <td class="px-3 py-2 text-center w-16">{{ row.code }}</td>
                        <td class="px-3 py-2 text-right w-24">&nbsp;</td>
                        <td class="px-3 py-2 text-right w-20">&nbsp;</td>
                        <td class="px-3 py-2 text-right font-medium w-24">{{ row.result | currency:'EUR':'symbol':'1.2-2':'nl-BE' }}</td>
                      } @else {
                        <td class="px-3 py-2 font-bold" colspan="4">{{ row.description }}</td>
                        <td class="px-3 py-2 text-right font-bold">{{ row.result | currency:'EUR':'symbol':'1.2-2':'nl-BE' }}</td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <!-- Vermeerdering en Voorafbetalingen section -->
          <div class="mb-4">
            <h4 class="text-md font-semibold text-gray-900 mb-2">Vermeerdering en Voorafbetalingen</h4>
            <div class="border rounded">
              <table class="min-w-full text-sm">
                <tbody>
                  @if (!calculationResults || !calculationResults.vermeerderingRows || calculationResults.vermeerderingRows.length === 0) {
                    <tr>
                      <td colspan="5" class="px-3 py-4 text-center text-gray-500">Geen vermeerdering berekening</td>
                    </tr>
                  }
                                     @for (row of calculationResults?.vermeerderingRows; track row; let i = $index) {
                     @if (i < 5) {
                       <tr [ngClass]="(row.description.startsWith('Berekening vermeerdering') && row.amount > 0) ? 'border-b last:border-b-0 hover:bg-teal-50 font-bold bg-teal-50' : 'border-b last:border-b-0 hover:bg-teal-50'">
                         <td class="px-3 py-2 text-sm w-1/2" [class.font-bold]="row.description.startsWith('Berekening vermeerdering') && row.amount > 0">{{ row.description }}</td>
                         <td class="px-3 py-2 text-center w-16" [class.font-bold]="row.description.startsWith('Berekening vermeerdering') && row.amount > 0">{{ row.code }}</td>
                         <td class="px-3 py-2 text-right w-24" [class.font-bold]="row.description.startsWith('Berekening vermeerdering') && row.amount > 0">{{ row.amount !== null && row.amount !== undefined ? (row.amount | currency:'EUR':'symbol':'1.2-2':'nl-BE') : '' }}</td>
                         <td class="px-3 py-2 text-right w-20" [class.font-bold]="row.description.startsWith('Berekening vermeerdering') && row.amount > 0">{{ row.rate !== null && row.rate !== undefined ? (row.rate | number:'1.2-2') + '%' : '' }}</td>
                         <td class="px-3 py-2 text-right w-24" [class]="row.description.startsWith('Berekening vermeerdering') && row.amount > 0 ? 'font-bold' : 'font-medium'">{{ row.result !== null && row.result !== undefined ? (row.result | currency:'EUR':'symbol':'1.2-2':'nl-BE') : '' }}</td>
                       </tr>
                     }
                   }
                                     <!-- Totaal aftrek VA row -->
                   @if (hasTotaalAftrekVA()) {
                     <tr>
                       <td colspan="4" class="px-3 py-2 font-bold text-right border-t">Totaal aftrek voorafbetalingen (VA)</td>
                       <td class="px-3 py-2 font-bold text-right text-red-600 border-t">{{ getTotaalAftrekVA() | currency:'EUR':'symbol':'1.2-2':'nl-BE' }}</td>
                     </tr>
                   }
                </tbody>
              </table>
            </div>
                         <!-- Blue box for detailed calculation -->
             @if (hasVermeerderingDetails()) {
               <div class="mt-4 p-4 rounded bg-blue-50 border border-blue-200">
                <div class="flex items-center mb-2 font-semibold text-blue-900">
                  <svg class="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M13 16h-1v-4h-1m1-4h.01"/><circle cx="12" cy="12" r="10"/></svg>
                  Berekening vermeerdering wegens ontoereikende voorafbetalingen
                </div>
                <div class="flex justify-between py-1">
                  <span>Berekening vermeerdering</span>
                  <span>{{ getBerekeningVermeerdering() | currency:'EUR':'symbol':'1.2-2':'nl-BE' }}</span>
                </div>
                <div class="flex justify-between py-1">
                  <span>Aftrek door voorafbetalingen</span>
                  <span>{{ getAftrekDoorVoorafbetalingen() | currency:'EUR':'symbol':'1.2-2':'nl-BE' }}</span>
                </div>
                <div class="flex justify-between py-2 mt-2 border-t border-blue-200 font-bold text-blue-900">
                  <span>Vermeerdering wegens ontoereikende voorafbetalingen</span>
                  <span>{{ getVermeerderingResult() | currency:'EUR':'symbol':'1.2-2':'nl-BE' }}</span>
                </div>
              </div>
            }
                         <!-- Info box for de-minimis or code 1801 -->
             @if (calculationResults?.vermeerderingRows?.[0]?.code === '1801' || isDeMinimisRuleApplied()) {
               <div class="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-900 rounded">
                <div class="font-semibold mb-1">
                  <svg class="w-5 h-5 mr-2 text-yellow-400 inline-block align-text-bottom" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M13 16h-1v-4h-1m1-4h.01"/><circle cx="12" cy="12" r="10"/></svg>
                  Toegepaste maatregel:
                </div>
                @if (calculationResults?.vermeerderingRows?.[0]?.code === '1801') {
                  <span class="font-bold">Kleine vennootschap:</span> Vermeerdering wordt niet toegepast omdat het een kleine vennootschap betreft in de eerste drie boekjaren (code 1801).
                }
                @if (isDeMinimisRuleApplied()) {
                  <span class="font-bold">De-minimis regel:</span> Vermeerdering wordt niet toegepast omdat het berekende bedrag ({{ getVermeerderingBeforeDeMinimis() | currency:'EUR':'symbol':'1.2-2':'nl-BE' }}) kleiner is dan €50,00.
                }
              </div>
            }
          </div>

          <!-- Resultaat section -->
          <div class="mb-4">
            <h4 class="text-md font-semibold text-gray-900 mb-2">Resultaat</h4>
            <div class="border rounded">
              <table class="min-w-full text-sm">
                <tbody>
                  @if (!calculationResults || !calculationResults.resultRows || calculationResults.resultRows.length === 0) {
                    <tr>
                      <td colspan="5" class="px-3 py-4 text-center text-gray-500">Geen resultaten</td>
                    </tr>
                  }
                                     @for (row of calculationResults?.resultRows; track row; let i = $index) {
                     @if (i < 3) {
                       <tr [ngClass]="{'bg-teal-50': row.description === 'Saldo 2'}" class="border-b last:border-b-0 hover:bg-teal-50">
                         <td class="px-3 py-2 text-sm w-1/2" [class.font-bold]="row.description === 'Saldo 2'">{{ row.description }}</td>
                         <td colspan="4" class="px-3 py-2 text-right font-medium w-24" [class.font-bold]="row.description === 'Saldo 2'">{{ row.result | currency:'EUR':'symbol':'1.2-2':'nl-BE' }}</td>
                       </tr>
                     }
                     @if (i === 3) {
                       <tr class="border-b last:border-b-0 hover:bg-teal-50">
                         <td class="px-3 py-2 text-sm w-1/2">{{ row.description }}</td>
                         <td class="px-3 py-2 text-center w-16">{{ row.code }}</td>
                         <td class="px-3 py-2 text-right w-24">{{ row.amount | currency:'EUR':'symbol':'1.2-2':'nl-BE' }}</td>
                         <td class="px-3 py-2 text-right w-20">{{ row.rate !== null ? (row.rate | number:'1.2-2') + '%' : '' }}</td>
                         <td class="px-3 py-2 text-right font-medium w-24">{{ row.result | currency:'EUR':'symbol':'1.2-2':'nl-BE' }}</td>
                       </tr>
                     }
                   }
                </tbody>
              </table>
            </div>
            <div class="flex justify-between items-center mt-3 p-3 border-t-2 border-gray-300 bg-teal-50 rounded-b text-lg font-bold text-gray-900">
              <span>{{ getTaxCardTitle() }}</span>
              <span>{{ (calculationResults?.finalTaxPayable || 0) | currency:'EUR':'symbol':'1.2-2':'nl-BE' }}</span>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class CalculationDetailsComponent {
  @Input() calculationResults: TaxCalculationResults | null = null;
  @Input() isLoading: boolean = false;
  @Input() isSmallCompanyFirstThreeYears: boolean = false;

  // Type-safe getters for vermeerdering values
  getTotaalAftrekVA(): number {
    return this.calculationResults?.vermeerderingRows?.[5]?.result ?? 0;
  }

  getBerekeningVermeerdering(): number {
    return this.calculationResults?.vermeerderingRows?.[0]?.result ?? 0;
  }

  getAftrekDoorVoorafbetalingen(): number {
    return this.calculationResults?.vermeerderingRows?.[6]?.result ?? 0;
  }

  getVermeerderingResult(): number {
    return this.calculationResults?.vermeerderingRows?.[7]?.result ?? 0;
  }

  hasTotaalAftrekVA(): boolean {
    return (this.calculationResults?.vermeerderingRows?.length ?? 0) > 5;
  }

  hasVermeerderingDetails(): boolean {
    return (this.calculationResults?.vermeerderingRows?.length ?? 0) > 7;
  }

  // Check if de-minimis rule is applied (final result is 0 but before de-minimis it was > 0)
  isDeMinimisRuleApplied(): boolean {
    if (!this.calculationResults?.vermeerderingRows || this.calculationResults.vermeerderingRows.length < 8) {
      return false;
    }
    
    // Check if the calculated vermeerdering before de-minimis is > 0 but final total is 0
    const vermeerderingBeforeDeMinimis = this.calculationResults.vermeerderingRows[7]?.result ?? 0;
    const finalVermeerderingTotal = this.calculationResults.vermeerderingTotal ?? 0;
    
    return vermeerderingBeforeDeMinimis > 0 && finalVermeerderingTotal === 0;
  }

  getVermeerderingBeforeDeMinimis(): number {
    return this.calculationResults?.vermeerderingRows?.[7]?.result ?? 0;
  }

  getTaxCardTitle(): string {
    if (!this.calculationResults) {
      return 'Te betalen belastingen';
    }
    
    if (this.calculationResults.finalTaxPayable < 0) {
      return 'Terug te vorderen';
    } else if (this.calculationResults.finalTaxPayable === 0) {
      return 'Geen belasting verschuldigd';
    } else {
      return 'Te betalen belastingen';
    }
  }
}