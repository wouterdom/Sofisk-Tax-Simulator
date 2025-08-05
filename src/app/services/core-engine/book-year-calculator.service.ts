import { Injectable } from '@angular/core';
import { getTaxYearParameters, getQuarterlyRates, getVermeerderingsPercentage } from './parameters';

export interface BookYearInfo {
  startDate: Date;
  endDate: Date;
  durationInMonths: number;
  durationInDays: number;
  isShortBookYear: boolean;
  isLongBookYear: boolean;
  isNormalBookYear: boolean;
  quartersInBookYear: number;
}

export interface ShortBookYearPrepaymentRules {
  numberOfPrepayments: number;
  prepaymentAmount: number; // Fraction of total (e.g., 1/1, 1/2, 1/3, 1/4)
  dueDates: Date[];
  prepaymentOrder: string[]; // ['VA 4'], ['VA 3', 'VA 4'], etc.
  vermeerderingPercentage: number;
}

export interface LongBookYearPrepaymentRules {
  numberOfPrepayments: number;
  dueDates: Date[];
  prepaymentOrder: string[];
}

export interface LatestPrepaymentDates {
  dates: Date[];
  descriptions: string[]; // e.g., ["10 April", "10 July", "10 October", "20 December"]
  isOverdue: boolean[];
}

@Injectable({
  providedIn: 'root'
})
export class BookYearCalculatorService {

  /**
   * Calculate book year information including duration and type
   */
  calculateBookYearInfo(startDate: Date, endDate: Date): BookYearInfo {
    const durationInDays = this.calculateDaysBetween(startDate, endDate);
    const durationInMonths = this.calculateMonthsBetween(startDate, endDate);
    
    const isShortBookYear = durationInMonths < 12;
    const isLongBookYear = durationInMonths > 12;
    const isNormalBookYear = durationInMonths === 12;
    
    // Calculate how many quarters are in this book year
    const quartersInBookYear = this.calculateQuartersInBookYear(startDate, endDate);
    
    return {
      startDate,
      endDate,
      durationInMonths,
      durationInDays,
      isShortBookYear,
      isLongBookYear,
      isNormalBookYear,
      quartersInBookYear
    };
  }

  /**
   * Calculate prepayment rules for short book years (< 12 months)
   */
  calculateShortBookYearPrepayments(bookYearInfo: BookYearInfo, taxYear: string): ShortBookYearPrepaymentRules {
    const quarters = bookYearInfo.quartersInBookYear;
    
    // Determine number of prepayments based on quarters
    let numberOfPrepayments: number;
    let prepaymentAmount: number;
    let prepaymentOrder: string[];
    let dueDates: Date[];
    
    switch (quarters) {
      case 1:
        numberOfPrepayments = 1;
        prepaymentAmount = 1; // 1/1
        prepaymentOrder = ['VA 4'];
        dueDates = [this.calculateDueDate(bookYearInfo.endDate, 4, 10)]; // 10th of 4th month
        break;
      case 2:
        numberOfPrepayments = 2;
        prepaymentAmount = 0.5; // 1/2
        prepaymentOrder = ['VA 3', 'VA 4'];
        dueDates = [
          this.calculateDueDate(bookYearInfo.endDate, 4, 10), // 10th of 4th month
          this.calculateDueDate(bookYearInfo.endDate, 7, 10)  // 10th of 7th month
        ];
        break;
      case 3:
        numberOfPrepayments = 3;
        prepaymentAmount = 1/3;
        prepaymentOrder = ['VA 2', 'VA 3', 'VA 4'];
        dueDates = [
          this.calculateDueDate(bookYearInfo.endDate, 4, 10),  // 10th of 4th month
          this.calculateDueDate(bookYearInfo.endDate, 7, 10),  // 10th of 7th month
          this.calculateDueDate(bookYearInfo.endDate, 10, 10)  // 10th of 10th month
        ];
        break;
      case 4:
        numberOfPrepayments = 4;
        prepaymentAmount = 0.25; // 1/4
        prepaymentOrder = ['VA 1', 'VA 2', 'VA 3', 'VA 4'];
        dueDates = [
          this.calculateDueDate(bookYearInfo.endDate, 4, 10),   // 10th of 4th month
          this.calculateDueDate(bookYearInfo.endDate, 7, 10),   // 10th of 7th month
          this.calculateDueDate(bookYearInfo.endDate, 10, 10),  // 10th of 10th month
          this.calculateDueDate(bookYearInfo.endDate, 12, 20)   // 20th of 12th month
        ];
        break;
      default:
        throw new Error(`Invalid number of quarters: ${quarters}`);
    }
    
    // Calculate adjusted vermeerdering percentage based on number of prepayments
    const vermeerderingPercentage = this.calculateAdjustedVermeerderingPercentage(numberOfPrepayments, taxYear);
    
    return {
      numberOfPrepayments,
      prepaymentAmount,
      dueDates,
      prepaymentOrder,
      vermeerderingPercentage
    };
  }

