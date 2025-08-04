# Sofisk Tax Simulator: Project Overview

## Chapter 1: Introduction

### 1.1 The Goal of the Application

The Sofisk Tax Simulator is a web-based tool designed to help Belgian corporations estimate their corporate tax liability. It provides a user-friendly interface to simulate the "vereenvoudigde aangifte" (simplified declaration) and optimize tax prepayments to avoid penalties.

The primary goals are:
- To provide an accurate and real-time estimation of corporate taxes.
- To help users understand the impact of different financial figures on their final tax bill.
- To offer strategies for optimizing quarterly prepayments (`voorafbetalingen`) to minimize or eliminate increases for insufficient prepayments (`vermeerdering`).
- To serve as a practical tool for financial planners, accountants, and business owners in Belgium.

### 1.2 Target Audience

This application is built for:
- **Accountants and Tax Advisors**: Who need a quick way to simulate tax scenarios for their clients.
- **Business Owners and CFOs**: Who want to understand and plan their company's tax obligations.
- **New Developers**: Who are joining the project and need a comprehensive guide to the codebase and its functionality.

---

## Chapter 2: Core Features

The application is centered around a three-step workflow, supported by robust data management and calculation engines.

### 2.1 Step 1: Input Method Selection
Users can choose how to input their financial data:
- **Manual Entry**: Direct input of all tax declaration fields
- **Previous Year Basis**: Import data from the previous year's declaration

### 2.2 Step 2: Vereenvoudigde Aangifte (Simplified Declaration)

This is the main screen where users can input their financial data according to the official Belgian corporate tax form.
- Users can fill in various codes corresponding to their financial results across nine declaration sections.
- The application automatically calculates subtotals and the final taxable base in real-time.
- Key flags, like eligibility for a reduced tax rate or exemptions for new companies, can be set here.
- **Detail van de berekening**: Shows the complete calculation breakdown using current input values.

### 2.3 Step 3: Voorschotten Optimaliseren (Prepayment Optimization)

This feature helps users plan their quarterly tax prepayments to avoid penalties.
- Based on the calculated tax liability, it suggests prepayment amounts using various strategies.
- It offers several optimization goals:
  - **Avoid Penalties**: Minimize vermeerdering (increase for insufficient prepayments)
  - **Saldo Nul**: Calculate prepayments that result in zero taxes to be paid
  - **Custom Strategy**: User-defined prepayment distribution
- Users can see the immediate impact of their prepayment strategy on the final amount to be paid or refunded.
- **Detail van de berekening**: Shows the complete calculation breakdown using suggested prepayment values.
- **Original Values**: Always displays the original prepayment values for comparison.

### 2.4 Data Persistence and Management

To enhance user experience, the application includes comprehensive data persistence features.
- All input data is automatically saved to the browser's `localStorage`.
- This means data persists across browser sessions and page refreshes.
- Users can also:
    - **Reset** all fields to their default values.
    - **Clear** all saved data.
    - **Commit** simulation values from Step 3 to make them permanent.

---

## Chapter 3: The Calculation Engine Architecture

The core of the simulator is its sophisticated, multi-layered calculation engine that mirrors the official Belgian corporate tax calculation rules. The architecture is designed for clarity, maintainability, and separation of concerns.

### 3.1 Architecture Overview

The calculation system is divided into three distinct layers:

