import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TaxCalculationStep } from './tax-calculation-step';

describe('TaxCalculationStep', () => {
  let component: TaxCalculationStep;
  let fixture: ComponentFixture<TaxCalculationStep>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaxCalculationStep]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TaxCalculationStep);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
