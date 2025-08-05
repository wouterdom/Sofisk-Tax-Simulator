# Book Year Duration Implementation Plan

## Overview
This document outlines the implementation plan for handling book years (boekjaar) of different durations in the Sofisk Tax Simulator. The system needs to handle short book years (< 12 months), normal book years (12 months), and long book years (> 12 months) with different prepayment rules and vermeerdering percentages.

## Business Requirements Analysis

### 1. Book Year Duration Classification
- **Short Book Year**: Less than 12 months
- **Normal Book Year**: Exactly 12 months
- **Long Book Year**: More than 12 months

### 2. Prepayment Rules for Short Book Years
Based on the number of quarters in the book year:

| Quarters | Number of VA | Amount per VA | Due Dates | VA Order |
|----------|--------------|---------------|-----------|----------|
| 1 | 1 | 1/1 | 10th of 4th month | VA 4 |
| 2 | 2 | 1/2 | 10th of 4th, 7th months | VA 3, VA 4 |
| 3 | 3 | 1/3 | 10th of 4th, 7th, 10th months | VA 2, VA 3, VA 4 |
| 4 | 4 | 1/4 | 10th of 4th, 7th, 10th months, 20th of 12th month | VA 1, VA 2, VA 3, VA 4 |

### 3. Prepayment Rules for Long Book Years
- Only 4 prepayments in the last 12 months of the book year
- If last 12 months align with calendar year: normal dates (10 April, 10 July, 10 October, 20 December)
- If last 12 months don't align: special calculation based on last 12 months

### 4. Vermeerdering Percentage Adjustments
The vermeerdering percentage depends on the number of prepayments and the tax year parameters:

| Number of VA | Vermeerdering Percentage | Calculation |
|--------------|--------------------------|-------------|
| 1 | 4.5% | VA 4 rate |
| 2 | 5.25% | Average of VA 3 and VA 4 rates |
| 3 | 6% | Average of VA 2, VA 3, and VA 4 rates |
| 4 | Normal | Standard vermeerdering percentage for tax year |

**Note**: The actual percentages depend on the tax year parameters (2024: 6.75%, 2025: 9%, etc.)

### 5. UI Layout Changes
- **Step 2**: Show only relevant prepayment fields based on book year duration
- **Step 3**: Adjust prepayment optimization options
- **Step 4**: Show appropriate commit options

### 6. Latest Prepayment Date Display
Show the latest date when prepayments can be made based on the accounting period.

## Implementation Tasks

### Phase 1: Core Book Year Calculator Service
- [x] **Task 1.1**: Create `BookYearCalculatorService`
  - [x] Calculate book year duration in months and days
  - [x] Classify book year type (short/normal/long)
  - [x] Calculate number of quarters in book year
  - [x] Determine prepayment rules for short book years
  - [x] Determine prepayment rules for long book years
  - [x] Calculate adjusted vermeerdering percentages

- [x] **Task 1.2**: Create interfaces and types
  - [x] `BookYearInfo` interface
  - [x] `ShortBookYearPrepaymentRules` interface
  - [x] `LongBookYearPrepaymentRules` interface
  - [x] Update `PeriodData` interface to include book year info

### Phase 2: Integration with Main Calculation Engine
- [x] **Task 2.1**: Update `MainCalculationEngineService`
  - [x] Inject `BookYearCalculatorService`
  - [x] Add method to get book year information
  - [x] Add method to get adjusted vermeerdering percentage
  - [x] Update calculation logic to use book year info

- [x] **Task 2.2**: Update calculation detail builder
  - [x] Accept book year information as parameter
  - [x] Use adjusted vermeerdering percentage for short book years
  - [x] Update prepayment calculation logic

### Phase 3: UI Updates
- [x] **Task 3.1**: Update Step 2 (Vereenvoudigde aangifte)
  - [x] Show book year type and duration
  - [x] Display only relevant prepayment fields
  - [x] Show latest prepayment dates
  - [x] Add validation for short book year prepayments

- [ ] **Task 3.2**: Update Step 3 (Voorafbetalingen optimaliseren)
  - [ ] Adjust prepayment optimization options based on book year
  - [ ] Show appropriate concentration options
  - [ ] Update calculation display