  /**
   * Calculate prepayment rules for long book years (> 12 months)
   */
  calculateLongBookYearPrepayments(bookYearInfo: BookYearInfo, taxYear: string): LongBookYearPrepaymentRules {
    // For long book years, only 4 prepayments in the last 12 months
    const last12MonthsStart = this.subtractMonths(bookYearInfo.endDate, 12);
    
    // Check if the last 12 months align with calendar year
    const last12MonthsStartYear = last12MonthsStart.getFullYear();
    const last12MonthsEndYear = bookYearInfo.endDate.getFullYear();
    const alignsWithCalendarYear = last12MonthsStartYear === last12MonthsEndYear;
    
    let dueDates: Date[];
    let prepaymentOrder: string[];
    
    if (alignsWithCalendarYear) {
      // Use normal calendar year dates
      dueDates = [
        new Date(last12MonthsEndYear, 3, 10),   // April 10
        new Date(last12MonthsEndYear, 6, 10),   // July 10
        new Date(last12MonthsEndYear, 9, 10),   // October 10
        new Date(last12MonthsEndYear, 11, 20)   // December 20
      ];
    } else {
      // Calculate based on last 12 months of book year (boekhouding te paard)
      dueDates = [
        this.calculateDueDate(bookYearInfo.endDate, 9, 10),   // 9th month from end
        this.calculateDueDate(bookYearInfo.endDate, 6, 10),   // 6th month from end
        this.calculateDueDate(bookYearInfo.endDate, 3, 10),   // 3rd month from end
        this.calculateDueDate(bookYearInfo.endDate, 0, 20)    // Last month, 20th day
      ];
    }
    
    prepaymentOrder = ['VA 1', 'VA 2', 'VA 3', 'VA 4'];
    
    return {
      numberOfPrepayments: 4,
      dueDates,
      prepaymentOrder
    };
  }

