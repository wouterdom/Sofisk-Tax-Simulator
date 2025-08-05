# Implementation Plan: Enhanced Step 1 & Step 4 for Sofisk Tax Simulator

## Overview
This document outlines the implementation plan for enhancing Step 1 ("Select Invoermethode") with period and tax year validation, and adding Step 4 for committing prepayments to existing documents.

## Current State Analysis

### Existing Implementation
- **Step 1**: Basic invoermethode selection (Handmatige invoer / Vorig jaar als basis)
- **Step 2**: Vereenvoudigde aangifte invullen
- **Step 3**: Voorafbetalingen optimaliseren
- **Navigation**: Basic step progression without validation

### Issues to Address
1. No period/tax year validation in Step 1
2. No confirmation of calculated tax year
3. Users can proceed without proper validation
4. Missing commit functionality for prepayments
5. Hardcoded tax year 2025 parameters

## Implementation Requirements

### 1. Enhanced Step 1: Period & Tax Year Validation

#### 1.1 Period Confirmation Section
**Location**: Add above existing invoermethode selection in Step 1

**Components**:
- **Period Display**: Show pre-filled period from previous software
- **Period Confirmation**: Checkbox to confirm period is correct
- **Book Year Display**: Show calculated "Boekjaar/Periode"
- **Tax Year Display**: Show calculated "Aanslagjaar" with confirmation checkbox

**UI Elements**:
```html
<!-- Period Confirmation Section -->
<div class="bg-white border border-gray-200 rounded-lg p-6 mb-6">
  <h3 class="text-lg font-semibold text-gray-900 mb-4">Periode & Aanslagjaar</h3>
  
  <!-- Period Display -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
    <div>
      <label class="block text-sm font-medium text-gray-700">Periode</label>
      <div class="mt-1 p-3 bg-gray-50 border rounded-md">
        <span class="text-sm text-gray-900">{{ periodStart }} → {{ periodEnd }}</span>
      </div>
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-700">Boekjaar</label>
      <div class="mt-1 p-3 bg-gray-50 border rounded-md">
        <span class="text-sm text-gray-900">{{ calculatedBookYear }}</span>
      </div>
    </div>
  </div>
  
  <!-- Tax Year Display -->
  <div class="mb-4">
    <label class="block text-sm font-medium text-gray-700">Aanslagjaar</label>
    <div class="mt-1 p-3 bg-blue-50 border border-blue-200 rounded-md">
      <span class="text-sm font-medium text-blue-900">{{ calculatedTaxYear }}</span>
    </div>
  </div>
  
  <!-- Confirmation Checkboxes -->
  <div class="space-y-3">
    <div class="flex items-center">
      <input type="checkbox" id="periodConfirmed" [(ngModel)]="periodConfirmed" 
             class="h-4 w-4 text-blue-600 rounded border-gray-300">
      <label for="periodConfirmed" class="ml-2 text-sm text-gray-700">
        Ik bevestig dat de periode correct is
      </label>
    </div>
    <div class="flex items-center">
      <input type="checkbox" id="taxYearConfirmed" [(ngModel)]="taxYearConfirmed" 
             class="h-4 w-4 text-blue-600 rounded border-gray-300">
      <label for="taxYearConfirmed" class="ml-2 text-sm text-gray-700">
        Ik bevestig dat het aanslagjaar {{ calculatedTaxYear }} correct is
      </label>
    </div>
  </div>
</div>
```

#### 1.2 Tax Year Calculation Logic
**Service Method**: Create in `MainCalculationEngineService`

```typescript
// Tax year calculation rules:
// - If period ends on December 31st of a year → Tax Year = following year
// - If period ends on any other date → Tax Year = end year
// Examples:
// - Period ending Dec 31, 2024 → Tax Year 2025
// - Period ending Dec 30, 2024 → Tax Year 2024  
// - Period ending Jan 15, 2024 → Tax Year 2024
// - Period ending Dec 31, 2023 → Tax Year 2024

calculateTaxYear(periodEndDate: Date): string {
  const endYear = periodEndDate.getFullYear();
  const endMonth = periodEndDate.getMonth(); // 0-11
  const endDay = periodEndDate.getDate();
  
  // Check if period ends on December 31st
  if (endMonth === 11 && endDay === 31) {
    return (endYear + 1).toString();
  }
  
  return endYear.toString();
}
```

