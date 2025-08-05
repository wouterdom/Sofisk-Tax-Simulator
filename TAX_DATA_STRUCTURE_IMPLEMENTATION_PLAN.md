# Tax Data Structure Implementation Plan

## Overview
This document outlines the steps to implement the standardized tax data structure based on the external tax application format. The goal is to align our application with industry-standard field naming conventions while maintaining compatibility with existing functionality.

## Key Principles
- **PN Fields**: Fields with "_PN" suffix (e.g., `_1080_PN`) allow both positive and negative values
- **Non-PN Fields**: Fields without "_PN" suffix are strictly positive
- **Field Naming**: Use underscore prefix format (e.g., `_1080`, `_1240`, `_1320`)
- **Backward Compatibility**: Maintain existing functionality while transitioning to new structure

## Phase 1: Data Structure Analysis and Planning

### Step 1.1: Field Mapping Analysis
**Objective**: Map existing fields to new standardized naming convention

**Tasks**:
- [ ] Create field mapping table (current → new format)
- [ ] Identify PN vs non-PN fields
- [ ] Document field validation rules (positive/negative restrictions)
- [ ] Identify missing fields from external application

**Key Field Mappings**:
```typescript
// Current → New Format (based on actual JSON data)
'1080' → '_1080_PN'  // Belastbare gereserveerde winst (PN = positive/negative allowed)
'1240' → '_1240'     // Verworpen uitgaven (strictly positive)
'1320' → '_1320'     // Uitgekeerde dividenden (strictly positive)
'1420' → '_1420'     // Bestanddelen vh resultaat (strictly positive)
'1430' → '_1430_PN'  // Resterend resultaat (PN = positive/negative allowed)
'1432' → '_1432'     // Octrooi-aftrek (strictly positive)
'1433' → '_1433'     // Innovatie-aftrek (strictly positive)
'1439' → '_1439'     // Investeringsaftrek (strictly positive)
'1438' → '_1438'     // Groepsbijdrage (strictly positive)
'1437' → '_1437'     // Risicokapitaal-aftrek (strictly positive)
'1445' → '_1445'     // Overgedragen definitief belast inkomsten (strictly positive)
'1508' → '_1508'     // Liquidatiereserve (strictly positive)
'1830' → '_1830'     // Niet-terugbetaalbare voorheffing (strictly positive)
'1840' → '_1840'     // Terugbetaalbare voorheffing (strictly positive)
```

### Step 1.2: Calculation Engine Field Name Mapping
**Objective**: Map calculation engine field names to external application format

**Tasks**:
- [ ] Map calculation engine output fields to JSON format
- [ ] Identify calculation result fields that need standardization
- [ ] Create mapping for intermediate calculation values
- [ ] Document calculation field naming conventions

