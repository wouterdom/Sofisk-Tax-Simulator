# Belgian Corporate Tax Calculation Documentation

## Overview
This document explains the calculation methodology implemented in the Sofisk Tax Simulator for Belgian corporate tax calculations. The system handles the complete tax calculation process from input data to final tax liability, including prepayment optimization and penalty calculations.

---

## Chapter 0: Calculation Totals and Base Values

### 0.1 Section Totals
The calculation starts by determining the base values from the seven main declaration sections:

- **Section 1 Total**: Resultaat van het belastbare tijdperk
  - Sum of all fields in section 1 (codes 1080, 1240, 1320)
  
- **Code 1420**: Bestanddelen vh resultaat waarop de aftrekbeperking van toepassing is
  - Standalone field (no section header)
  
- **Section 3 Total**: Aftrekken van de resterende winst
  - Sum of all fields in section 3 (codes 1432, 1433, 1439, 1438, 1437, 1445)
  
- **Section 5 Total**: Aftrekken resterende winst - korfbeperking
  - Sum of all fields in section 5 (codes 1441, 1442, 1436, 1443)
  
- **Section 6 Total**: Afzonderlijk te belasten
  - Sum of all fields in section 6 (code 1508)
  
- **Section 7 Total**: Voorheffing
  - Sum of all fields in section 7 (codes 1830, 1840)

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
Code 1508 Total = Code 1508 Amount × 10%
Saldo 1 = Main Tax Calculation + Code 1508 Total
Limited Code 1830 = MIN(Code 1830, Saldo 1) // Niet-terugbetaalbare voorheffingen cannot exceed Saldo 1
Final Tax Payable = Saldo 1 - Limited Code 1830 - Code 1840
```

**Note**: Code 1840 (Terugbetaalbare voorheffingen) is not limited and can make the final tax payable negative, resulting in a refund.

---

## Chapter 2: Vermeerdering wegens ontoereikende VA (Increase due to Insufficient Prepayments)

### 2.1 Prepayment Requirements
The Belgian tax system requires companies to pay 90% of their final tax liability through quarterly prepayments:

```
Required Prepayments = Final Tax Payable × 90%
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

### 2.3 Shortfall Calculation
```
Shortfall = MAX(0, Required Prepayments - Current Prepayments)
```

### 2.4 Penalty Calculation
A 7.5% penalty is applied to any shortfall:

```
Prepayment Penalty = Shortfall × 7.5%
```

### 2.5 Final Tax Due
```
Final Tax Due = Final Tax Payable + Prepayment Penalty
```

### 2.6 Prepayment Optimization
The system provides optimization strategies to minimize penalties:

1. **Spread Strategy**: Distribute remaining required amount over empty quarters
2. **Quarter-specific Strategies**: Concentrate payments in specific quarters (Q1, Q2, Q3, Q4)

---

## Implementation Notes

### Data Flow
1. User inputs data in declaration sections
2. Section totals are calculated automatically
3. Code 1430 is calculated: Section 1 total - Code 1420
4. Code 1440 is calculated: Code 1430 - Section 4 total
5. Korfbeperking is applied to section 6 deductions using Code 1440
6. Code 1460 is calculated: Code 1440 - Limited Section 6 total + Code 1420
7. Tax rates are applied based on eligibility
8. Additional tax items (Code 1508) are added
9. Voorheffingen are deducted (with Code 1830 limited to Saldo 1)
10. Prepayment requirements and penalties are calculated
11. Results are displayed in real-time

### Key Features
- **Reactive calculations**: All calculations update automatically when data changes
- **Debounced updates**: Calculations are optimized with 300ms debounce
- **Data persistence**: All data is saved to localStorage
- **Export/Import**: Data can be exported and imported as JSON
- **Multiple input methods**: Manual entry, previous year basis, or file upload

### Validation Rules
- All monetary values are handled as numbers
- Negative values are prevented where not applicable
- Korfbeperking ensures section 5 deductions don't exceed limits
- Prepayment penalties only apply when shortfall exists

### Section Structure
The new section structure is:
1. **Section 1**: Resultaat van het belastbare tijdperk
2. **Section 2**: Code 1420 (standalone field, no header)
3. **Section 3**: Code 1430 subtotal (Resterend resultaat)
4. **Section 4**: Aftrekken van de resterende winst
5. **Section 5**: Code 1440 subtotal (Grondslag voor de berekening korf)
6. **Section 6**: Aftrekken resterende winst - korfbeperking
7. **Section 7**: Code 1460 subtotal (Belastbare winst gewoon tarief)
8. **Section 8**: Afzonderlijk te belasten
9. **Section 9**: Voorheffing

---

## Future Enhancements
The following features are planned for future implementation:
- Additional tax credits and deductions
- More sophisticated prepayment optimization algorithms
- Integration with accounting software
- Multi-year planning capabilities
- Advanced reporting and analysis tools 