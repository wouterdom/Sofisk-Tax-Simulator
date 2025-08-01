# Chapter 3: Prepayment Optimization Implementation Plan (v5)

## Project Status

This section tracks our progress.

*   **[COMPLETED]** **Phase 1: Planning & Foundational Logic**
    *   **[Done]** Created and refined the implementation plan.
    *   **[Done]** Updated `tax-data.service.ts` with the core suggestion logic (`_calculateSuggestedPrepayments`).
    *   **[Done]** Added new state management properties to the service.
    *   **[Done]** Implemented public methods in the service to control the new logic.

*   **[COMPLETED]** **Phase 2: UI Implementation**
    *   **[Done]** Updated `voorschotten-optimaliseren.component.ts` to connect to the new service methods.
    *   **[Done]** Built the two-column HTML layout.
    *   **[Done]** Connected all UI controls to the component's logic.
    *   **[Done]** Fixed all linter errors and binding issues.

*   **[CURRENT]** **Phase 3: Testing & Validation**
    *   **Next Step:** Manually test the calculation logic with various scenarios to ensure accuracy and identify edge cases.

*   **[PENDING]** **Phase 4: Refinement & Completion**
    *   Based on testing feedback, make necessary adjustments to the calculation logic or UI.
    *   Final review and sign-off.

---

This document outlines the proposed steps for implementing the Prepayment Optimization feature.

## 1. Reusing the Existing Calculation Engine (Completed)

This phase is complete. We have successfully integrated with the existing logic in `tax-data.service.ts`.

## 2. Implementing the Optimization Logic (Completed)

This phase is complete. The new suggestion logic has been implemented in the `_calculateSuggestedPrepayments` method within the service.

## 3. UI and Data Flow Integration (Completed)

This phase is complete. The `voorschotten-optimaliseren` component and its template are fully connected to the data service and reflect the new functionality.

## 4. Testing and Validation Plan

This new phase is critical to ensure the feature is working correctly.

### Testing Scenarios

We will manually execute the following tests to validate the `_calculateSuggestedPrepayments` logic:

1.  **Scenario: "Geen Vermeerdering"**
    *   **Input:** Enter a base tax liability that results in a significant `saldo2` (e.g., €10,000).
    *   **Action:** Select the "Geen vermeerdering" radio button.
    *   **Expected Outcome:**
        *   The four prepayment fields should auto-populate with the calculated amount to precisely offset the tax increase (i.e., `saldo2 * 0.25`).
        *   In the right-hand panel, the "Vermeerdering wegens ontoereikende voorafbetalingen" should be €0.00.

2.  **Scenario: "Saldo belasting = 0"**
    *   **Input:** Use the same base tax liability.
    *   **Action:** Select the "Saldo belasting = 0" radio button.
    *   **Expected Outcome:**
        *   The four prepayment fields should auto-populate with an amount equal to `finalTaxPayable / 4`.
        *   In the right-hand panel, the final "Te betalen belastingen" should be €0.00.

3.  **Scenario: Manual Override**
    *   **Action:** After selecting a strategy, manually change the value in one of the prepayment input fields.
    *   **Expected Outcome:**
        *   The right-hand panel should immediately recalculate and display the new, non-zero "Vermeerdering" and final "Te betalen belastingen" based on the manual input.

4.  **Scenario: "isSmallCompanyFirstThreeYears" flag**
    *   **Input:** Ensure the "Vrijstelling vermeerdering (eerste 3 boekjaren)" checkbox is checked on the previous screen.
    *   **Action:** Select the "Geen vermeerdering" radio button.
    *   **Expected Outcome:**
        *   The four prepayment fields should populate with €0.00, as no increase is due.
        *   The right-hand panel should show that the tax increase is not applicable.

5.  **Scenario: "Reeds ingegeven voorafbetalingen negeren"**
    *   **Input:** Have existing prepayment values from the previous screen.
    *   **Action:** Select the "Reeds ingegeven voorafbetalingen negeren" radio button.
    *   **Expected Outcome:**
        *   The four prepayment input fields on the left should all reset to €0.00.
        *   The right-hand panel should recalculate based on zero prepayments.