**Calculation Engine Field Mappings**:
```typescript
// Current Calculation Engine → External JSON Format
// Section totals
resultaatVanHetBelastbareTijdperkTotal → '_1410_PN'  // (from JSON data)
aftrekkenVanDeResterendeWinstTotal → '_1427_PN'      // (from JSON data)
aftrekkenResterendeWinstKorfbeperkingTotal → '_1430_PN' // Resterend resultaat
afzonderlijkTeBelastenTotal → '_1508'                 // Liquidatiereserve
voorheffingTotal → '_1830' + '_1840'                  // Voorheffingen total

// Intermediate calculations
resterendResultaat → '_1430_PN'                       // Resterend resultaat
grondslagVoorBerekeningKorf → '_1440_NoTaxTreaty'     // (from JSON data)
belastbareWinstGewoonTarief → '_1460'                 // (from JSON data)
limitedAftrekkenResterendeWinstKorfbeperkingTotal → '_1441_NoTaxTreaty' // (from JSON data)

// Rate bases
reducedRateBase → '_1460_20_pct_calc'                 // (from JSON data)
standardRateBase → '_1460_25_pct_calc'                // (from JSON data)

// Field values needed by builders
code1508 → '_1508'                                    // Liquidatiereserve
code1830 → '_1830'                                    // Niet-terugbetaalbare voorheffing
code1840 → '_1840'                                    // Terugbetaalbare voorheffing

// Tax components
taxAtReducedRate → '_1460_5_result_calc'              // (from JSON data)
taxAtStandardRate → '_1460_5_basis_calc'              // (from JSON data)
separateAssessment → '_1508_result_calc'              // (from JSON data)
nonRefundableWithholding → '_1830_result_calc'        // (from JSON data)
refundableWithholding → '_1840_result_calc'           // (from JSON data)

// Final results
taxableIncome → '_1460'                               // (from JSON data)
totalTaxLiability → '_saldo1_calc'                    // (from JSON data)
finalTaxDue → '_taxes_to_pay_result_calc'             // (from JSON data)
requiredPrepayments → '_prepayment_total_result_calc' // (from JSON data)
currentPrepayments → '_prepayment_quarter_1_result_calc' + '_prepayment_quarter_2_result_calc' + '_prepayment_quarter_3_result_calc' + '_prepayment_quarter_4_result_calc'
shortfall → '_total_majoration_result_calc'           // (from JSON data)

// Values needed for calculation detail builder
calculationTotal → '_saldo1_calc'                     // (from JSON data)
saldo2 → '_saldo2_calc'                               // (from JSON data)
vermeerderingTotal → '_total_majoration_wo_prepayments_pct_calc' // (from JSON data)
berekeningVermeerdering → '_prepayment1_basis_calc'   // (from JSON data)
totaalAftrekVA → '_prepayment_total_result_calc'      // (from JSON data)
aftrekDoorVoorafbetalingen → '_prepayment_total_result_calc' // (from JSON data)
vermeerderingBeforeDeMinimis → '_total_majoration_result_calc' // (from JSON data)
finalTaxPayable → '_taxes_to_pay_result_calc'         // (from JSON data)

// Additional calculation fields from JSON
saldo3 → '_saldo3_calc'                               // (from JSON data)
totalTaxesToRecover → '_total_taxes_to_recover_result_calc' // (from JSON data)
taxesToPaySpread → '_taxes_to_pay_spread_result_calc' // (from JSON data)
totalSpreadTaxes → '_total_spread_taxes_result_calc'  // (from JSON data)
```

### Step 1.3: Type Definition Updates
**Objective**: Update TypeScript interfaces to support new field structure

**Tasks**:
- [ ] Create new `TaxField` interface with PN/non-PN distinction
- [ ] Update `DeclarationField` interface
- [ ] Create field validation utilities
- [ ] Add field metadata (PN status, validation rules)

**New Interfaces**:
```typescript
interface TaxField {
  code: string;           // e.g., "_1080_PN", "_1420"
  label: string;          // Human-readable label
  value: number;          // Field value
  allowsNegative: boolean; // PN fields = true, others = false
  validationRules: FieldValidationRules;
}

interface FieldValidationRules {
  minValue?: number;
  maxValue?: number;
  allowNegative: boolean;
  required: boolean;
}
```

## Phase 2: Core Infrastructure Updates

### Step 2.1: Field Registry System
**Objective**: Create centralized field management system

**Tasks**:
- [ ] Create `FieldRegistry` service
- [ ] Define field metadata (codes, labels, validation rules)
- [ ] Implement field validation logic
- [ ] Create field factory functions

**Implementation**:
```typescript
@Injectable()
export class FieldRegistryService {
  private fieldDefinitions: Map<string, FieldDefinition> = new Map();
  
  registerField(code: string, definition: FieldDefinition): void;
  getFieldDefinition(code: string): FieldDefinition | undefined;
  validateFieldValue(code: string, value: number): ValidationResult;
  isPNField(code: string): boolean;
}
```

### Step 2.2: Validation System Enhancement
**Objective**: Implement comprehensive field validation

**Tasks**:
- [ ] Create `FieldValidationService`
- [ ] Implement PN vs non-PN validation logic
- [ ] Add real-time validation in input components
- [ ] Create validation error display system

**Validation Logic**:
```typescript
// PN Fields: Allow negative values
if (fieldCode.endsWith('_PN')) {
  return { isValid: true, error: null };
}

// Non-PN Fields: Strictly positive
if (value < 0) {
  return { 
    isValid: false, 
    error: 'This field cannot have negative values' 
  };
}
```

## Phase 3: Component Updates

