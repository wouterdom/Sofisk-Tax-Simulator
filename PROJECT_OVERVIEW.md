# Sofisk Tax Simulator: Project Overview

## 1. Introduction

The Sofisk Tax Simulator is a web-based tool for Belgian corporations to estimate corporate tax liability and optimize quarterly prepayments (`voorafbetalingen`) to avoid penalties.

**Primary Goals:**
- Real-time corporate tax estimation with multi-year support (2024-2026)
- Prepayment optimization to minimize penalties (`vermeerdering`)
- User-friendly interface for accountants, tax advisors, and business owners
- Comprehensive commit functionality for tax declarations

**Target Users:**
- Accountants and Tax Advisors
- Business Owners and CFOs
- New developers joining the project

---

## 2. Core Features

### 2.1 Four-Step Workflow

**Step 1: Input Method Selection & Period Validation**
- Manual entry or import from previous year
- Period and tax year confirmation and validation
- Robust navigation logic with step prerequisites
- Tax year-specific parameter management

**Step 2: Vereenvoudigde Aangifte (Simplified Declaration)**
- Input financial data across 9 declaration sections
- Real-time calculation of subtotals and final taxable base
- Set eligibility flags (reduced tax rate, new company exemptions)
- Shows "Detail van de berekening" using current input values

**Step 3: Voorschotten Optimaliseren (Prepayment Optimization)**
- Suggests prepayment amounts using various strategies
- Optimization goals: Avoid Penalties, Saldo Nul, Custom Strategy
- Shows calculation breakdown using suggested prepayment values
- Always displays original values for comparison
- Save confirmation dialog when navigating away with changes

**Step 4: Voorafbetalingen Committeren (Commit Prepayments)**
- Comprehensive tax overview with prepayment breakdown
- Declaration selection and commit functionality
- Persistent committed state display
- Integration with core calculation engine for consistent data

### 2.2 Data Management
- Automatic localStorage persistence
- Reset to defaults, clear data, commit simulation values
- Step persistence across browser sessions
- Tax year-specific data structures and parameters

### 2.3 Enhanced Navigation
- Step-by-step progression with validation
- Visual cues for blocked steps
- Save confirmation for unsaved changes
- Flexible navigation after Step 1 completion

---

## 3. Architecture Overview

The system uses a **three-layer architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    UI Components                            │
│  (Invoermethode, VereenvoudigdeAangifte,                   │
│   VoorschottenOptimaliseren, CommitVoorafbetalingen)       │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│              MainCalculationEngineService                   │
│                    (Orchestration Layer)                    │
│  • State Management (RxJS BehaviorSubjects)                │
│  • Data Persistence (localStorage)                         │
│  • Step Context Management                                 │
│  • Tax Year Parameter Management                           │
│  • Coordinates Core Engine & Layout Builders               │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                    Core Engine                              │
│  • Pure Mathematical Calculations                           │
│  • Business Logic Implementation                            │
│  • Tax Year-Aware Calculations                              │
│  • No UI Dependencies                                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                Layout Builders                              │
│  • UI Presentation Logic                                    │
│  • Calculation Detail Rows                                  │
│  • Simplified Return Cards                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. File Organization

```
src/app/
├── services/
│   ├── core-engine/                    # 🎯 Main calculation files
│   │   ├── calculation-core.ts         # Pure mathematical calculations
│   │   ├── main-calculation-engine.service.ts  # Orchestration service
│   │   ├── prepayment.service.ts       # Prepayment business logic
│   │   └── parameters.ts               # Tax year parameters & constants
│   ├── types/                          # TypeScript type definitions
│   │   ├── tax-data.types.ts           # Core data interfaces
│   │   └── tax-error.ts                # Error handling types
│   └── utils/                          # Utility services
│       ├── formatting.service.ts       # Number and currency formatting
│       ├── logging.service.ts          # Application logging
│       └── storage.service.ts          # Data persistence
├── layout-builders/                    # UI presentation builders
│   ├── calculation-detail.builder.ts   # Calculation detail rows
│   ├── Key-values-Cards.ts             # Simplified return cards
│   └── Vereenvoudigde-aangifte.ts      # Declaration structure
├── workflow/                           # Main application views
│   ├── Invoermethode.html/.ts          # Step 1: Input method & period validation
│   ├── vereenvoudigde-aangifte.component.html/.ts  # Step 2: Declaration
│   ├── voorschotten-optimaliseren.component.html/.ts  # Step 3: Optimization
│   └── commit-voorafbetalingen.component.html/.ts  # Step 4: Commit functionality
├── components/                         # Reusable UI components
│   ├── base-tax.component.ts           # Base tax calculation component
│   ├── calculation-details.component.ts # Calculation breakdown display
│   ├── formatted-number-input.component.ts # Number input with formatting
│   ├── loading-indicator.component.ts  # Loading state indicator
│   ├── prepayment.component.ts         # Prepayment input component
│   └── ui-classes.directive.ts         # Dynamic CSS class management
├── header/                             # Application header (simplified)
└── unit-tests/                         # Unit tests (separate directory)
    ├── services/                       # Service-specific tests
    └── components/                     # Component-specific tests
```

