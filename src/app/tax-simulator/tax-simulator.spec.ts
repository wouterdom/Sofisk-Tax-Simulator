import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TaxSimulator } from './tax-simulator';

describe('TaxSimulator', () => {
  let component: TaxSimulator;
  let fixture: ComponentFixture<TaxSimulator>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaxSimulator]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TaxSimulator);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
