import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Parking } from './parking';

describe('Parking', () => {
  let component: Parking;
  let fixture: ComponentFixture<Parking>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Parking]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Parking);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