```
┌─────────────────────────────────────────────────────────────┐
│                    UI Components                            │
│  (VereenvoudigdeAangifte, VoorschottenOptimaliseren)       │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│              MainCalculationEngineService                   │
│  • State Management (RxJS BehaviorSubjects)                │
│  • Data Persistence (localStorage)                         │
│  • Step Context Management                                 │
│  • Orchestration of Core Engine & Layout Builders          │
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

### 3.2 Core Engine (`calculation-core.ts`)

The core engine is the **pure mathematical calculation layer** that contains all the business logic for Belgian corporate tax calculations. It has no dependencies on UI components or Angular services.

#### Key Characteristics:
- **Pure Functions**: All calculations are pure mathematical functions
- **No Side Effects**: Does not modify external state or make API calls
- **Testable**: Easy to unit test in isolation
- **Reusable**: Can be used in different contexts (web, mobile, server)

#### Input Interface (`CoreEngineInput`):
```typescript
interface CoreEngineInput {
  declarationSections: DeclarationSection[];
  canUseReducedRate: boolean;
  prepayments: Prepayments;
  isSmallCompanyFirstThreeYears: boolean;
  prepaymentCalculationGoal: PrepaymentCalculationGoal;
  prepaymentConcentration: PrepaymentConcentration;
  prepaymentStrategy: PrepaymentStrategy;
}
```

#### Output Interface (`CoreEngineOutput`):
The core engine returns comprehensive calculation results including:
- **Section Totals**: Aggregated values from declaration sections
- **Intermediate Calculations**: ResterendResultaat, GrondslagVoorBerekeningKorf, etc.
- **Tax Rate Applications**: Reduced rate (20%) and standard rate (25%) calculations
- **Final Results**: Taxable income, total tax liability, final tax due
- **Prepayment Optimization**: Required prepayments, current prepayments, suggested prepayments

#### Calculation Flow:
1. **Section Aggregation**: Sums all fields within each declaration section
2. **Intermediate Calculations**: 
   - `ResterendResultaat = ResultaatVanHetBelastbareTijdperkTotal - BestanddelenVhResultaatAftrekbeperking`
   - `GrondslagVoorBerekeningKorf = ResterendResultaat - AftrekkenVanDeResterendeWinstTotal`
3. **Korfbeperking Application**: Limits section 6 deductions based on basket limitation rules
4. **Tax Rate Application**: Applies 20% reduced rate (if eligible) and 25% standard rate
5. **Voorheffingen Processing**: Handles non-refundable (Code 1830) and refundable (Code 1840) prepayments
6. **Vermeerdering Calculation**: 9% penalty for insufficient prepayments with de-minimis rules
7. **Prepayment Optimization**: Calculates suggested prepayments based on user strategy

### 3.3 Main Calculation Engine Service (`main-calculation-engine.service.ts`)

The main calculation engine service is the **orchestration layer** that manages the application state, coordinates between components, and handles the step-specific logic.

#### Key Responsibilities:
- **State Management**: Uses RxJS BehaviorSubjects for reactive data flow
- **Data Persistence**: Handles localStorage operations
- **Step Context**: Manages which prepayment values to use (current vs. suggested)
- **Core Engine Coordination**: Calls the core engine with appropriate inputs
- **Layout Builder Coordination**: Provides data to UI presentation builders
- **Reactive Updates**: Triggers recalculations when data changes

#### Step-Specific Logic:
The service implements sophisticated step-aware calculation logic:

```typescript
// Step 2: Use current prepayments (values being edited by user)
// Step 3: Use suggested prepayments (simulation values)
const prepaymentsForDetail = this.getCurrentStep() === 3 
  ? core.suggestedPrepayments 
  : data.prepayments;

// Calculate final tax payable based on the prepayments used for this step
const finalTaxPayableForStep = this.getCurrentStep() === 3 
  ? core.saldo2 - (core.suggestedPrepayments.va1 + ...) + detail.vermeerderingTotal + ...
  : this.getCurrentStep() === 2
    ? core.saldo2 - (data.prepayments.va1 + ...) + detail.vermeerderingTotal + ...
    : core.finalTaxPayable;
