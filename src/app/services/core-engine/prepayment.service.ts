import { Injectable, inject } from '@angular/core';
import { Prepayments, PrepaymentCalculationGoal, PrepaymentConcentration, PrepaymentStrategy } from '@app/services/types/tax-data.types';
import { LoggingService } from '@app/services/utils/logging.service';
import { TaxError, TaxErrorCodes } from '@app/services/types/tax-error';
import { 
  TAX_CONSTANTS, 
  getTaxYearParameters,
  getQuarterlyRates,
  getVermeerderingsPercentage
} from './parameters';

@Injectable({
  providedIn: 'root'
})
export class PrepaymentService {
  private logger = inject(LoggingService);

  /**
   * Clamps prepayment values to ensure they are non-negative
   */
  private clampPrepayments(p: Prepayments): Prepayments {
    return {
      va1: Math.max(0, p.va1),
      va2: Math.max(0, p.va2),
      va3: Math.max(0, p.va3),
      va4: Math.max(0, p.va4),
    };
  }

  calculateSuggestedPrepayments(
    goal: PrepaymentCalculationGoal,
    taxIncreaseBase: number,
    separateAssessment: number,
    isSmallCompany: boolean,
    concentration: PrepaymentConcentration = 'spread',
    taxYear: string = '2025'
  ): Prepayments {
    try {
      this.logger.debug('Calculating suggested prepayments', {
        goal,
        taxIncreaseBase,
        separateAssessment,
        isSmallCompany,
        concentration
      });

      // If concentration is 'none', return zero prepayments
      if (concentration === 'none') {
        this.logger.info('Concentration is none, returning zero prepayments');
        return { va1: 0, va2: 0, va3: 0, va4: 0 };
      }

      // If it's a small company in first 3 years, no increase is due
      if (goal === 'GeenVermeerdering' && isSmallCompany) {
        this.logger.info('Small company in first 3 years, returning zero prepayments');
        return { va1: 0, va2: 0, va3: 0, va4: 0 };
      }

      let result: Prepayments;

      const params = getTaxYearParameters(taxYear);
      const quarterlyRates = getQuarterlyRates(taxYear);
      
      switch (goal) {
        case 'GeenVermeerdering': {
          // Calculate base increase amount (9% of tax increase base)
          const baseVermeerdering = Math.max(0, taxIncreaseBase * params.STANDARD_INCREASE_RATE); // 0.09 (9%)
          
          switch (concentration) {
            case 'q1':
              // All prepayment in Q1: baseVermeerdering / 12% = baseVermeerdering / 0.12
              result = this.clampPrepayments({ va1: baseVermeerdering / quarterlyRates.Q1, va2: 0, va3: 0, va4: 0 });
              break;
            case 'q2':
              // All prepayment in Q2: baseVermeerdering / 10% = baseVermeerdering / 0.10
              result = this.clampPrepayments({ va1: 0, va2: baseVermeerdering / quarterlyRates.Q2, va3: 0, va4: 0 });
              break;
            case 'q3':
              // All prepayment in Q3: baseVermeerdering / 8% = baseVermeerdering / 0.08
              result = this.clampPrepayments({ va1: 0, va2: 0, va3: baseVermeerdering / quarterlyRates.Q3, va4: 0 });
              break;
            case 'q4':
              // All prepayment in Q4: baseVermeerdering / 6% = baseVermeerdering / 0.06
              result = this.clampPrepayments({ va1: 0, va2: 0, va3: 0, va4: baseVermeerdering / quarterlyRates.Q4 });
              break;
            case 'spread':
            default: {
              // Spread evenly across all quarters: baseVermeerdering / 36% = baseVermeerdering / 0.36
              const p = baseVermeerdering / quarterlyRates.TOTAL; // 0.36 (36% total)
              result = this.clampPrepayments({ va1: p, va2: p, va3: p, va4: p });
            }
          }
          break;
        }

        case 'SaldoNul': {
          const saldo2 = taxIncreaseBase;
          const result1508 = separateAssessment;
          // Calculate base increase amount (9% of saldo2)
          const mBase = Math.max(0, saldo2 * params.STANDARD_INCREASE_RATE); // 0.09 (9%)

          /**
           * Solves for the prepayment amount that results in zero tax balance
           * @param dRate - The quarterly rate (Q1: 12%, Q2: 10%, Q3: 8%, Q4: 6%)
           * @returns The calculated prepayment amount
           */
          function solvePrepayment(dRate: number): number {
            const thresh = (saldo2 + result1508);
            if (thresh * dRate >= mBase) {
              return thresh;
            }
            return (saldo2 + result1508 + mBase) / (1 + dRate);
          }

          switch (concentration) {
            case 'q1': {
              // All prepayment in Q1 using 12% rate
              const P = solvePrepayment(quarterlyRates.Q1); // 0.12 (12%)
              result = this.clampPrepayments({ va1: P, va2: 0, va3: 0, va4: 0 });
              break;
            }
            case 'q2': {
              // All prepayment in Q2 using 10% rate
              const P = solvePrepayment(quarterlyRates.Q2); // 0.10 (10%)
              result = this.clampPrepayments({ va1: 0, va2: P, va3: 0, va4: 0 });
              break;
            }
            case 'q3': {
              // All prepayment in Q3 using 8% rate
              const P = solvePrepayment(quarterlyRates.Q3); // 0.08 (8%)
              result = this.clampPrepayments({ va1: 0, va2: 0, va3: P, va4: 0 });
              break;
            }
            case 'q4': {
              // All prepayment in Q4 using 6% rate
              const P = solvePrepayment(quarterlyRates.Q4); // 0.06 (6%)
              result = this.clampPrepayments({ va1: 0, va2: 0, va3: 0, va4: P });
              break;
            }
            case 'spread':
            default: {
              // Spread across all quarters using total rate of 36%
              const dRateTotal = quarterlyRates.TOTAL; // 0.36 (36% total)
              const T = solvePrepayment(dRateTotal);
              const P = T / 4; // Divide total by 4 quarters
              result = this.clampPrepayments({ va1: P, va2: P, va3: P, va4: P });
            }
          }
          break;
        }
        
        default:
          this.logger.warn('Unknown prepayment goal, returning zero prepayments', { goal });
          result = { va1: 0, va2: 0, va3: 0, va4: 0 };
      }

      this.logger.debug('Calculated suggested prepayments', { result });
      return result;

    } catch (error) {
      this.logger.error('Failed to calculate suggested prepayments', error as Error);
      throw new TaxError(
        'Failed to calculate suggested prepayments',
        TaxErrorCodes.PREPAYMENT.CALCULATION_FAILED,
        { error, goal, taxIncreaseBase, separateAssessment, isSmallCompany, concentration }
      );
    }
  }