#### 1.3 Enhanced Invoermethode Selection
**Updates to existing selection**:
- Disable selection until period and tax year are confirmed
- Add visual indicators for selection state
- Clear validation messages

#### 1.4 Validation Logic
**Step 1 → Step 2 Progression Requirements**:
1. Period confirmed (checkbox checked)
2. Tax year confirmed (checkbox checked)
3. Invoermethode selected (handmatig OR vorig_jaar)

**Important**: Once the tax year is confirmed, the system must immediately switch to using the correct parameters for that aanslagjaar in all subsequent calculations. This ensures that prepayment calculations, vermeerdering percentages, and quarterly rates are all based on the confirmed tax year.

**Validation Implementation**:
```typescript
canProceedToStep2(): boolean {
  return this.periodConfirmed && 
         this.taxYearConfirmed && 
         this.selectedInvoermethode !== null;
}

getValidationMessage(): string {
  if (!this.periodConfirmed) return 'Bevestig eerst de periode';
  if (!this.taxYearConfirmed) return 'Bevestig eerst het aanslagjaar';
  if (!this.selectedInvoermethode) return 'Selecteer een invoermethode';
  return '';
}
```

### 2. Updated Parameters Structure

#### 2.1 Tax Year Parameters
**File**: `src/app/services/core-engine/parameters.ts`

**Implementation**: Already provided in previous response with:
- `TAX_YEAR_PARAMETERS` object for 2024, 2025, 2026
- Helper functions for dynamic parameter lookup
- Updated `STEP_CONFIG` with Step 4

**Critical Requirement**: All calculations must use the correct parameters based on the selected aanslagjaar (tax year). The system must dynamically switch between different parameter sets (2024, 2025, 2026) based on the user's confirmed tax year selection.

#### 2.2 Integration with Calculation Engine
**Updates needed in `MainCalculationEngineService`**:
```typescript
// Add method to get current tax year
getCurrentTaxYear(): string {
  return this.taxData.periodData?.taxYear || '2025';
}

// Update calculation methods to use dynamic parameters based on selected aanslagjaar
getQuarterlyRates(): any {
  const taxYear = this.getCurrentTaxYear();
  return getQuarterlyRates(taxYear);
}

getVermeerderingsPercentage(): number {
  const taxYear = this.getCurrentTaxYear();
  return getVermeerderingsPercentage(taxYear);
}

// Ensure all calculations use the correct parameters for the selected aanslagjaar
calculatePrepayments(): void {
  const currentTaxYear = this.getCurrentTaxYear();
  const quarterlyRates = getQuarterlyRates(currentTaxYear);
  const vermeerderingPercentage = getVermeerderingsPercentage(currentTaxYear);
  
  // Use the correct parameters for the selected tax year in all calculations
  this.calculateQ1Prepayment(quarterlyRates.Q1, vermeerderingPercentage);
  this.calculateQ2Prepayment(quarterlyRates.Q2, vermeerderingPercentage);
  this.calculateQ3Prepayment(quarterlyRates.Q3, vermeerderingPercentage);
  this.calculateQ4Prepayment(quarterlyRates.Q4, vermeerderingPercentage);
}
```

### 3. Step 4: Commit Prepayments

#### 3.1 New Component Structure
**File**: `src/app/workflow/commit-voorafbetalingen.component.ts`

**Purpose**: Allow users to commit prepayment calculations to existing documents

**Features**:
- List existing declarations (similar to header component)
- Select target declaration
- Preview data to be committed
- Commit functionality with success/error feedback