```

#### Key Methods:
- `calculateTaxResults()`: Main calculation orchestration
- `updateDeclarationSections()`: Updates tax declaration data
- `updatePrepayments()`: Updates prepayment values
- `forceRecalculation()`: Triggers immediate recalculation
- `getCommittedPrepayments()`: Returns saved prepayment values

### 3.4 Layout Builders (`layout-structuur/`)

The layout builders are responsible for **UI presentation logic** and transform the core calculation results into display-ready formats.

#### Calculation Detail Builder (`calculation-detail.builder.ts`):
- **Purpose**: Creates the "Detail van de berekening" rows for UI display
- **Input**: Core calculation values (reducedRateBase, standardRateBase, etc.)
- **Output**: Structured rows with descriptions, amounts, rates, and results
- **Sections**: Calculation rows, Voorheffingen rows, Vermeerdering rows, Result rows

#### Key-Values Cards Builder (`Key-values-Cards.ts`):
- **Purpose**: Creates simplified return cards for quick overview
- **Input**: Core calculation totals
- **Output**: High-level summary cards

#### Vereenvoudigde Aangifte Builder (`Vereenvoudigde-aangifte.ts`):
- **Purpose**: Provides default tax declaration structure
- **Input**: None (static data)
- **Output**: Default declaration sections with field definitions

---

## Chapter 4: Data Flow and State Management

The application uses a sophisticated reactive data flow model powered by RxJS.

### 4.1 Single Source of Truth
`MainCalculationEngineService` holds the application state in RxJS `BehaviorSubject`s:
- `dataSubject`: Contains all user input data (`TaxData`)
- `resultsSubject`: Contains all calculation results (`TaxCalculationResults`)
- `isLoadingSubject`: Tracks calculation state

### 4.2 Reactive Data Flow
1. **User Input**: Components call service methods (e.g., `updateDeclarationSections()`)
2. **State Update**: Service updates the appropriate BehaviorSubject
3. **Core Engine Call**: Service calls `runCoreEngine()` with current data
4. **Layout Building**: Service calls layout builders with core results
5. **UI Update**: Components automatically update via RxJS subscriptions

### 4.3 Step-Aware Calculations
The system implements sophisticated step-aware logic:

**Step 2 (Vereenvoudigde Aangifte)**:
- Uses `data.prepayments` (current input values)
- Shows calculation based on what user is currently editing
- Detail calculation matches input fields exactly

**Step 3 (Voorschotten Optimaliseren)**:
- Uses `core.suggestedPrepayments` (simulation values)
- Shows calculation based on optimized prepayment strategy
- Always displays original values for comparison

### 4.4 Data Persistence Strategy
- **Automatic Saving**: All changes are automatically saved to localStorage
- **Step Persistence**: Current step is saved and restored on page reload
- **Commit Mechanism**: Step 3 simulation values can be committed to make them permanent
- **Revert Capability**: Users can discard simulation values and return to original

---

## Chapter 5: Technical Deep Dive

### 5.1 Technology Stack

- **Framework**: Angular (v20+)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: RxJS (BehaviorSubject)
- **Development Server**: Angular CLI

### 5.2 Project Structure

The codebase is organized within the `src/app/` directory:

```
src/app/
├── components/                    # Reusable UI components
│   ├── base-tax.component.ts
│   ├── calculation-details.component.ts
│   ├── formatted-number-input.component.ts
│   ├── loading-indicator.component.ts
│   ├── ui-classes.directive.ts
│   └── voorafbetalingen.component.ts
├── services/                      # Core application logic
│   ├── main-calculation-engine.service.ts  # Main orchestration service
│   ├── core-engine/               # Pure calculation logic
│   │   └── calculation-core.ts
│   ├── layout-structuur/          # UI presentation builders
│   │   ├── calculation-detail.builder.ts
│   │   ├── Key-values-Cards.ts
│   │   └── Vereenvoudigde-aangifte.ts
│   ├── tax-data.types.ts          # TypeScript interfaces
│   ├── tax-constants.ts           # Tax rates and constants
│   ├── tax-enums.ts               # Enum definitions
│   ├── prepayment.service.ts      # Prepayment-specific logic
│   ├── tax-storage.service.ts     # Data persistence
│   ├── number-formatting.service.ts
│   ├── logging.service.ts
│   └── tax-error.ts
├── Workflow-steps/                # Main application views
│   ├── Invoermethode.ts           # Step navigation component
│   ├── Invoermethode.html
│   ├── vereenvoudigde-aangifte.component.ts
│   ├── vereenvoudigde-aangifte.component.html
│   ├── voorschotten-optimaliseren.component.ts
│   └── voorschotten-optimaliseren.component.html
├── header/                        # Application header
│   ├── header.ts
│   ├── header.html
│   └── header.css
└── unit-tests/                    # Unit tests
    └── services/
        ├── logging.service.spec.ts
        ├── prepayment.service.spec.ts
        ├── tax-calculation.service.spec.ts
        └── tax-storage.service.spec.ts
