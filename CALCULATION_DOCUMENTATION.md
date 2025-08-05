# Belgian Corporate Tax Calculation Documentation

## Overview
This document explains the calculation methodology implemented in the Sofisk Tax Simulator for Belgian corporate tax calculations. The system handles the complete tax calculation process from input data to final tax liability, including prepayment optimization and penalty calculations. The system now fully supports short book years (verkorte boekjaren) with adjusted calculations and dynamic UI display.

---

## Chapter 0: Calculation Totals and Base Values

### 0.1 Section Totals
The calculation starts by determining the base values from the nine main declaration sections:

- **ResultaatVanHetBelastbareTijdperkTotal (Total 1)**: Resultaat van het belastbare tijdperk
  - Sum of all fields in section 1 (codes 1080, 1240, 1320)
  
- **BestanddelenVhResultaatAftrekbeperking (Code 1420)**: Bestanddelen vh resultaat waarop de aftrekbeperking van toepassing is
  - Standalone field (no section header)
  
- **AftrekkenVanDeResterendeWinstTotal (Total 4)**: Aftrekken van de resterende winst
  - Sum of all fields in section 4 (codes 1432, 1433, 1439, 1438, 1437, 1445)
  
- **AftrekkenResterendeWinstKorfbeperkingTotal (Total 6)**: Aftrekken resterende winst - korfbeperking
  - Sum of all fields in section 6 (codes 1441, 1442, 1436, 1443)
  
- **AfzonderlijkTeBelastenTotal (Total 8)**: Afzonderlijk te belasten
  - Sum of all fields in section 8 (code 1508)
  
- **VoorheffingTotal (Total 9)**: Voorheffing
  - Sum of all fields in section 9 (codes 1830, 1840)

### 0.2 ResterendResultaat Calculation (Code 1430)
The first intermediate calculation:

```
ResterendResultaat = ResultaatVanHetBelastbareTijdperkTotal - BestanddelenVhResultaatAftrekbeperking
```

### 0.3 GrondslagVoorBerekeningKorf Calculation (Code 1440)
The second intermediate calculation:

```
GrondslagVoorBerekeningKorf = ResterendResultaat - AftrekkenVanDeResterendeWinstTotal
```

### 0.4 BelastbareWinstGewoonTarief Calculation (Code 1460)
The core taxable income is calculated as:

```
BelastbareWinstGewoonTarief (before korfbeperking) = GrondslagVoorBerekeningKorf - AftrekkenResterendeWinstKorfbeperkingTotal (limited by korfbeperking)
```

### 0.5 Korfbeperking (Basket Limitation)
The korfbeperking limits the deductibility of section 6 items and is calculated using GrondslagVoorBerekeningKorf:

```
Korfbeperking = MIN(GrondslagVoorBerekeningKorf, 1,000,000) + MAX(0, GrondslagVoorBerekeningKorf - 1,000,000) × 0.7
```

**LimitedAftrekkenResterendeWinstKorfbeperkingTotal** = MIN(AftrekkenResterendeWinstKorfbeperkingTotal, Korfbeperking)

**BelastbareWinstGewoonTarief (before constraint)** = MAX(0, GrondslagVoorBerekeningKorf - LimitedAftrekkenResterendeWinstKorfbeperkingTotal)

**Final BelastbareWinstGewoonTarief** = BelastbareWinstGewoonTarief (before constraint) + BestanddelenVhResultaatAftrekbeperking

---

## Chapter 1: Calculating "Te betalen belastingen" (Taxes to be Paid)

### 1.1 Tax Rate Application
The system applies different tax rates based on eligibility:

**If reduced rate is applicable (checkbox checked):**
- First €100,000: 20% rate
- Amount above €100,000: 25% rate

**If reduced rate is not applicable (checkbox unchecked):**
- Full amount: 25% rate

### 1.2 Main Tax Calculation
```
Tax Calculation = (Reduced Rate Base × 20%) + (Standard Rate Base × 25%)
```

### 1.3 Voorheffingen (Prepayments)
Two types of prepayments are deducted:

- **Code 1830**: Niet-terugbetaalbare voorheffingen (Non-refundable prepayments)
- **Code 1840**: Terugbetaalbare voorheffingen (Refundable prepayments)

### 1.4 Additional Tax Items
**Code 1508**: Liquidatiereserve
- Taxed at 10% rate on the transferred amount
- This amount is added to the final tax calculation

