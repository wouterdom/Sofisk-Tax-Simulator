import { Injectable } from '@angular/core';
import { TaxData, DeclarationSection, DeclarationField } from '../types/tax-data.types';

export interface ImportedDeclaration {
  id: string;
  legalPersonId: string;
  periodId: string;
  name: string;
  declarationType: string;
  protocolType: string;
  fiscalYear: number;
  status: string;
  deadline: string;
  lastEdited: string;
  version: number;
  contents: { [key: string]: any };
}

@Injectable({
  providedIn: 'root'
})
export class ImportService {

  constructor() { }

  /**
   * Imports declaration data from a JSON file
   * Updates existing fields in the default layout structure
   */
  importDeclarationData(jsonData: ImportedDeclaration): TaxData {
    // Get the default structure from vereenvoudigde aangifte
    const { getDefaultTaxData } = require('../../layout-builders/Vereenvoudigde-aangifte');
    const defaultData = getDefaultTaxData();
    
    // Extract numeric fields from the imported data
    const importedFields = this.extractNumericFields(jsonData.contents);
    
    // Create a map of imported values for easy lookup
    const importedValues = new Map<string, number>();
    importedFields.forEach(field => {
      importedValues.set(field.code, field.value);
    });
    
    // Update the default structure with imported values
    defaultData.declarationSections.forEach((section: DeclarationSection) => {
      if (section.fields) {
        section.fields.forEach((field: DeclarationField) => {
          if (importedValues.has(field.code || '')) {
            field.value = importedValues.get(field.code || '')!;
          }
        });
      }
    });
    
    // Handle boolean fields (1701 and 1801)
    if (importedValues.has('1701')) {
      defaultData.canUseReducedRate = importedValues.get('1701') === 1;
    }
    if (importedValues.has('1801')) {
      defaultData.isSmallCompanyFirstThreeYears = importedValues.get('1801') === 1;
    }
    
    // Update input method to indicate this was imported
    defaultData.inputMethod = 'previous';
    defaultData.lastUpdated = new Date();
    
    return defaultData;
  }

  /**
   * Extracts numeric fields from the contents object
   * Only imports codes that exist in the application
   */
  private extractNumericFields(contents: { [key: string]: any }): Array<{code: string, value: number}> {
    const numericFields: Array<{code: string, value: number}> = [];
    
    // Only import codes that exist in the application
    const validCodes = [
      '1080', '1240', '1320', '1420', '1432', '1433', '1439', '1438', '1437', 
      '1445', '1441', '1442', '1436', '1443', '1508', '1701', '1801', '1830', '1840'
    ];
    
    for (const [key, value] of Object.entries(contents)) {
      // Only process fields that start with underscore and have numeric values
      if (key.startsWith('_') && typeof value === 'number') {
        const code = key.substring(1); // Remove the underscore
        
        // Only import if the code exists in our application
        if (validCodes.includes(code)) {
          numericFields.push({ code, value });
        }
      }
    }
    
    return numericFields;
  }



  /**
   * Parses a JSON file and returns the parsed data
   */
  parseJsonFile(file: File): Promise<ImportedDeclaration> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const jsonData = JSON.parse(e.target?.result as string);
          resolve(jsonData);
        } catch (error) {
          reject(new Error('Invalid JSON file'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Error reading file'));
      };
      
      reader.readAsText(file);
    });
  }
} 