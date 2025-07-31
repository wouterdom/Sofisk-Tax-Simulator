# Belgian Corporate Tax Calculation Documentation

## Overview
This document explains the calculation methodology implemented in the Sofisk Tax Simulator for Belgian corporate tax calculations. The system handles the complete tax calculation process from input data to final tax liability, including prepayment optimization and penalty calculations.

---

## Chapter 0: Calculation Totals and Base Values

### 0.1 Section Totals
The calculation starts by determining the base values from the nine main declaration sections:

- **Section 1 Total**: Resultaat van het belastbare tijdperk
  - Sum of all fields in section 1 (codes 1080, 1240, 1320)
  
- **Code 1420**: Bestanddelen vh resultaat waarop de aftrekbeperking van toepassing is
  - Standalone field (no section header)
  
- **Section 4 Total**: Aftrekken van de resterende winst
  - Sum of all fields in section 4 (codes 1432, 1433, 1439, 1438, 1437, 1445)
  
- **Section 6 Total**: Aftrekken resterende winst - korfbeperking
  - Sum of all fields in section 6 (codes 1441, 1442, 1436, 1443)
  
- **Section 8 Total**: Afzonderlijk te belasten
  - Sum of all fields in section 8 (code 1508)
  
- **Section 9 Total**: Voorheffing
  - Sum of all fields in section 9 (codes 1830, 1840)

### 0.2 Code 1430 Calculation (Resterend resultaat)
The first intermediate calculation:

```
Code 1430 = Section 1 Total - Code 1420
```

### 0.3 Code 1440 Calculation (Grondslag voor de berekening korf)
The second intermediate calculation:

```
Code 1440 = Code 1430 - Section 4 Total
```

### 0.4 Code 1460 Calculation (Belastbare winst gewoon tarief)
The core taxable income is calculated as:

```
Code 1460 (before korfbeperking) = Code 1440 - Section 6 Total (limited by korfbeperking)
```

### 0.5 Korfbeperking (Basket Limitation)
The korfbeperking limits the deductibility of section 6 items and is calculated using Code 1440:

```
Korfbeperking = MIN(Code 1440, 1,000,000) + MAX(0, Code 1440 - 1,000,000) × 0.7
```

**Limited Section 6 Total** = MIN(Section 6 Total, Korfbeperking)

**Code 1460 (before constraint)** = MAX(0, Code 1440 - Limited Section 6 Total)

**Final Code 1460** = Code 1460 (before constraint) + Code 1420

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
The vermeerdering is calculated as 9% of Saldo 2 (the tax base):

```
Raw Vermeerdering = MAX(0, Saldo 2 × 9%)
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

### 2.6 Final Vermeerdering
```
Prepayment Deductions = -(VA1 × 12% + VA2 × 10% + VA3 × 8% + VA4 × 6%)
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

---

## Implementation Notes

### Data Flow
1. User inputs data in declaration sections
2. Section totals are calculated automatically
3. Code 1430 is calculated: Section 1 total - Code 1420
4. Code 1440 is calculated: Code 1430 - Section 4 total
5. Korfbeperking is applied to section 6 deductions using Code 1440
6. Code 1460 is calculated: Code 1440 - Limited Section 6 total + Code 1420
7. Tax rates are applied based on eligibility (20% reduced rate for first €100,000 if applicable)
8. Saldo 1 is calculated: Main tax calculation (reduced rate + standard rate)
9. Voorheffingen are deducted (with Code 1830 limited to Saldo 1)
10. Saldo 2 is calculated: Saldo 1 - Limited Code 1830 - Code 1840
11. Vermeerdering is calculated (9% of Saldo 2) with de-minimis rule applied
12. Prepayment deductions are subtracted from vermeerdering
13. Code 1508 tax is calculated separately (10% of liquidatiereserve)
14. Final tax due is calculated: Saldo 2 - Total Prepayments + Vermeerdering + Code 1508 Tax
15. Results are displayed in real-time

### Key Features
- **Reactive calculations**: All calculations update automatically when data changes
- **Debounced updates**: Calculations are optimized with 300ms debounce
- **Data persistence**: All data is saved to localStorage
- **Export/Import**: Data can be exported and imported as JSON
- **Multiple input methods**: Manual entry, previous year basis, or file upload
- **De-minimis rule**: Prevents small amounts from triggering additional charges
- **Small company exception**: No vermeerdering for first three years

### Validation Rules
- All monetary values are handled as numbers
- Negative values are prevented where not applicable
- Korfbeperking ensures section 6 deductions don't exceed limits
- De-minimis rule prevents small vermeerdering amounts
- Code 1830 is limited to Saldo 1 to prevent over-deduction

### Section Structure
The current section structure is:
1. **Section 1**: Resultaat van het belastbare tijdperk
2. **Section 2**: Code 1420 (standalone field, no header)
3. **Section 3**: Code 1430 subtotal (Resterend resultaat)
4. **Section 4**: Aftrekken van de resterende winst
5. **Section 5**: Code 1440 subtotal (Grondslag voor de berekening korf)
6. **Section 6**: Aftrekken resterende winst - korfbeperking
7. **Section 7**: Code 1460 subtotal (Belastbare winst gewoon tarief)
8. **Section 8**: Afzonderlijk te belasten
9. **Section 9**: Voorheffing

### Tax Rates Summary
- **Reduced rate**: 20% (first €100,000 if eligible)
- **Standard rate**: 25% (amount above €100,000 or full amount if not eligible)
- **Liquidatiereserve**: 10%
- **Vermeerdering**: 9% of Saldo 2 (subject to de-minimis rule)
- **Prepayment deductions**: 12% (Q1), 10% (Q2), 8% (Q3), 6% (Q4)

---

## Future Enhancements
The following features are planned for future implementation:
- Additional tax credits and deductions
- More sophisticated prepayment optimization algorithms
- Integration with accounting software
- Multi-year planning capabilities
- Advanced reporting and analysis tools 