#### 3.2 UI Implementation
```html
<!-- Step 4: Commit Prepayments -->
<div class="bg-white border border-gray-200 rounded-lg p-6">
  <h3 class="text-lg font-semibold text-gray-900 mb-4">Voorafbetalingen Committeren</h3>
  
  <!-- Declaration Selection -->
  <div class="mb-6">
    <label class="block text-sm font-medium text-gray-700 mb-2">
      Selecteer bestaande aangifte
    </label>
    <select [(ngModel)]="selectedDeclarationId" 
            class="w-full p-3 border border-gray-300 rounded-md">
      <option value="">-- Selecteer aangifte --</option>
      <option *ngFor="let decl of availableDeclarations" 
              [value]="decl.id">
        {{ decl.name }} ({{ decl.assessmentYear }})
      </option>
    </select>
  </div>
  
  <!-- Data Preview -->
  <div class="mb-6" *ngIf="selectedDeclarationId">
    <h4 class="text-md font-medium text-gray-900 mb-3">Te committen data:</h4>
    <div class="bg-gray-50 p-4 rounded-md">
      <!-- Preview of prepayment data -->
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div>Q1 Voorafbetaling: {{ previewData.q1 }}</div>
        <div>Q2 Voorafbetaling: {{ previewData.q2 }}</div>
        <div>Q3 Voorafbetaling: {{ previewData.q3 }}</div>
        <div>Q4 Voorafbetaling: {{ previewData.q4 }}</div>
      </div>
    </div>
  </div>
  
  <!-- Action Buttons -->
  <div class="flex justify-end space-x-3">
    <button (click)="cancelCommit()" 
            class="px-4 py-2 border border-gray-300 rounded-md text-gray-700">
      Annuleren
    </button>
    <button (click)="commitData()" 
            [disabled]="!selectedDeclarationId"
            class="px-4 py-2 bg-blue-600 text-white rounded-md disabled:bg-gray-300">
      Committen
    </button>
  </div>
</div>
```

#### 3.3 Component Logic
```typescript
export class CommitVoorafbetalingenComponent {
  availableDeclarations: Declaration[] = [];
  selectedDeclarationId: string = '';
  previewData: any = {};
  
  ngOnInit() {
    this.loadAvailableDeclarations();
    this.loadPreviewData();
  }
  
  loadAvailableDeclarations() {
    // Load from header component or service
    this.availableDeclarations = this.declarationService.getDeclarations();
  }
  
  loadPreviewData() {
    // Get current prepayment data from calculation engine
    this.previewData = this.taxDataService.getPrepaymentData();
  }
  
  commitData() {
    if (!this.selectedDeclarationId) return;
    
    const declaration = this.availableDeclarations.find(
      d => d.id === this.selectedDeclarationId
    );
    
    if (declaration) {
      this.taxDataService.commitToDeclaration(declaration, this.previewData)
        .then(() => {
          this.showSuccessMessage('Data succesvol gecommit naar ' + declaration.name);
        })
        .catch(error => {
          this.showErrorMessage('Fout bij committen: ' + error.message);
        });
    }
  }
}
```

### 4. Data Structure Updates

#### 4.1 New Interfaces
**File**: `src/app/services/types/tax-data.types.ts`

```typescript
// Add to existing TaxData interface
interface TaxData {
  // ... existing properties
  periodData?: PeriodData;
  invoermethodeData?: InvoermethodeData;
}

interface PeriodData {
  startDate: Date;
  endDate: Date;
  bookYear: string;
  taxYear: string;
  isConfirmed: boolean;
}

interface InvoermethodeData {
  selectedMethod: 'handmatig' | 'vorig_jaar';
  isConfirmed: boolean;
}
```

#### 4.2 Storage Integration
**Updates to existing storage patterns**:
```typescript
// In MainCalculationEngineService
savePeriodData(periodData: PeriodData): void {
  this.taxData.periodData = periodData;
  this.saveToStorage();
}

saveInvoermethodeData(invoermethodeData: InvoermethodeData): void {
  this.taxData.invoermethodeData = invoermethodeData;
  this.saveToStorage();
}
```

### 5. Navigation Updates

#### 5.1 Step Progression Logic
**File**: `src/app/workflow/Invoermethode.ts`

**Updates**:
```typescript
goToStep(step: number): void {
  // Validate Step 1 → Step 2 progression
  if (this.currentStep === 1 && step === 2) {
    if (!this.canProceedToStep2()) {
      this.showValidationError(this.getValidationMessage());
      return;
    }
  }
  
  // Standard progression logic
  if (step >= STEP_CONFIG.MIN_STEP && step <= STEP_CONFIG.MAX_STEP) {
    this.currentStep = step;
    this.saveStep();
    this.taxDataService.forceRecalculation();
  }
}
```

