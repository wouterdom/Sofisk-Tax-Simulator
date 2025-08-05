# Sofisk Tax Simulator: Project Overview

## 1. Introduction

The Sofisk Tax Simulator is a web-based tool for Belgian corporations to estimate corporate tax liability and optimize quarterly prepayments (`voorafbetalingen`) to avoid penalties.

**Primary Goals:**
- Real-time corporate tax estimation
- Prepayment optimization to minimize penalties (`vermeerdering`)
- User-friendly interface for accountants, tax advisors, and business owners

**Target Users:**
- Accountants and Tax Advisors
- Business Owners and CFOs
- New developers joining the project

---

## 2. Core Features

### 2.1 Three-Step Workflow

**Step 1: Input Method Selection**
- Manual entry or import from previous year

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

### 2.2 Data Management
- Automatic localStorage persistence
- Reset to defaults, clear data, commit simulation values
- Step persistence across browser sessions

---

## 3. Architecture Overview

The system uses a **three-layer architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    UI Components                            │
│  (VereenvoudigdeAangifte, VoorschottenOptimaliseren)       │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│              MainCalculationEngineService                   │
│                    (Orchestration Layer)                    │
│  • State Management (RxJS BehaviorSubjects)                │
│  • Data Persistence (localStorage)                         │
│  • Step Context Management                                 │
│  • Coordinates Core Engine & Layout Builders               │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                    Core Engine                              │
│  • Pure Mathematical Calculations                           │
│  • Business Logic Implementation                            │
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
│   │   └── parameters.ts               # Calculation parameters
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
│   ├── Invoermethode.html/.ts          # Step 1: Input method selection
│   ├── vereenvoudigde-aangifte.component.html/.ts  # Step 2: Declaration
│   └── voorschotten-optimaliseren.component.html/.ts  # Step 3: Optimization
├── components/                         # Reusable UI components
│   ├── base-tax.component.ts           # Base tax calculation component
│   ├── calculation-details.component.ts # Calculation breakdown display
│   ├── formatted-number-input.component.ts # Number input with formatting
│   ├── loading-indicator.component.ts  # Loading state indicator
│   ├── prepayment.component.ts         # Prepayment input component
│   └── ui-classes.directive.ts         # Dynamic CSS class management
├── header/                             # Application header
└── unit-tests/                         # Unit tests (separate directory)
    └── services/                       # Service-specific tests
```

---

## 5. Key Services Explained

### 5.1 MainCalculationEngineService (Orchestration Layer)
**Purpose:** Coordinates the entire calculation system

**Key Responsibilities:**
- **State Management**: Uses RxJS BehaviorSubjects for reactive data flow
- **Data Persistence**: Handles localStorage operations
- **Step Context**: Manages which prepayment values to use (current vs. suggested)
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

### 5.2 Calculation Core (Pure Math Layer)
**Purpose:** Contains all Belgian corporate tax calculation logic

**Characteristics:**
- Pure mathematical functions
- No side effects or UI dependencies
- Easily testable and reusable
- Implements official Belgian tax rules

**Calculation Flow:**
1. Section aggregation (sums fields within sections)
2. Intermediate calculations (ResterendResultaat, GrondslagVoorBerekeningKorf)
3. Korfbeperking application (basket limitation rules)
4. Tax rate application (20% reduced + 25% standard)
5. Voorheffingen processing (prepayments)
6. Vermeerdering calculation (9% penalty with de-minimis rules)
7. Prepayment optimization

### 5.3 PrepaymentService (Business Logic)
**Purpose:** Handles prepayment-specific calculations and optimization

**Key Features:**
- Calculate total prepayments
- Suggest optimal prepayment strategies
- Handle different concentration methods (spread, Q1-Q4)
- Implement "Saldo Nul" calculations

### 5.4 Layout Builders (UI Presentation)
**Purpose:** Transform calculation results into display-ready formats

**Components:**
- **Calculation Detail Builder**: Creates "Detail van de berekening" rows
- **Key-Values Cards Builder**: Creates simplified return cards
- **Vereenvoudigde Aangifte Builder**: Provides default declaration structure

### 5.5 Utility Services
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
3. **Core Engine Call** → Service calls `runCoreEngine()` with current data
4. **Layout Building** → Service calls layout builders with core results
5. **UI Update** → Components automatically update via RxJS subscriptions

### 6.3 Step-Aware Calculations
- **Step 2**: Uses current prepayment values for real-time editing
- **Step 3**: Uses suggested prepayment values for simulation
- Always shows original values for comparison in Step 3

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
4. `services/types/tax-data.types.ts` - All data structures

**Development Guidelines:**
- Keep calculation logic in `calculation-core.ts` (pure functions)
- Add state management to `MainCalculationEngineService`
- Use layout builders for UI presentation
- Follow step-aware logic patterns
- Place unit tests in the separate `unit-tests/` directory

### 7.2 For Business Analysts

**Key Business Rules:**
- **Reduced Rate**: 20% for first €100,000 (if eligible)
- **Standard Rate**: 25% for amounts above €100,000
- **Vermeerdering**: 9% penalty for insufficient prepayments
- **De Minimis**: No penalty if amount ≤ €50 or 0.5% of tax base
- **Korfbeperking**: Limits section 6 deductions

**Calculation Steps:**
1. Sum declaration sections
2. Apply intermediate calculations
3. Apply tax rates
4. Process prepayments
5. Calculate penalties
6. Optimize prepayments

**User Workflow:**
1. Input financial data (Step 2)
2. See real-time calculations
3. Optimize prepayments (Step 3)
4. Compare original vs. suggested values
5. Commit or discard changes

---

## 8. Technical Stack

- **Framework**: Angular 20+
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: RxJS (BehaviorSubject)
- **Persistence**: localStorage
- **Testing**: Jasmine/Karma

---

## 9. Future Enhancements

- Additional tax credits and deductions
- Advanced prepayment optimization algorithms
- Integration with accounting software
- Multi-year planning capabilities
- Export functionality (PDF, Excel)
- Multi-language support

*For detailed calculation documentation, see `CALCULATION_DOCUMENTATION.md`*