---

## 5. Key Services Explained

### 5.1 MainCalculationEngineService (Orchestration Layer)
**Purpose:** Coordinates the entire calculation system

**Key Responsibilities:**
- **State Management**: Uses RxJS BehaviorSubjects for reactive data flow
- **Data Persistence**: Handles localStorage operations
- **Step Context**: Manages which prepayment values to use (current vs. suggested)
- **Tax Year Management**: Dynamic parameter retrieval for 2024-2026
- **Core Engine Coordination**: Calls the core engine with appropriate inputs
- **Layout Builder Coordination**: Provides data to UI presentation builders

**Step-Aware Logic:**
```typescript
// Step 2: Use current prepayments (values being edited by user)
// Step 3: Use suggested prepayments (simulation values)
const prepaymentsForDetail = this.getCurrentStep() === 3 
  ? core.suggestedPrepayments 
  : data.prepayments;
```

**Tax Year Logic:**
```typescript
// Dynamic parameter retrieval based on calculated tax year
const taxYear = this.calculateTaxYear(data);
const parameters = getTaxYearParameters(taxYear);
```

**Reactive Data Flow:**
```typescript
// 1. User input triggers data change
component.onPeriodChange() → service.savePeriodData()

// 2. Service emits new data
service.dataSubject.next(updatedData)

// 3. Reactive calculations trigger
service.setupReactiveCalculations() → performCalculation()

// 4. Components automatically update
component.dataSubscription → UI updates
```

### 5.2 Calculation Core (Pure Math Layer)
**Purpose:** Contains all Belgian corporate tax calculation logic

**Characteristics:**
- Pure mathematical functions
- No side effects or UI dependencies
- Easily testable and reusable
- Implements official Belgian tax rules
- Tax year-aware calculations

**Calculation Flow:**
1. Section aggregation (sums fields within sections)
2. Intermediate calculations (ResterendResultaat, GrondslagVoorBerekeningKorf)
3. Korfbeperking application (basket limitation rules)
4. Tax rate application (20% reduced + 25% standard)
5. Voorheffingen processing (prepayments)
6. Vermeerdering calculation (dynamic penalty rates with de-minimis rules)
7. Prepayment optimization

### 5.3 PrepaymentService (Business Logic)
**Purpose:** Handles prepayment-specific calculations and optimization

**Key Features:**
- Calculate total prepayments
- Suggest optimal prepayment strategies
- Handle different concentration methods (spread, Q1-Q4)
- Implement "Saldo Nul" calculations
- Tax year-aware quarterly rates

### 5.4 Date Calculation System (Reactive Pattern)
**Purpose:** Handles period validation and tax year calculations with instant reactivity

**Key Features:**
- **Reactive Date Processing**: Uses the same reactive pattern as the main calculation engine
- **Instant UI Updates**: Calculated values update immediately as user types
- **Robust Date Handling**: Supports both string and Date object types for display and storage
- **Business Rule Implementation**: Correctly calculates boekjaar and aanslagjaar based on Belgian tax rules

**Reactive Implementation Pattern:**
```typescript
// 1. Component subscribes to service data changes
this.dataSubscription = this.taxDataService.data$.subscribe(data => {
  if (data?.periodData) {
    this.calculatedBookYear = data.periodData.bookYear || '';
    this.calculatedTaxYear = data.periodData.taxYear || '';
  }
});

// 2. User input triggers service update
onPeriodChange(): void {
  this.savePeriodData(); // Triggers reactive update
}

// 3. Service calculates and emits new data
savePeriodData(): void {
  // Calculate values and save to service
  const periodData: PeriodData = {
    startDate: startDate,
    endDate: endDate,
    bookYear: calculatedBookYear,
    taxYear: calculatedTaxYear,
  };
  this.taxDataService.savePeriodData(periodData); // Triggers dataSubject.next()
}
```

