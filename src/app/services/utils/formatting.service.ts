import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NumberFormattingService {
  
  /**
   * Parse European number format to numeric value
   * "25.000,00" -> 25000
   */
  public parseNumberEU(value: string): number {
    if (!value || value.trim() === '') return 0;
    
    // Remove all non-numeric characters except comma and dot
    const cleaned = value.replace(/[^\d.,]/g, '');
    
    // Handle European format (comma as decimal separator)
    if (cleaned.includes(',')) {
      // Split by comma, last part is decimals
      const parts = cleaned.split(',');
      const wholePart = parts.slice(0, -1).join('').replace(/\./g, '');
      const decimalPart = parts[parts.length - 1];
      return parseFloat(wholePart + '.' + decimalPart) || 0;
    }
    
    // Handle dot as decimal separator
    return parseFloat(cleaned.replace(/\./g, '')) || 0;
  }

  /**
   * Format numeric value to European format
   * 25000 -> "25.000,00"
   */
  public formatNumberEU(value: number): string {
    if (isNaN(value)) return '0,00';
    
    return value.toLocaleString('nl-BE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  /**
   * Format currency in European format
   * 25000 -> "€ 25.000,00"
   */
  public formatCurrencyEU(value: number): string {
    if (isNaN(value)) return '€ 0,00';
    
    return value.toLocaleString('nl-BE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  /**
   * Validate if string is valid European number format
   */
  public isValidEuropeanNumber(value: string): boolean {
    if (!value || value.trim() === '') return true;
    
    // European number regex: allows dots as thousands separators and comma as decimal
    const europeanNumberRegex = /^[\d.,\s]+$/;
    return europeanNumberRegex.test(value);
  }
} 