### 1.5 Final Tax Calculation
```
Saldo 1 = Main Tax Calculation (Reduced Rate + Standard Rate)
Limited Code 1830 = MIN(Code 1830, Saldo 1) // Niet-terugbetaalbare voorheffingen cannot exceed Saldo 1
Saldo 2 = Saldo 1 - Limited Code 1830 - Code 1840
```

**Note**: Code 1840 (Terugbetaalbare voorheffingen) is not limited and can make Saldo 2 negative, resulting in a refund.

---

## Chapter 2: Vermeerdering wegens ontoereikende VA (Increase due to Insufficient Prepayments)

### 2.1 Prepayment Requirements
The Belgian tax system requires companies to pay 90% of their final tax liability through quarterly prepayments:

```
Required Prepayments = Final Tax Due × 90%
```

### 2.2 Current Prepayments
The system tracks four quarterly prepayments:
- **VA1**: Due before April 10
- **VA2**: Due before July 10  
- **VA3**: Due before October 10
- **VA4**: Due before December 20

```
Current Prepayments = VA1 + VA2 + VA3 + VA4
```

### 2.3 Vermeerdering Calculation
The vermeerdering is calculated as 9% of Saldo 2 (the tax base) for normal book years:

```
Raw Vermeerdering = MAX(0, Saldo 2 × 9%)
```

**For Short Book Years:**
The vermeerdering rate is adjusted based on the available quarters:

- **1-quarter book year**: Uses VA4 rate (6%)
- **2-quarter book year**: Average of VA3 and VA4 rates (7%)
- **3-quarter book year**: Average of VA2, VA3, and VA4 rates (8%)
- **4-quarter book year**: Standard rate (9%)

```
Adjusted Vermeerdering Rate = Average of available quarterly rates
Raw Vermeerdering = MAX(0, Saldo 2 × Adjusted Vermeerdering Rate)
```

### 2.4 De-minimis Rule
A de-minimis rule applies to prevent small amounts from triggering additional charges:

```
De-minimis Threshold = MAX(€50, Saldo 2 × 0.5%)
Adjusted Vermeerdering = IF(Raw Vermeerdering ≤ De-minimis Threshold, 0, Raw Vermeerdering)
```

**Note**: If the raw vermeerdering amount is less than €50 or 0.5% of the tax base (whichever is higher), no increase is charged.

### 2.5 Prepayment Deductions
Each prepayment reduces the vermeerdering based on timing:

```
VA1 Deduction = VA1 × 12%
VA2 Deduction = VA2 × 10%
VA3 Deduction = VA3 × 8%
VA4 Deduction = VA4 × 6%
```

**For Short Book Years:**
Only the prepayments for available quarters are considered:

- **1-quarter book year**: Only VA4 deduction
- **2-quarter book year**: VA3 and VA4 deductions
- **3-quarter book year**: VA2, VA3, and VA4 deductions
- **4-quarter book year**: All deductions (normal)

### 2.6 Final Vermeerdering
```
Prepayment Deductions = -(Sum of available VA deductions)
Vermeerdering Total = MAX(0, Adjusted Vermeerdering + Prepayment Deductions)
```

### 2.7 Small Company Exception
For small companies in their first three years, no vermeerdering is applied:

```
IF (Small Company First Three Years) THEN Vermeerdering Total = 0
```

### 2.8 Final Tax Due
```
Code 1508 Tax = Code 1508 Amount × 10%
Final Tax Due = Saldo 2 - Total Prepayments + Vermeerdering Total + Code 1508 Tax
```

**Note**: Code 1508 (Liquidatiereserve) is taxed separately and added to the final tax due calculation.

---

## Chapter 3: Prepayment Optimization

### 3.1 Optimization Strategies
The system provides several strategies to optimize prepayments:

1. **Spread Strategy**: Distribute remaining required amount over empty quarters
2. **Q1 Strategy**: Concentrate payments in Q1
3. **Q2 Strategy**: Concentrate payments in Q2
4. **Q3 Strategy**: Concentrate payments in Q3
5. **Q4 Strategy**: Concentrate payments in Q4

### 3.2 Required Prepayments Calculation
```
Required Prepayments = Final Tax Due × 90%
Shortfall = MAX(0, Required Prepayments - Current Prepayments)
```