**Business Rules Implementation:**
```typescript
// Tax Year Calculation (Aanslagjaar)
public calculateTaxYear(periodEndDate: Date): string {
  const endYear = periodEndDate.getFullYear();
  const endMonth = periodEndDate.getMonth(); // 0-11
  const endDay = periodEndDate.getDate();
  
  // If period ends on December 31st → Tax Year = following year
  if (endMonth === 11 && endDay === 31) {
    return (endYear + 1).toString();
  }
  
  // Otherwise → Tax Year = end year
  return endYear.toString();
}

// Book Year Calculation (Boekjaar)
if (startYear === endYear) {
  calculatedBookYear = startYear.toString(); // Same year: "2023"
} else {
  calculatedBookYear = `${startYear}/${endYear}`; // Multi-year: "2023/2024"
}
```

**Example Calculations:**
- **Period**: 01-01-2023 to 31-12-2023
  - **Boekjaar**: 2023
  - **Aanslagjaar**: 2024 (ends on December 31st)
- **Period**: 01-01-2024 to 30-12-2024
  - **Boekjaar**: 2024
  - **Aanslagjaar**: 2024 (doesn't end on December 31st)
- **Period**: 01-07-2024 to 30-06-2025
  - **Boekjaar**: 2024/2025
  - **Aanslagjaar**: 2025

**Parameter Validation:**
- **Supported Years**: 2024, 2025, 2026 (have specific tax parameters)
- **Unsupported Years**: Any other year (e.g., 2023, 2027, 2030)
- **Warning Message**: Shows when unsupported years are used
- **Fallback Logic**: Uses closest available year's parameters (not just most recent)
- **Example Warning**: "Let op: Voor aanslagjaar 2023 zijn geen specifieke parameters beschikbaar. Parameters van 2024 worden gebruikt."
- **Fallback Examples**: 
  - 2023 → uses 2024 parameters (closest)
  - 2027 → uses 2026 parameters (closest)
  - 2030 → uses 2026 parameters (closest)

**Technical Implementation Details:**
- **Display Values**: Kept as strings for HTML date inputs
- **Storage Values**: Converted to Date objects for service storage
- **Event Handling**: Uses `(input)` events for instant reactivity
- **Type Safety**: Supports `Date | string | null` for flexible handling
- **Validation**: Robust validation prevents invalid date storage
- **Parameter Validation**: Warns when tax year doesn't have specific parameters (2024-2026 only)

### 5.5 Parameters Service (Tax Year Management)
**Purpose:** Manages tax year-specific parameters and constants

**Key Features:**
- Dynamic parameter retrieval for 2024-2026
- Quarterly rates management
- Vermeerdering percentage management
- Step configuration constants

### 5.5 Layout Builders (UI Presentation)
**Purpose:** Transform calculation results into display-ready formats

**Components:**
- **Calculation Detail Builder**: Creates "Detail van de berekening" rows
- **Key-Values Cards Builder**: Creates simplified return cards
- **Vereenvoudigde Aangifte Builder**: Provides default declaration structure

### 5.6 Utility Services
**Purpose:** Provide common functionality across the application

**Services:**
- **Formatting Service**: Number and currency formatting with Belgian standards
- **Logging Service**: Centralized application logging
- **Storage Service**: Data persistence with localStorage

---

## 6. Data Flow

### 6.1 Reactive State Management
```typescript
// Single source of truth in MainCalculationEngineService
private dataSubject: BehaviorSubject<TaxData | null>;
private resultsSubject: BehaviorSubject<TaxCalculationResults | null>;
private isLoadingSubject: BehaviorSubject<boolean>;
```

### 6.2 Data Flow Process
1. **User Input** → Components call service methods
2. **State Update** → Service updates BehaviorSubject
3. **Tax Year Calculation** → Service determines applicable tax year
4. **Core Engine Call** → Service calls `runCoreEngine()` with current data and tax year
5. **Layout Building** → Service calls layout builders with core results
6. **UI Update** → Components automatically update via RxJS subscriptions

### 6.3 Step-Aware Calculations
- **Step 2**: Uses current prepayment values for real-time editing
- **Step 3**: Uses suggested prepayment values for simulation
- **Step 4**: Displays comprehensive tax overview with commit functionality
- Always shows original values for comparison in Step 3

### 6.4 Navigation Flow
- **Step 1**: Validates period and tax year before allowing progression
- **Step 2-4**: Flexible navigation after Step 1 completion
- **Step 3**: Save confirmation dialog when navigating away with changes
- **Step 4**: Persistent committed state management

---

## 7. Getting Started

### 7.1 For Developers

**Prerequisites:**
- Node.js and Angular CLI

**Setup:**
```bash
npm install
npm start  # Runs on localhost:4200
```

**Key Files to Understand:**
1. `services/core-engine/main-calculation-engine.service.ts` - Start here
2. `services/core-engine/calculation-core.ts` - Pure calculation logic
3. `services/core-engine/prepayment.service.ts` - Prepayment business logic
4. `services/core-engine/parameters.ts` - Tax year parameters
5. `services/types/tax-data.types.ts` - All data structures
6. `workflow/Invoermethode.ts` - Enhanced Step 1 with navigation logic
7. `workflow/commit-voorafbetalingen.component.ts` - New Step 4 implementation

**Development Guidelines:**
- Keep calculation logic in `calculation-core.ts` (pure functions)
- Add state management to `MainCalculationEngineService`
- Use layout builders for UI presentation
- Follow step-aware logic patterns
- Implement tax year-aware calculations
- Place unit tests in the separate `unit-tests/` directory
- Maintain navigation consistency across steps

### 7.2 For Business Analysts

**Key Business Rules:**
- **Reduced Rate**: 20% for first €100,000 (if eligible)
- **Standard Rate**: 25% for amounts above €100,000
- **Vermeerdering**: Dynamic penalty rates (8% for 2024, 8.5% for 2025, 9% for 2026)
- **De Minimis**: No penalty if amount ≤ €50 or 0.5% of tax base
- **Korfbeperking**: Limits section 6 deductions
- **Tax Year Parameters**: Quarterly rates and thresholds vary by year

**Calculation Steps:**
1. Determine applicable tax year from period data
2. Sum declaration sections
3. Apply intermediate calculations
4. Apply tax rates
5. Process prepayments
6. Calculate penalties with year-specific rates
7. Optimize prepayments
8. Commit to selected declaration

**User Workflow:**
1. Confirm period and tax year (Step 1)
2. Input financial data (Step 2)
3. See real-time calculations
4. Optimize prepayments (Step 3)
5. Compare original vs. suggested values
6. Commit prepayments to declaration (Step 4)
7. View persistent committed state

---

## 8. Technical Stack

- **Framework**: Angular 20+
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: RxJS (BehaviorSubject)
- **Persistence**: localStorage
- **Testing**: Jasmine/Karma

---

## 9. Recent Enhancements

### 9.1 Enhanced Step 1 (Invoermethode)
- **Period Validation**: Robust tax year calculation and validation
- **Navigation Logic**: Step prerequisites and visual feedback
- **Tax Year Parameters**: Dynamic parameter management for 2024-2026

### 9.2 New Step 4 (Commit Voorafbetalingen)
- **Comprehensive Overview**: Tax calculation results and prepayment breakdown
- **Declaration Management**: Selection and commit functionality
- **Persistent State**: Committed state remains visible after commit
- **Core Engine Integration**: Uses existing calculation components for consistency

### 9.3 Navigation Improvements
- **Step Validation**: Prevents skipping required steps
- **Save Confirmation**: Prompts for unsaved changes in Step 3
- **Visual Feedback**: Clear indication of blocked steps
- **Flexible Navigation**: Free movement after Step 1 completion

### 9.4 Tax Year Support
- **Dynamic Parameters**: Year-specific rates and thresholds
- **Multi-Year Calculations**: Support for 2024, 2025, 2026
- **Backward Compatibility**: Maintains existing functionality

### 9.5 UI/UX Refinements
- **Color Consistency**: Reduced color palette in Step 4
- **Component Reuse**: Leverages existing calculation components
- **Responsive Design**: Improved layout and mobile experience

---

## 10. Future Enhancements

- Additional tax credits and deductions
- Advanced prepayment optimization algorithms
- Integration with accounting software
- Multi-year planning capabilities
- Export functionality (PDF, Excel)
- Multi-language support
- Real-time collaboration features
- Advanced validation and error handling

*For detailed calculation documentation, see `CALCULATION_DOCUMENTATION.md`*