### Step 3.1: Input Component Enhancement
**Objective**: Update input components to support new validation rules

**Tasks**:
- [ ] Update `FormattedNumberInputComponent`
- [ ] Add field-specific validation
- [ ] Implement visual feedback for validation errors
- [ ] Add PN field indicator in UI

**Component Updates**:
```typescript
// Enhanced input component
@Component({
  selector: 'app-formatted-number-input',
  template: `
    <div class="relative">
      <input
        [value]="displayValue"
        (input)="onInputChange($event)"
        [class]="inputClasses"
        [placeholder]="placeholder"
      />
      <span *ngIf="isPNField" class="text-xs text-blue-600 ml-1">PN</span>
      <div *ngIf="showError" class="error-message">
        {{ errorMessage }}
      </div>
    </div>
  `
})
```

### Step 3.2: Layout Builder Updates
**Objective**: Update layout builders to use new field structure

**Tasks**:
- [ ] Update `Vereenvoudigde-aangifte.ts` layout builder
- [ ] Implement field registry integration
- [ ] Add field validation in layout generation
- [ ] Update field creation factory functions

**Layout Builder Updates**:
```typescript
// Updated field creation
const createFields = (fieldData: Array<{ code: string; label: string }>): DeclarationField[] => 
  fieldData.map(({ code, label }) => ({
    code: `_${code}${isPNField(code) ? '_PN' : ''}`,
    label,
    value: 0,
    allowsNegative: isPNField(code)
  }));
```

## Phase 4: Calculation Engine Updates

### Step 4.1: Field Access Layer
**Objective**: Create abstraction layer for field access

**Tasks**:
- [ ] Create `FieldAccessService`
- [ ] Implement field code normalization
- [ ] Add backward compatibility layer
- [ ] Create field value getters/setters

**Field Access Service**:
```typescript
@Injectable()
export class FieldAccessService {
  getFieldValue(sections: DeclarationSection[], code: string): number;
  setFieldValue(sections: DeclarationSection[], code: string, value: number): void;
  normalizeFieldCode(code: string): string; // Handles _PN suffix
  validateFieldValue(code: string, value: number): boolean;
}
```

### Step 4.2: Calculation Core Updates
**Objective**: Update calculation engine to use new field structure

**Tasks**:
- [ ] Update `calculation-core.ts` field access
- [ ] Implement field registry integration
- [ ] Add field validation in calculations
- [ ] Update field code constants

**Calculation Updates**:
```typescript
// Updated field access in calculation engine
const getFieldValue = (sections: DeclarationSection[], code: string): number => {
  const normalizedCode = fieldAccessService.normalizeFieldCode(code);
  return fieldAccessService.getFieldValue(sections, normalizedCode);
};
```

## Phase 5: Data Migration and Compatibility

### Step 5.1: Data Migration Strategy
**Objective**: Ensure smooth transition from old to new field structure

**Tasks**:
- [ ] Create data migration utilities
- [ ] Implement backward compatibility layer
- [ ] Add data transformation functions
- [ ] Create migration validation tests

**Migration Utilities**:
```typescript
export class DataMigrationService {
  migrateOldToNewFormat(oldData: any): TaxData;
  migrateNewToOldFormat(newData: TaxData): any;
  validateMigration(data: TaxData): ValidationResult;
}
```

### Step 5.2: Storage Service Updates
**Objective**: Update storage to handle new field structure

**Tasks**:
- [ ] Update `StorageService` field handling
- [ ] Implement field code normalization in storage
- [ ] Add data versioning support
- [ ] Create storage migration utilities

## Phase 6: UI/UX Enhancements

### Step 6.1: Field Display Updates
**Objective**: Enhance UI to show field types and validation

**Tasks**:
- [ ] Add PN field indicators in UI
- [ ] Implement validation error display
- [ ] Add field help tooltips
- [ ] Create field type badges

### Step 6.2: Input Validation Feedback
**Objective**: Provide clear feedback for validation errors

**Tasks**:
- [ ] Implement real-time validation feedback
- [ ] Add visual indicators for field types
- [ ] Create validation error messages
- [ ] Add field-specific help text

## Phase 7: Testing and Validation

### Step 7.1: Unit Test Updates
**Objective**: Update tests to cover new field structure