  /**
   * Calculate latest prepayment dates for any book year type
   */
  calculateLatestPrepaymentDates(bookYearInfo: BookYearInfo): LatestPrepaymentDates {
    let dates: Date[];
    let descriptions: string[];
    
    // For normal book years (12 months), always use calendar year dates
    if (bookYearInfo.isNormalBookYear) {
      const year = bookYearInfo.endDate.getFullYear();
      dates = [
        new Date(year, 3, 10),   // April 10
        new Date(year, 6, 10),   // July 10
        new Date(year, 9, 10),   // October 10
        new Date(year, 11, 20)   // December 20
      ];
      descriptions = ['10 April', '10 Juli', '10 Oktober', '20 December'];
    } else if (bookYearInfo.isShortBookYear) {
      // For short book years, calculate based on actual months in the book year
      const quarters = bookYearInfo.quartersInBookYear;
      dates = [];
      descriptions = [];
      
      // Calculate dates based on the actual months in the short book year
      const startDate = bookYearInfo.startDate;
      const endDate = bookYearInfo.endDate;
      
      switch (quarters) {
        case 1:
          // For 1 quarter, only one prepayment at the end
          dates = [new Date(endDate.getFullYear(), endDate.getMonth(), 10)];
          descriptions = ['10e dag van de laatste maand'];
          break;
        case 2:
          // For 2 quarters, 2 prepayments
          const month2 = new Date(startDate);
          month2.setMonth(startDate.getMonth() + Math.floor(bookYearInfo.durationInMonths / 2));
          dates = [
            new Date(month2.getFullYear(), month2.getMonth(), 10),
            new Date(endDate.getFullYear(), endDate.getMonth(), 10)
          ];
          descriptions = ['10e dag van de middelste maand', '10e dag van de laatste maand'];
          break;
        case 3:
          // For 3 quarters, 3 prepayments
          const month1_3 = new Date(startDate);
          month1_3.setMonth(startDate.getMonth() + Math.floor(bookYearInfo.durationInMonths / 3));
          const month2_3 = new Date(startDate);
          month2_3.setMonth(startDate.getMonth() + Math.floor(2 * bookYearInfo.durationInMonths / 3));
          dates = [
            new Date(month1_3.getFullYear(), month1_3.getMonth(), 10),
            new Date(month2_3.getFullYear(), month2_3.getMonth(), 10),
            new Date(endDate.getFullYear(), endDate.getMonth(), 10)
          ];
          descriptions = ['10e dag van de 1e derde', '10e dag van de 2e derde', '10e dag van de laatste maand'];
          break;
        case 4:
          // For 4 quarters, use normal calendar year dates
          const year = endDate.getFullYear();
          dates = [
            new Date(year, 3, 10),   // April 10
            new Date(year, 6, 10),   // July 10
            new Date(year, 9, 10),   // October 10
            new Date(year, 11, 20)   // December 20
          ];
          descriptions = ['10 April', '10 Juli', '10 Oktober', '20 December'];
          break;
      }
    } else if (bookYearInfo.isLongBookYear) {
      // For long book years, use last 12 months
      const last12MonthsStart = this.subtractMonths(bookYearInfo.endDate, 12);
      const last12MonthsStartYear = last12MonthsStart.getFullYear();
      const last12MonthsEndYear = bookYearInfo.endDate.getFullYear();
      const alignsWithCalendarYear = last12MonthsStartYear === last12MonthsEndYear;
      
      if (alignsWithCalendarYear) {
        dates = [
          new Date(last12MonthsEndYear, 3, 10),   // April 10
          new Date(last12MonthsEndYear, 6, 10),   // July 10
          new Date(last12MonthsEndYear, 9, 10),   // October 10
          new Date(last12MonthsEndYear, 11, 20)   // December 20
        ];
        descriptions = ['10 April', '10 Juli', '10 Oktober', '20 December'];
      } else {
        // Boekhouding te paard
        dates = [
          this.calculateDueDate(bookYearInfo.endDate, 9, 10),
          this.calculateDueDate(bookYearInfo.endDate, 6, 10),
          this.calculateDueDate(bookYearInfo.endDate, 3, 10),
          this.calculateDueDate(bookYearInfo.endDate, 0, 20)
        ];
        descriptions = ['9e maand voor einde', '6e maand voor einde', '3e maand voor einde', 'Laatste maand, 20e dag'];
      }
    } else {
      // Fallback for any other case - use calendar year dates
      const year = bookYearInfo.endDate.getFullYear();
      dates = [
        new Date(year, 3, 10),   // April 10
        new Date(year, 6, 10),   // July 10
        new Date(year, 9, 10),   // October 10
        new Date(year, 11, 20)   // December 20
      ];
      descriptions = ['10 April', '10 Juli', '10 Oktober', '20 December'];
    }
    
    // Check if dates are overdue
    const now = new Date();
    const isOverdue = dates.map(date => date < now);
    
    return {
      dates,
      descriptions,
      isOverdue
    };
  }

  /**
   * Calculate adjusted vermeerdering percentage for short book years
   */
  private calculateAdjustedVermeerderingPercentage(numberOfPrepayments: number, taxYear: string): number {
    // Get base quarterly rates for the tax year
    const quarterlyRates = getQuarterlyRates(taxYear);
    
    switch (numberOfPrepayments) {
      case 1:
        // Only VA 4: use VA 4 rate
        return quarterlyRates.Q4 * 100;
      case 2:
        // VA 3 and VA 4: average of VA 3 and VA 4 rates
        return ((quarterlyRates.Q3 + quarterlyRates.Q4) / 2) * 100;
      case 3:
        // VA 2, VA 3, VA 4: average of VA 2, VA 3, and VA 4 rates
        return ((quarterlyRates.Q2 + quarterlyRates.Q3 + quarterlyRates.Q4) / 3) * 100;
      case 4:
        // All VA: use normal vermeerdering percentage
        return getVermeerderingsPercentage(taxYear) * 100;
      default:
        throw new Error(`Invalid number of prepayments: ${numberOfPrepayments}`);
    }
  }