### 3.3 Short Book Year Prepayment Optimization

**For "GeenVermeerdering" (Avoid Penalties) Goal:**

**Spread Strategy:**
```
Total Deduction Rate = Sum of available quarterly rates
Total Prepayment Needed = Base Vermeerdering / Total Deduction Rate
Amount Per Quarter = Total Prepayment Needed / Number of Quarters
```

**Example for 3-quarter book year:**
- Available rates: Q2 (10%) + Q3 (8%) + Q4 (6%) = 24%
- Base vermeerdering: €150
- Total prepayment needed: €150 / 0.24 = €625
- Amount per quarter: €625 / 3 = €208.33

**Concentration Strategies:**
```
Prepayment Amount = Base Vermeerdering / Quarterly Rate of Target Quarter
```

If target quarter is not available, fallback to earliest available quarter.

**For "SaldoNul" (Zero Balance) Goal:**
Uses the same `solvePrepayment` function but with adjusted total rate for available quarters.

---

## Chapter 4: Short Book Year Support

### 4.1 Book Year Detection
The system automatically detects short book years based on period duration:

```
Months Between = End Date - Start Date (in months)
Is Short Book Year = Months Between < 12
Quarters In Book Year = CEILING(Months Between / 3)
```

### 4.2 Dynamic UI Display
Based on the number of quarters, only relevant prepayment fields are shown:

- **1-quarter book year**: Only VA4 field
- **2-quarter book year**: VA3 and VA4 fields
- **3-quarter book year**: VA2, VA3, and VA4 fields
- **4-quarter book year**: All fields (VA1, VA2, VA3, VA4)

### 4.3 Due Date Calculation
Due dates are calculated based on the actual book year structure:

**Normal Book Year (12 months):**
- VA1: 10th day of 4th month
- VA2: 10th day of 7th month
- VA3: 10th day of 10th month
- VA4: 20th day of last month

**Short Book Year:**
Due dates are calculated based on the actual quarters available in the book year period.

### 4.4 Calculation Detail Display
The "Detail van de berekening" section dynamically adjusts to show only relevant prepayment rows and the correct vermeerdering calculation breakdown for short book years.

---

## Prepayment Calculation Business Logic

### Step 2: Original Values Display
- **Detail van de berekening**: Shows calculation using **original prepayment values** (committed prepayments)
- **Purpose**: Display the current tax situation with existing prepayments
- **Data source**: `committedPrepayments` from TaxData
- **Short book year support**: Only shows relevant prepayment fields based on book year type

### Step 3: Simulation Mode
- **Detail van de berekening**: Shows calculation using **simulated prepayment values** (suggested prepayments)
- **Purpose**: Display what the tax situation would be with optimized prepayments
- **Data source**: `suggestedPrepayments` from calculation results
- **Original values display**: Always shows a separate screen with the original values (step 2 scenario)
- **Short book year support**: Optimized prepayments respect the book year structure

### Navigation Logic
- **Step 2 → Step 3**: Automatically switches to simulation mode
- **Step 3 → Step 2**: Prompts user to commit changes
  - **"Yes"**: Commits simulation values to original values
  - **"No"**: Discards simulation values, returns to original values

### Implementation Requirements
1. **Step 2**: Use `committedPrepayments` for detailed calculation display
2. **Step 3**: Use `suggestedPrepayments` for detailed calculation display
3. **Step 3**: Always show original values in a separate section
4. **Navigation**: Handle commit/discard logic when going back from step 3 to step 2
5. **Short book year**: All calculations respect the actual book year structure

---

## Implementation Notes