**Tasks**:
- [ ] Update existing unit tests
- [ ] Add field validation tests
- [ ] Create migration tests
- [ ] Add integration tests

### Step 7.2: Validation Testing
**Objective**: Ensure all field validations work correctly

**Tasks**:
- [ ] Test PN field negative value acceptance
- [ ] Test non-PN field negative value rejection
- [ ] Validate calculation accuracy
- [ ] Test data migration scenarios

## Implementation Priority

### High Priority (Phase 1-2)
1. Field mapping and type definitions
2. Field registry system
3. Validation system enhancement

### Medium Priority (Phase 3-4)
1. Component updates
2. Calculation engine updates
3. Data migration utilities

### Low Priority (Phase 5-7)
1. UI/UX enhancements
2. Comprehensive testing
3. Documentation updates

## Success Criteria

- [ ] All PN fields accept negative values
- [ ] All non-PN fields reject negative values
- [ ] Field naming follows standardized format
- [ ] Backward compatibility maintained
- [ ] Validation feedback is clear and immediate
- [ ] Calculation accuracy preserved
- [ ] Data migration works seamlessly

## Next Steps

1. **Immediate**: Begin with Phase 1.1 (Field Mapping Analysis)
2. **Week 1**: Complete Phase 1 and start Phase 2
3. **Week 2**: Complete Phase 2 and start Phase 3
4. **Week 3**: Complete Phase 3 and start Phase 4
5. **Week 4**: Complete remaining phases and testing

## Field Definitions Reference

### PN Fields (Allow Negative Values) - Based on Actual JSON Data
```typescript
const PN_FIELDS = [
  '_1080_PN',  // Belastbare gereserveerde winst
  '_1410_PN',  // (from JSON data)
  '_1411_PN',  // (from JSON data)
  '_1412_PN',  // (from JSON data)
  '_1427_PN',  // (from JSON data)
  '_1430_PN',  // Resterend resultaat
  '_1431_PN_TaxTreaty',  // (from JSON data)
  '_1431_PN_NoTaxTreaty',  // (from JSON data)
  '_1431_PN_Belgium',  // (from JSON data)
  '_1440_NoTaxTreaty',  // (from JSON data)
  '_1440_Belgium',  // (from JSON data)
  '_1441_NoTaxTreaty',  // (from JSON data)
  '_1441_Belgium',  // (from JSON data)
  '_1442_NoTaxTreaty',  // (from JSON data)
  '_1443_NoTaxTreaty',  // (from JSON data)
  '_1443_Belgium',  // (from JSON data)
  '_1444_NoTaxTreaty',  // (from JSON data)
  '_1444_Belgium',  // (from JSON data)
  '_1485_TaxTreaty',  // (from JSON data)
  '_1485_NoTaxTreaty',  // (from JSON data)
  '_1485_Belgium',  // (from JSON data)
  '_1486_PN_TaxTreaty',  // (from JSON data)
  '_1486_PN_Belgium',  // (from JSON data)
  '_1487_PN_TaxTreaty',  // (from JSON data)
  '_1487_PN_NoTaxTreaty',  // (from JSON data)
  '_1490_PN_TaxTreaty',  // (from JSON data)
  '_1490_PN_NoTaxTreaty',  // (from JSON data)
  '_1490_PN_Belgium',  // (from JSON data)
  '_1001_PN_Start',  // (from JSON data)
  '_1001_PN_End',  // (from JSON data)
  '_1008_PN_Start',  // (from JSON data)
  '_1008_PN_End',  // (from JSON data)
  '_1040_PN_Start',  // (from JSON data)
  '_1040_PN_End',  // (from JSON data)
  '_1070_PN_Start',  // (from JSON data)
  '_1080_PN',  // (from JSON data)
  '_1721_N',  // (from JSON data - negative indicator)
  '_1725_N',  // (from JSON data - negative indicator)
  '_1730_N',  // (from JSON data - negative indicator)
];
```