  calculateOptimalPrepayments(
    currentPrepayments: Prepayments,
    strategy: PrepaymentStrategy,
    requiredAmount: number
  ): Prepayments {
    try {
      this.logger.debug('Calculating optimal prepayments', {
        currentPrepayments,
        strategy,
        requiredAmount
      });

      // If required amount is 0, return all zeros regardless of strategy
      if (requiredAmount === 0) {
        return { va1: 0, va2: 0, va3: 0, va4: 0 };
      }

      const totalCurrent = this.calculateTotalPrepayments(currentPrepayments);
      const remaining = Math.max(0, requiredAmount - totalCurrent);
      
      // Start with all zeros and only fill what's needed based on strategy
      let optimized = { va1: 0, va2: 0, va3: 0, va4: 0 };
      
      switch (strategy) {
        case 'spread': {
          const perQuarter = remaining / 4;
          optimized = { va1: perQuarter, va2: perQuarter, va3: perQuarter, va4: perQuarter };
          break;
        }
        case 'q1':
          optimized.va1 = remaining;
          break;
        case 'q2':
          optimized.va2 = remaining;
          break;
        case 'q3':
          optimized.va3 = remaining;
          break;
        case 'q4':
          optimized.va4 = remaining;
          break;
        default:
          throw new TaxError(
            'Invalid prepayment strategy',
            TaxErrorCodes.PREPAYMENT.INVALID_STRATEGY,
            { strategy }
          );
      }

      this.logger.debug('Calculated optimal prepayments', { optimized });
      return optimized;

    } catch (error) {
      this.logger.error('Failed to calculate optimal prepayments', error as Error);
      throw new TaxError(
        'Failed to calculate optimal prepayments',
        TaxErrorCodes.PREPAYMENT.CALCULATION_FAILED,
        { error, currentPrepayments, strategy, requiredAmount }
      );
    }
  }

  calculateTotalPrepayments(prepayments: Prepayments): number {
    return prepayments.va1 + prepayments.va2 + prepayments.va3 + prepayments.va4;
  }
}