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

The application is centered around two main functionalities, supported by robust data management.

### 2.1 Vereenvoudigde Aangifte (Simplified Declaration)

This is the main screen where users can input their financial data according to the official Belgian corporate tax form.
- Users can fill in various codes corresponding to their financial results.
- The application automatically calculates subtotals and the final taxable base in real-time.
- Key flags, like eligibility for a reduced tax rate or exemptions for new companies, can be set here.

### 2.2 Voorschotten Optimaliseren (Prepayment Optimization)

This feature helps users plan their quarterly tax prepayments to avoid penalties.
- Based on the calculated tax liability, it suggests prepayment amounts.
- It offers several strategies, such as aiming for zero tax due at the end of the year or simply avoiding any penalties.
- Users can see the immediate impact of their prepayment strategy on the final amount to be paid or refunded.

### 2.3 Data Persistence and Management

To enhance user experience, the application includes a data persistence feature.
- All input data is automatically saved to the browser's `localStorage`.
- This means data persists across browser sessions and page refreshes.
- Users can also:
    - **Reset** all fields to their default values.
    - **Clear** all saved data.

---

## Chapter 3: The Calculation Engine

The core of the simulator is its detailed and reactive calculation engine. It mirrors the official Belgian corporate tax calculation rules.

### 3.1 From Raw Data to Taxable Income

The calculation follows a multi-step process to arrive at the taxable income.

1.  **Section Totals**: The application first aggregates the values from different sections of the tax form.
2.  **Intermediate Calculations**: It computes several intermediate values (`Code 1430`, `Code 1440`) which form the basis for further deductions.
3.  **Korfbeperking (Basket Limitation)**: A key rule in Belgian corporate tax is the "basket limitation," which limits the deductibility of certain tax assets (like previous losses). The calculation is:
    ```
    Korfbeperking = MIN(Code 1440, 1,000,000) + MAX(0, Code 1440 - 1,000,000) × 0.7
    ```
4.  **Final Taxable Base (Code 1460)**: After applying the basket limitation, the final taxable base for the standard tax rate is determined.

### 3.2 Tax Rate Application

The system applies the correct tax rates:
- **Reduced Rate**: 20% on the first €100,000 of taxable income, if the company is eligible.
- **Standard Rate**: 25% on the remaining amount (or the full amount if not eligible for the reduced rate).
- **Separate Taxation**: Certain items, like the liquidation reserve (`Code 1508`), are taxed separately (at 10%).

### 3.3 Calculating the Final Tax Due

1.  **Initial Tax (Saldo 1)**: The tax is calculated based on the taxable income and applicable rates.
2.  **Deduction of Prepayments/Credits (Voorheffingen)**: Non-refundable (`Code 1830`) and refundable (`Code 1840`) prepayments are deducted. The non-refundable part cannot exceed the initial tax amount. This gives `Saldo 2`.
3.  **Vermeerdering (Increase for Insufficient Prepayments)**: If prepayments are insufficient, a penalty is calculated. This is `9%` of the tax base (`Saldo 2`).
    - A **de-minimis rule** applies, waiving the penalty if it's below a certain threshold.
    - Quarterly prepayments (VA1 to VA4) provide a "credit" that reduces this penalty, with earlier payments providing a larger benefit (12% for VA1, down to 6% for VA4).
    - **Small companies** in their first three years are exempt from this penalty.
4.  **Final Amount**: The final amount to be paid or refunded is calculated by taking `Saldo 2` and adding any penalty (`Vermeerdering`) and separately taxed items.

*For a complete, field-by-field breakdown of the calculation logic, please refer to the `CALCULATION_DOCUMENTATION.md` file.*

---

## Chapter 4: Technical Deep Dive

### 4.1 Technology Stack

- **Framework**: Angular (v20+)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: RxJS (BehaviorSubject)
- **Development Server**: Angular CLI

### 4.2 Project Structure

The codebase is organized within the `src/app/` directory:

```
src/app/
├── components/         # Reusable UI components
│   ├── base-tax.component.ts
│   ├── calculation-details.component.ts
│   ├── formatted-number-input.component.ts
│   └── ...
├── services/           # Core application logic and services
│   ├── tax-data.service.ts
│   └── number-formatting.service.ts
├── tax-simulator/      # Main application view container
│   ├── tax-simulator.html
│   └── tax-simulator.ts
├── vereenvoudigde-aangifte/ # Component for the main declaration form
│   ├── vereenvoudigde-aangifte.component.html
│   └── vereenvoudigde-aangifte.component.ts
└── voorschotten-optimaliseren/ # Component for prepayment optimization
    ├── voorschotten-optimaliseren.component.html
    └── voorschotten-optimaliseren.component.ts
```

### 4.3 Core Components & Services

- **`TaxDataService`**: This is the brain of the application. It's a singleton service (`providedIn: 'root'`) that:
    - Holds the entire application state in RxJS `BehaviorSubject`s.
    - Contains all the tax calculation logic.
    - Manages data persistence to and from `localStorage`.
    - Exposes public methods for components to interact with the data and trigger recalculations.

- **`VereenvoudigdeAangifteComponent`**: This component renders the main tax declaration form. It subscribes to the `TaxDataService` to display the latest data and calls the service's methods to update values when the user enters data.

- **`VoorschottenOptimaliserenComponent`**: This component handles the prepayment optimization screen. It uses the calculated tax liability from `TaxDataService` and runs optimization scenarios. User selections for optimization strategies are sent back to the service.

- **`FormattedNumberInputComponent`**: A reusable component to ensure consistent handling and display of numerical inputs throughout the application.

### 4.4 Data Flow and State Management

The application uses a reactive data flow model powered by RxJS.

1.  **Single Source of Truth**: `TaxDataService` holds the application state. All data, from user inputs to calculated results, lives here.
2.  **Observables**: Components subscribe to observables exposed by the service to get the data they need to display. For example, `taxData$ = this.taxDataService.taxData$`.
3.  **Data Updates**: When a user changes an input field, the component calls an update method on `TaxDataService` (e.g., `updateField(code, value)`).
4.  **Reactive Calculations**: Inside the service, updating a value triggers a chain of calculations. Because the state is held in `BehaviorSubject`s, any change automatically triggers recalculations for dependent values.
5.  **UI Updates**: Since the components are subscribed to the data observables, any change in the service's state is automatically reflected in the UI without any manual intervention. This creates a seamless and real-time user experience. Updates are debounced to prevent performance issues on rapid inputs.

---

## Chapter 5: Getting Started for Developers

### 5.1 Prerequisites

- [Node.js](https://nodejs.org/) (which includes npm)
- [Angular CLI](https://angular.dev/tools/cli)

### 5.2 Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    ```
2.  Navigate to the project directory:
    ```bash
    cd Sofisk-Tax-Simulator
    ```
3.  Install the dependencies:
    ```bash
    npm install
    ```

### 5.3 Running the Application

To start the local development server, run:
```bash
ng serve
```
Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

### 5.4 Building for Production

To create a production build, run:
```bash
ng build
```
The build artifacts will be stored in the `dist/` directory.

### 5.5 Running Tests

To run the unit tests via [Karma](https://karma-runner.github.io):
```bash
ng test
```
