import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrepaymentStep } from './prepayment-step';

describe('PrepaymentStep', () => {
  let component: PrepaymentStep;
  let fixture: ComponentFixture<PrepaymentStep>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrepaymentStep]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PrepaymentStep);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