### Non-PN Fields (Strictly Positive) - Based on Actual JSON Data
```typescript
const NON_PN_FIELDS = [
  '_1240',     // Verworpen uitgaven
  '_1320',     // Uitgekeerde dividenden
  '_1420',     // Bestanddelen vh resultaat waarop de aftrekbeperking van toepassing is
  '_1421',     // (from JSON data)
  '_1422',     // (from JSON data)
  '_1423',     // (from JSON data)
  '_1425',     // (from JSON data)
  '_1426',     // (from JSON data)
  '_1429',     // (from JSON data)
  '_1419',     // (from JSON data)
  '_1432_Belgium',  // (from JSON data)
  '_1433_Belgium',  // (from JSON data)
  '_1439_Belgium',  // (from JSON data)
  '_1437_Belgium',  // (from JSON data)
  '_1445_NoTaxTreaty',  // (from JSON data)
  '_1445_Belgium',  // (from JSON data)
  '_1460',     // (from JSON data)
  '_1461',     // (from JSON data)
  '_1417',     // (from JSON data)
  '_1473',     // (from JSON data)
  '_1477',     // (from JSON data)
  '_1478',     // (from JSON data)
  '_1468',     // (from JSON data)
  '_1469',     // (from JSON data)
  '_1474',     // (from JSON data)
  '_1475',     // (from JSON data)
  '_1476',     // (from JSON data)
  '_1481',     // (from JSON data)
  '_1496',     // (from JSON data)
  '_1621',     // (from JSON data)
  '_1622',     // (from JSON data)
  '_1623',     // (from JSON data)
  '_1625',     // (from JSON data)
  '_1626',     // (from JSON data)
  '_1627',     // (from JSON data)
  '_1877',     // (from JSON data)
  '_1711',     // (from JSON data)
  '_1712',     // (from JSON data)
  '_1701',     // (from JSON data)
  '_1703',     // (from JSON data)
  '_1830',     // Niet-terugbetaalbare voorheffing
  '_1831',     // (from JSON data)
  '_1832',     // (from JSON data)
  '_1836',     // (from JSON data)
  '_1833',     // (from JSON data)
  '_1835',     // (from JSON data)
  '_1834',     // (from JSON data)
  '_1840',     // Terugbetaalbare voorheffing
  '_1841',     // (from JSON data)
  '_1842',     // (from JSON data)
  '_1843',     // (from JSON data)
  '_1844',     // (from JSON data)
  '_1845',     // (from JSON data)
  '_1846',     // (from JSON data)
  '_1859',     // (from JSON data)
  '_1851',     // (from JSON data)
  '_1853',     // (from JSON data)
  '_1855',     // (from JSON data)
  '_1850',     // (from JSON data)
  '_1724',     // (from JSON data)
  '_1903',     // (from JSON data)
  '_1904',     // (from JSON data)
  '_1905',     // (from JSON data)
  '_1880',     // (from JSON data)
  '_1201',     // (from JSON data)
  '_1202',     // (from JSON data)
  '_1203',     // (from JSON data)
  '_1245',     // (from JSON data)
  '_1246',     // (from JSON data)
  '_1204',     // (from JSON data)
  '_1205',     // (from JSON data)
  '_1206',     // (from JSON data)
  '_1207',     // (from JSON data)
  '_1208',     // (from JSON data)
  '_1209',     // (from JSON data)
  '_1210',     // (from JSON data)
  '_1211',     // (from JSON data)
  '_1262',     // (from JSON data)
  '_1212',     // (from JSON data)
  '_1214',     // (from JSON data)
  '_1215',     // (from JSON data)
  '_1248',     // (from JSON data)
  '_1216',     // (from JSON data)
  '_1217',     // (from JSON data)
  '_1243',     // (from JSON data)
  '_1218',     // (from JSON data)
  '_1233',     // (from JSON data)
  '_1220',     // (from JSON data)
  '_1232',     // (from JSON data)
  '_1222',     // (from JSON data)
  '_1263',     // (from JSON data)
  '_1264',     // (from JSON data)
  '_1249',     // (from JSON data)
  '_1250',     // (from JSON data)
  '_1244',     // (from JSON data)
  '_1223',     // (from JSON data)
  '_1236',     // (from JSON data)
  '_1225',     // (from JSON data)
  '_1230',     // (from JSON data)
  '_1231',     // (from JSON data)
  '_1237',     // (from JSON data)
  '_1226',     // (from JSON data)
  '_1227',     // (from JSON data)
  '_1228',     // (from JSON data)
  '_1229',     // (from JSON data)
  '_1247',     // (from JSON data)
  '_1251',     // (from JSON data)
  '_1252',     // (from JSON data)
  '_1239',     // (from JSON data)
  '_1238',     // (from JSON data)
  '_1301',     // (from JSON data)
  '_1302',     // (from JSON data)
  '_1303',     // (from JSON data)
  '_1305',     // (from JSON data)
  '_1306',     // (from JSON data)
  '_1322',     // (from JSON data)
  '_1340',     // (from JSON data)
  '_1601',     // (from JSON data)
  '_1607',     // (from JSON data)
  '_1606',     // (from JSON data)
  '_1605',     // (from JSON data)
  '_1610',     // (from JSON data)
  '_1631_BelgianBranch',  // (from JSON data)
  '_1631_ForeignBranch',  // (from JSON data)
  '_1632_BelgianBranch',  // (from JSON data)
  '_1632_ForeignBranch',  // (from JSON data)
  '_1633_BelgianBranch',  // (from JSON data)
  '_1633_ForeignBranch',  // (from JSON data)
  '_1634_BelgianBranch',  // (from JSON data)
  '_1634_ForeignBranch',  // (from JSON data)
  '_1635_BelgianBranch',  // (from JSON data)
  '_1635_ForeignBranch',  // (from JSON data)
  '_1636_BelgianBranch',  // (from JSON data)
  '_1636_ForeignBranch',  // (from JSON data)
  '_1637_BelgianBranch',  // (from JSON data)
  '_1637_ForeignBranch',  // (from JSON data)
  '_1638_BelgianBranch',  // (from JSON data)
  '_1638_ForeignBranch',  // (from JSON data)
  '_1640_BelgianBranch',  // (from JSON data)
  '_1640_ForeignBranch',  // (from JSON data)
  '_1643_BelgianBranch',  // (from JSON data)
  '_1643_ForeignBranch',  // (from JSON data)
  '_1645_BelgianBranch',  // (from JSON data)
  '_1645_ForeignBranch',  // (from JSON data)
  '_1650_BelgianBranch',  // (from JSON data)
  '_1650_ForeignBranch',  // (from JSON data)
  '_1810',     // (from JSON data)
  '_1811_extra_data',  // (from JSON data)
  '_1812_extra_data',  // (from JSON data)
  '_1813_extra_data',  // (from JSON data)
  '_1814_extra_data',  // (from JSON data)
  '_1004_Start',  // (from JSON data)
  '_1004_End',  // (from JSON data)
  '_1005_Start',  // (from JSON data)
  '_1005_End',  // (from JSON data)
  '_1006_Start',  // (from JSON data)
  '_1006_End',  // (from JSON data)
  '_1007_Start',  // (from JSON data)
  '_1007_End',  // (from JSON data)
  '_1012_Start',  // (from JSON data)
  '_1012_End',  // (from JSON data)
  '_1009_Start',  // (from JSON data)
  '_1009_End',  // (from JSON data)
  '_1020_Start',  // (from JSON data)
  '_1020_End',  // (from JSON data)
  '_1021_Start',  // (from JSON data)
  '_1021_End',  // (from JSON data)
  '_1022_Start',  // (from JSON data)
  '_1022_End',  // (from JSON data)
  '_1023_Start',  // (from JSON data)
  '_1023_End',  // (from JSON data)
  '_1024_Start',  // (from JSON data)
  '_1024_End',  // (from JSON data)
  '_1025_Start',  // (from JSON data)
  '_1025_End',  // (from JSON data)
  '_1051',     // (from JSON data)
  '_1068',     // (from JSON data)
  '_1052',     // (from JSON data)
  '_1053',     // (from JSON data)
  '_1059',     // (from JSON data)
  '_1066',     // (from JSON data)
  '_1054',     // (from JSON data)
  '_1055',     // (from JSON data)
  '_1058',     // (from JSON data)
  '_1064',     // (from JSON data)
  '_1062',     // (from JSON data)
  '_1063',     // (from JSON data)
  '_1069',     // (from JSON data)
  '_1065',     // (from JSON data)
  '_1057',     // (from JSON data)
  '_1056',     // (from JSON data)
  '_1067',     // (from JSON data)
  '_1061',     // (from JSON data)
  '_1101_Start',  // (from JSON data)
  '_1101_End',  // (from JSON data)
  '_1102_Start',  // (from JSON data)
  '_1102_End',  // (from JSON data)
  '_1103_Start',  // (from JSON data)
  '_1103_End',  // (from JSON data)
  '_1111_Start',  // (from JSON data)
  '_1111_End',  // (from JSON data)
  '_1112_Start',  // (from JSON data)
  '_1112_End',  // (from JSON data)
  '_1113_Start',  // (from JSON data)
  '_1113_End',  // (from JSON data)
  '_1114_Start',  // (from JSON data)
  '_1114_End',  // (from JSON data)
  '_1115_Start',  // (from JSON data)
  '_1115_End',  // (from JSON data)
  '_1116_Start',  // (from JSON data)
  '_1116_End',  // (from JSON data)
  '_1121_Start',  // (from JSON data)
  '_1121_End',  // (from JSON data)
  '_1129_Start',  // (from JSON data)
  '_1129_End',  // (from JSON data)
  '_1122_Start',  // (from JSON data)
  '_1122_End',  // (from JSON data)
  '_1125_Start',  // (from JSON data)
  '_1125_End',  // (from JSON data)
  '_1126_Start',  // (from JSON data)
  '_1126_End',  // (from JSON data)
  '_1127_Start',  // (from JSON data)
  '_1127_End',  // (from JSON data)
  '_1123_Start',  // (from JSON data)
  '_1123_End',  // (from JSON data)
  '_1124_Start',  // (from JSON data)
  '_1124_End',  // (from JSON data)
  '_1140_Start',  // (from JSON data)
  '_1140_End',  // (from JSON data)
  '_1180_Start',  // (from JSON data)
  '_1180_End',  // (from JSON data)
  '_1532',     // (from JSON data)
  '_1509',     // (from JSON data)
  '_1510',     // (from JSON data)
  '_1525',     // (from JSON data)
  '_1526',     // (from JSON data)
  '_1503',     // (from JSON data)
  '_1527',     // (from JSON data)
  '_1508',     // Liquidatiereserve
  '_1511',     // (from JSON data)
  '_1512',     // (from JSON data)
  '_1513',     // (from JSON data)
  '_1754',     // (from JSON data)
  '_1753',     // (from JSON data)
  '_6340',     // (from JSON data)
  '_6341',     // (from JSON data)
  '_6342',     // (from JSON data)
  '_6355',     // (from JSON data)
  '_8310',     // (from JSON data)
  '_8311',     // (from JSON data)
  '_8330',     // (from JSON data)
  '_8321',     // (from JSON data)
  '_8324',     // (from JSON data)
  '_8325',     // (from JSON data)
  '_8322',     // (from JSON data)
  '_8340',     // (from JSON data)
  '_1437_1',   // (from JSON data)
  '_8370',     // (from JSON data)
  '_8361',     // (from JSON data)
  '_8363',     // (from JSON data)
  '_8364',     // (from JSON data)
  '_8362',     // (from JSON data)
  '_8410',     // (from JSON data)
  '_8411',     // (from JSON data)
  '_8430',     // (from JSON data)
  '_8421',     // (from JSON data)
  '_8424',     // (from JSON data)
  '_8425',     // (from JSON data)
  '_8422',     // (from JSON data)
  '_8423',     // (from JSON data)
  '_8440',     // (from JSON data)
  '_1437_2',   // (from JSON data)
  '_8470',     // (from JSON data)
  '_8461',     // (from JSON data)
  '_8463',     // (from JSON data)
  '_8464',     // (from JSON data)
  '_8462',     // (from JSON data)
  '_8501',     // (from JSON data)
  '_8502',     // (from JSON data)
  '_8510',     // (from JSON data)
  '_1833_1',   // (from JSON data)
  '_1850_1',   // (from JSON data)
  '_1864',     // (from JSON data)
  '_1872',     // (from JSON data)
  '_1873',     // (from JSON data)
  '_1874',     // (from JSON data)
];
```

This plan provides a structured approach to implementing the standardized tax data structure while maintaining system stability and user experience. 