  /**
   * Calculate the number of quarters in a book year
   */
  private calculateQuartersInBookYear(startDate: Date, endDate: Date): number {
    const startQuarter = Math.floor(startDate.getMonth() / 3) + 1;
    const endQuarter = Math.floor(endDate.getMonth() / 3) + 1;
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    
    if (startYear === endYear) {
      return endQuarter - startQuarter + 1;
    } else {
      const quartersInStartYear = 4 - startQuarter + 1;
      const quartersInEndYear = endQuarter;
      const fullYears = endYear - startYear - 1;
      return quartersInStartYear + (fullYears * 4) + quartersInEndYear;
    }
  }

  /**
   * Calculate months between two dates
   */
  private calculateMonthsBetween(startDate: Date, endDate: Date): number {
    const yearDiff = endDate.getFullYear() - startDate.getFullYear();
    const monthDiff = endDate.getMonth() - startDate.getMonth();
    const dayDiff = endDate.getDate() - startDate.getDate();
    
    let months = yearDiff * 12 + monthDiff;
    
    // Adjust for day difference - if end date is earlier in the month than start date, subtract one month
    if (dayDiff < 0) {
      months--;
    }
    
    // For a full year (e.g., 01-01-2025 to 31-12-2025), we want 12 months, not 11
    // If the end date is the last day of the month and start date is the first day, add one month
    const lastDayOfEndMonth = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate();
    if (endDate.getDate() === lastDayOfEndMonth && startDate.getDate() === 1) {
      months++;
    }
    
    return months;
  }

  /**
   * Calculate days between two dates
   */
  private calculateDaysBetween(startDate: Date, endDate: Date): number {
    const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
    return Math.round(Math.abs((endDate.getTime() - startDate.getTime()) / oneDay));
  }

  /**
   * Calculate due date based on months from end date
   */
  private calculateDueDate(endDate: Date, monthsFromEnd: number, dayOfMonth: number): Date {
    const dueDate = new Date(endDate);
    dueDate.setMonth(dueDate.getMonth() - monthsFromEnd);
    dueDate.setDate(dayOfMonth);
    return dueDate;
  }

  /**
   * Subtract months from a date
   */
  private subtractMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() - months);
    return result;
  }

  /**
   * Check if a book year is a first book year (for new companies)
   */
  isFirstBookYear(startDate: Date, endDate: Date): boolean {
    // A first book year is typically shorter than 12 months and starts close to company formation
    const durationInMonths = this.calculateMonthsBetween(startDate, endDate);
    return durationInMonths < 12;
  }

  /**
   * Get book year type description
   */
  getBookYearTypeDescription(bookYearInfo: BookYearInfo): string {
    if (bookYearInfo.isShortBookYear) {
      return `Verkort boekjaar (${bookYearInfo.durationInMonths} maanden)`;
    } else if (bookYearInfo.isLongBookYear) {
      return `Verlengd boekjaar (${bookYearInfo.durationInMonths} maanden)`;
    } else {
      return 'Normaal boekjaar (12 maanden)';
    }
  }

  /**
   * Get prepayment description for short book years
   */
  getShortBookYearPrepaymentDescription(bookYearInfo: BookYearInfo): string {
    if (!bookYearInfo.isShortBookYear) {
      return '';
    }
    
    const quarters = bookYearInfo.quartersInBookYear;
    switch (quarters) {
      case 1:
        return '1 voorafbetaling (1/1 van het totaal)';
      case 2:
        return '2 voorafbetalingen (elk 1/2 van het totaal)';
      case 3:
        return '3 voorafbetalingen (elk 1/3 van het totaal)';
      case 4:
        return '4 voorafbetalingen (elk 1/4 van het totaal)';
      default:
        return '';
    }
  }
} 