### Data Flow
1. User inputs data in declaration sections
2. System detects book year type (normal vs. short)
3. Section totals are calculated automatically
4. ResterendResultaat is calculated: ResultaatVanHetBelastbareTijdperkTotal - BestanddelenVhResultaatAftrekbeperking
5. GrondslagVoorBerekeningKorf is calculated: ResterendResultaat - AftrekkenVanDeResterendeWinstTotal
6. Korfbeperking is applied to AftrekkenResterendeWinstKorfbeperkingTotal using GrondslagVoorBerekeningKorf
7. BelastbareWinstGewoonTarief is calculated: GrondslagVoorBerekeningKorf - LimitedAftrekkenResterendeWinstKorfbeperkingTotal + BestanddelenVhResultaatAftrekbeperking
8. Tax rates are applied based on eligibility (20% reduced rate for first €100,000 if applicable)
9. Saldo 1 is calculated: Main tax calculation (reduced rate + standard rate)
10. Voorheffingen are deducted (with Code 1830 limited to Saldo 1)
11. Saldo 2 is calculated: Saldo 1 - Limited Code 1830 - Code 1840
12. Vermeerdering is calculated (adjusted rate for short book years) with de-minimis rule applied
13. Prepayment deductions are subtracted from vermeerdering (only available quarters for short book years)
14. Code 1508 tax is calculated separately (10% of liquidatiereserve)
15. Final tax due is calculated: Saldo 2 - Total Prepayments + Vermeerdering + Code 1508 Tax
16. Results are displayed in real-time with dynamic UI based on book year type

### Key Features
- **Reactive calculations**: All calculations update automatically when data changes
- **Debounced updates**: Calculations are optimized with 300ms debounce
- **Data persistence**: All data is saved to localStorage
- **Multiple input methods**: Manual entry, previous year basis, or file upload
- **De-minimis rule**: Prevents small amounts from triggering additional charges
- **Small company exception**: No vermeerdering for first three years
- **Short book year support**: Full support for periods less than 12 months
- **Dynamic UI**: Only relevant prepayment fields shown based on book year type
- **Due date integration**: Prepayment due dates displayed inline with input fields

### Validation Rules
- All monetary values are handled as numbers
- Negative values are prevented where not applicable
- Korfbeperking ensures section 6 deductions don't exceed limits
- De-minimis rule prevents small vermeerdering amounts
- Code 1830 is limited to Saldo 1 to prevent over-deduction
- Book year validation ensures proper period structure
- Short book year calculations respect actual quarter availability

### Section Structure
The current section structure is:
1. **Section 1**: Resultaat van het belastbare tijdperk (ResultaatVanHetBelastbareTijdperkTotal)
2. **Code 1420**: Bestanddelen vh resultaat waarop de aftrekbeperking van toepassing is (BestanddelenVhResultaatAftrekbeperking)
3. **Code 1430**: Resterend resultaat (ResterendResultaat)
4. **Section 4**: Aftrekken van de resterende winst (AftrekkenVanDeResterendeWinstTotal)
5. **Code 1440**: Grondslag voor de berekening korf (GrondslagVoorBerekeningKorf)
6. **Section 6**: Aftrekken resterende winst - korfbeperking (AftrekkenResterendeWinstKorfbeperkingTotal)
7. **Code 1460**: Belastbare winst gewoon tarief (BelastbareWinstGewoonTarief)
8. **Section 8**: Afzonderlijk te belasten (AfzonderlijkTeBelastenTotal)
9. **Section 9**: Voorheffing (VoorheffingTotal)

### Tax Rates Summary
- **Reduced rate**: 20% (first €100,000 if eligible)
- **Standard rate**: 25% (amount above €100,000 or full amount if not eligible)
- **Liquidatiereserve**: 10%
- **Vermeerdering**: 9% of Saldo 2 for normal book years (adjusted for short book years)
- **Prepayment deductions**: 12% (Q1), 10% (Q2), 8% (Q3), 6% (Q4)

### Short Book Year Examples

**3-Month Book Year (1 quarter):**
- Available prepayment: VA4 only
- Vermeerdering rate: 6% (VA4 rate)
- Due date: Based on actual book year end
- UI: Shows only VA4 field with integrated due date

**6-Month Book Year (2 quarters):**
- Available prepayments: VA3, VA4
- Vermeerdering rate: 7% (average of VA3 and VA4 rates)
- Due dates: Based on actual quarters
- UI: Shows VA3 and VA4 fields with integrated due dates

**9-Month Book Year (3 quarters):**
- Available prepayments: VA2, VA3, VA4
- Vermeerdering rate: 8% (average of VA2, VA3, and VA4 rates)
- Due dates: Based on actual quarters
- UI: Shows VA2, VA3, and VA4 fields with integrated due dates

---

## Future Enhancements
The following features are planned for future implementation:
- Additional tax credits and deductions
- More sophisticated prepayment optimization algorithms
- Integration with accounting software
- Multi-year planning capabilities
- Advanced reporting and analysis tools
- Enhanced short book year scenarios
- Additional prepayment optimization strategies