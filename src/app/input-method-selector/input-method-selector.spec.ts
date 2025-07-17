import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InputMethodSelector } from './input-method-selector';

describe('InputMethodSelector', () => {
  let component: InputMethodSelector;
  let fixture: ComponentFixture<InputMethodSelector>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InputMethodSelector]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InputMethodSelector);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
