import { Injectable } from '@angular/core';
import { Prepayments, PrepaymentCalculationGoal, PrepaymentConcentration, PrepaymentStrategy } from '@app/services/tax-data.types';
import { LoggingService } from '@app/services/logging.service';
import { TaxError, TaxErrorCodes } from '@app/services/tax-error';

@Injectable({
  providedIn: 'root'
})
export class PrepaymentService {
  constructor(private logger: LoggingService) {}

  calculateSuggestedPrepayments(
    goal: PrepaymentCalculationGoal,
    taxIncreaseBase: number,
    separateAssessment: number,
    isSmallCompany: boolean,
    concentration: PrepaymentConcentration = 'spread'
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

      function clampPrepayments(p: Prepayments): Prepayments {
        return {
          va1: Math.max(0, p.va1),
          va2: Math.max(0, p.va2),
          va3: Math.max(0, p.va3),
          va4: Math.max(0, p.va4),
        };
      }

      let result: Prepayments;

      switch (goal) {
        case 'GeenVermeerdering': {
          const baseVermeerdering = Math.max(0, taxIncreaseBase * 0.09);
          
          switch (concentration) {
            case 'q1':
              result = clampPrepayments({ va1: baseVermeerdering / 0.12, va2: 0, va3: 0, va4: 0 });
              break;
            case 'q2':
              result = clampPrepayments({ va1: 0, va2: baseVermeerdering / 0.10, va3: 0, va4: 0 });
              break;
            case 'q3':
              result = clampPrepayments({ va1: 0, va2: 0, va3: baseVermeerdering / 0.08, va4: 0 });
              break;
            case 'q4':
              result = clampPrepayments({ va1: 0, va2: 0, va3: 0, va4: baseVermeerdering / 0.06 });
              break;
            case 'spread':
            default:
              const p = baseVermeerdering / 0.36;
              result = clampPrepayments({ va1: p, va2: p, va3: p, va4: p });
          }
          break;
        }

        case 'SaldoNul': {
          const saldo2 = taxIncreaseBase;
          const result1508 = separateAssessment;
          const mBase = Math.max(0, saldo2 * 0.09);

          function solvePrepayment(dRate: number): number {
            const thresh = (saldo2 + result1508);
            if (thresh * dRate >= mBase) {
              return thresh;
            }
            return (saldo2 + result1508 + mBase) / (1 + dRate);
          }

          switch (concentration) {
            case 'q1': {
              const P = solvePrepayment(0.12);
              result = clampPrepayments({ va1: P, va2: 0, va3: 0, va4: 0 });
              break;
            }
            case 'q2': {
              const P = solvePrepayment(0.10);
              result = clampPrepayments({ va1: 0, va2: P, va3: 0, va4: 0 });
              break;
            }
            case 'q3': {
              const P = solvePrepayment(0.08);
              result = clampPrepayments({ va1: 0, va2: 0, va3: P, va4: 0 });
              break;
            }
            case 'q4': {
              const P = solvePrepayment(0.06);
              result = clampPrepayments({ va1: 0, va2: 0, va3: 0, va4: P });
              break;
            }
            case 'spread':
            default: {
              const dRateTotal = 0.36;
              const T = solvePrepayment(dRateTotal);
              const P = T / 4;
              result = clampPrepayments({ va1: P, va2: P, va3: P, va4: P });
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