```

### 5.3 Core Components & Services

#### MainCalculationEngineService
This is the **central orchestration service** that:
- Manages application state using RxJS BehaviorSubjects
- Coordinates between core engine and layout builders
- Handles step-specific calculation logic
- Manages data persistence to localStorage
- Provides reactive data flow to components

#### Core Engine (`calculation-core.ts`)
This is the **pure calculation layer** that:
- Contains all Belgian corporate tax calculation logic
- Has no dependencies on UI or Angular
- Is easily testable and reusable
- Returns comprehensive calculation results

#### Layout Builders
These are **UI presentation layers** that:
- Transform core calculation results into display-ready formats
- Create structured rows for "Detail van de berekening"
- Build simplified return cards
- Provide default declaration structures

#### Workflow Components
- **TaxSimulatorComponent**: Manages step navigation and workflow
- **VereenvoudigdeAangifteComponent**: Handles tax declaration input
- **VoorschottenOptimaliserenComponent**: Manages prepayment optimization

### 5.4 Calculation Methodology

The calculation follows the official Belgian corporate tax rules:

1. **Section Aggregation**: Sums all fields within each declaration section
2. **Intermediate Calculations**: 
   - ResterendResultaat (Code 1430)
   - GrondslagVoorBerekeningKorf (Code 1440)
3. **Korfbeperking Application**: Limits section 6 deductions
4. **Tax Rate Application**: 20% reduced rate (if eligible) + 25% standard rate
5. **Voorheffingen Processing**: Non-refundable (Code 1830) and refundable (Code 1840)
6. **Vermeerdering Calculation**: 9% penalty with de-minimis rules
7. **Prepayment Optimization**: Strategy-based prepayment suggestions

*For complete calculation details, see `CALCULATION_DOCUMENTATION.md`*

---

## Chapter 6: Getting Started for Developers

### 6.1 Prerequisites

- [Node.js](https://nodejs.org/) (which includes npm)
- [Angular CLI](https://angular.dev/tools/cli)

### 6.2 Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```bash
   cd Sofisk-Tax-Simulator
   ```
3. Install the dependencies:
   ```bash
   npm install
   ```

### 6.3 Running the Application

To start the local development server, run:
```bash
npm start
```
Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

### 6.4 Building for Production

To create a production build, run:
```bash
ng build
```
The build artifacts will be stored in the `dist/` directory.

### 6.5 Running Tests

To run the unit tests via [Karma](https://karma-runner.github.io):
```bash
ng test
```

### 6.6 Development Guidelines

#### Architecture Principles
1. **Separation of Concerns**: Keep calculation logic separate from UI logic
2. **Pure Functions**: Core engine should contain only pure mathematical functions
3. **Reactive Design**: Use RxJS for state management and data flow
4. **Step Awareness**: Always consider which step the user is in when making calculations
5. **Type Safety**: Use TypeScript interfaces for all data structures

#### Adding New Features
1. **Core Logic**: Add to `calculation-core.ts` if it's pure calculation
2. **State Management**: Add to `MainCalculationEngineService` if it's state-related
3. **UI Presentation**: Add to appropriate layout builder if it's display-related
4. **Types**: Update `tax-data.types.ts` for new data structures
5. **Constants**: Update `tax-constants.ts` for new constants

#### Testing Strategy
- **Unit Tests**: Test core engine functions in isolation
- **Service Tests**: Test MainCalculationEngineService methods
- **Component Tests**: Test UI component behavior
- **Integration Tests**: Test complete workflows

---

## Chapter 7: Key Features and Capabilities

### 7.1 Real-Time Calculations
- All calculations update automatically when data changes
- Debounced updates prevent performance issues
- Step-aware calculations show appropriate values

### 7.2 Prepayment Optimization
- Multiple optimization strategies (spread, Q1-Q4 concentration)
- "Saldo Nul" calculation for zero tax liability
- Penalty avoidance calculations
- Visual comparison of original vs. suggested values

### 7.3 Data Management
- Automatic persistence to localStorage
- Import from previous year data
- Reset and clear functionality
- Commit/discard simulation values

### 7.4 User Experience
- Three-step guided workflow
- Real-time validation and feedback
- Detailed calculation breakdowns
- Responsive design with Tailwind CSS

### 7.5 Technical Excellence
- Clean architecture with separation of concerns
- Comprehensive TypeScript typing
- Reactive programming with RxJS
- Unit test coverage
- Performance optimized with debouncing

---

## Chapter 8: Future Enhancements

The following features are planned for future implementation:
- Additional tax credits and deductions
- More sophisticated prepayment optimization algorithms
- Integration with accounting software
- Multi-year planning capabilities
- Advanced reporting and analysis tools
- Export functionality (PDF, Excel)
- Multi-language support
- Advanced validation rules
- Audit trail and change history