#### 5.2 Progress Indicator Updates
**File**: `src/app/workflow/Invoermethode.html`

**Updates**:
- Add Step 4 to progress indicator
- Update styling for 4-step layout
- Add validation indicators

### 6. Testing Requirements

#### 6.1 Unit Tests
**Files to create**:
- `src/app/unit-tests/components/period-validation.spec.ts`
- `src/app/unit-tests/services/tax-year-calculation.spec.ts`
- `src/app/unit-tests/components/commit-voorafbetalingen.spec.ts`

**Test scenarios**:
- Tax year calculation with various period end dates
- Step 1 validation logic
- Step 4 commit functionality
- Parameter lookup for different tax years
- **Critical**: Verify that calculations use correct parameters for each aanslagjaar (2024, 2025, 2026)
- **Critical**: Test that parameter switching works correctly when tax year changes
- **Critical**: Verify that all prepayment calculations use the correct quarterly rates for the selected tax year

#### 6.2 Integration Tests
- Step progression with validation
- Data persistence across steps
- Commit functionality integration

### 7. Implementation Priority

#### Phase 1 (High Priority)
1. Update `parameters.ts` with tax year structure
2. Implement tax year calculation logic
3. Add period confirmation UI to Step 1
4. Implement Step 1 validation logic
5. **Critical**: Ensure calculation engine uses correct parameters for confirmed aanslagjaar
6. **Critical**: Test parameter switching when tax year changes

#### Phase 2 (Medium Priority)
1. Enhance invoermethode selection with validation states
2. Update navigation logic
3. Add data structure updates

#### Phase 3 (Medium Priority)
1. Implement Step 4 component
2. Add commit functionality
3. Update progress indicator

#### Phase 4 (Low Priority)
1. Comprehensive testing
2. UI polish and refinements
3. Documentation updates

### 8. Files to Modify

#### Core Files
- `src/app/services/core-engine/parameters.ts` ✅ (Already provided)
- `src/app/services/core-engine/main-calculation-engine.service.ts`
- `src/app/services/types/tax-data.types.ts`

#### Component Files
- `src/app/workflow/Invoermethode.html`
- `src/app/workflow/Invoermethode.ts`
- `src/app/workflow/commit-voorafbetalingen.component.ts` (new)
- `src/app/workflow/commit-voorafbetalingen.component.html` (new)

#### Test Files
- `src/app/unit-tests/components/period-validation.spec.ts` (new)
- `src/app/unit-tests/services/tax-year-calculation.spec.ts` (new)
- `src/app/unit-tests/components/commit-voorafbetalingen.spec.ts` (new)

### 9. Success Criteria

#### Functional Requirements
- ✅ Users cannot proceed to Step 2 without confirming period and tax year
- ✅ Tax year is automatically calculated based on period end date
- ✅ Users can select invoermethode only after period/tax year confirmation
- ✅ Step 4 allows committing prepayments to existing declarations
- ✅ Parameters are dynamically loaded based on selected tax year
- ✅ **Critical**: All calculations use the correct parameters for the confirmed aanslagjaar
- ✅ **Critical**: System switches parameter sets immediately when tax year is confirmed
- ✅ **Critical**: Prepayment calculations use correct quarterly rates for the selected tax year

#### Technical Requirements
- ✅ Backward compatibility maintained
- ✅ Clean separation of concerns
- ✅ Comprehensive error handling
- ✅ Responsive UI design
- ✅ Unit test coverage

#### User Experience Requirements
- ✅ Clear validation messages
- ✅ Intuitive step progression
- ✅ Visual feedback for all actions
- ✅ Consistent styling with existing components

## Next Steps

1. **Review and approve** this implementation plan
2. **Start with Phase 1** implementation
3. **Implement parameters.ts** updates first
4. **Add tax year calculation logic**
5. **Build Step 1 enhancements incrementally**
6. **Test each phase thoroughly** before proceeding
7. **Critical**: Verify that all calculations use the correct parameters for the selected aanslagjaar
8. **Critical**: Test parameter switching functionality across different tax years

This plan ensures a systematic approach to implementing all required functionality while maintaining code quality and user experience standards. 