- [ ] **Task 3.3**: Update Step 4 (Voorafbetalingen committen)
  - [ ] Show appropriate commit options
  - [ ] Display book year specific information

### Phase 4: Latest Prepayment Date Display
- [ ] **Task 4.1**: Calculate latest prepayment dates
  - [ ] For normal book years: standard dates
  - [ ] For short book years: based on quarters
  - [ ] For long book years: last 12 months
  - [ ] Handle "boekhouding te paard" (non-calendar year alignment)

- [ ] **Task 4.2**: Display latest dates in UI
  - [ ] Add to period confirmation section
  - [ ] Show in prepayment sections
  - [ ] Add warnings for overdue prepayments

### Phase 5: Testing and Validation
- [x] **Task 5.1**: Unit tests
  - [x] Test book year duration calculations
  - [x] Test prepayment rule calculations
  - [x] Test vermeerdering percentage adjustments
  - [x] Test latest date calculations

- [ ] **Task 5.2**: Integration tests
  - [ ] Test complete calculation flow with short book years
  - [ ] Test complete calculation flow with long book years
  - [ ] Test UI updates and validation

- [ ] **Task 5.3**: Manual testing
  - [ ] Test various book year scenarios
  - [ ] Verify UI displays correctly
  - [ ] Validate calculation accuracy

## Technical Implementation Details

### Book Year Calculator Service Structure
```typescript
@Injectable({
  providedIn: 'root'
})
export class BookYearCalculatorService {
  calculateBookYearInfo(startDate: Date, endDate: Date): BookYearInfo
  calculateShortBookYearPrepayments(bookYearInfo: BookYearInfo, taxYear: string): ShortBookYearPrepaymentRules
  calculateLongBookYearPrepayments(bookYearInfo: BookYearInfo, taxYear: string): LongBookYearPrepaymentRules
  calculateLatestPrepaymentDates(bookYearInfo: BookYearInfo): Date[]
  getBookYearTypeDescription(bookYearInfo: BookYearInfo): string
}
```

### Key Methods to Implement
1. **Duration Calculation**: Calculate months and days between dates
2. **Quarter Calculation**: Determine quarters in book year
3. **Prepayment Rules**: Generate rules based on book year type
4. **Vermeerdering Adjustment**: Calculate adjusted percentages
5. **Latest Date Calculation**: Determine latest prepayment dates

### Integration Points
1. **Main Calculation Engine**: Use book year info in calculations
2. **Calculation Detail Builder**: Use adjusted vermeerdering percentages
3. **UI Components**: Show/hide fields based on book year type
4. **Validation**: Ensure prepayments match book year rules

## Business Rules Summary

### Short Book Years (< 12 months)
- Number of prepayments = number of quarters
- Prepayment amounts are fractions (1/1, 1/2, 1/3, 1/4)
- Vermeerdering percentage is adjusted based on number of prepayments
- Due dates are calculated from end of book year

### Long Book Years (> 12 months)
- Only 4 prepayments in last 12 months
- Normal vermeerdering percentage applies
- Due dates depend on alignment with calendar year

### Normal Book Years (12 months)
- Standard 4 prepayments
- Standard vermeerdering percentage
- Standard due dates

### Latest Prepayment Dates
- **Normal book year**: 10 April, 10 July, 10 October, 20 December
- **Short book year**: Based on quarters from end date
- **Long book year**: Last 12 months of book year
- **Non-calendar alignment**: Special calculation for "boekhouding te paard"

## Success Criteria
- [ ] All book year types are correctly identified
- [ ] Prepayment rules are correctly calculated
- [ ] Vermeerdering percentages are correctly adjusted
- [ ] UI shows only relevant fields
- [ ] Latest prepayment dates are correctly displayed
- [ ] Calculations are accurate for all scenarios
- [ ] System handles edge cases (first book year, fiscal year alignment, etc.)

## Notes
- The implementation should be centralized in one service to maintain consistency
- All calculations should use the correct tax year parameters
- UI should adapt dynamically based on book year type
- Latest prepayment dates should be prominently displayed
- Validation should prevent invalid prepayment configurations 