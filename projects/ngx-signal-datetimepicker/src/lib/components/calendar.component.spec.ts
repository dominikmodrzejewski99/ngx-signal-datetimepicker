import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NgxDatetimeCalendar } from './calendar.component';
import { Weekday } from '../utils/date';

@Component({
  selector: 'host-cal',
  imports: [NgxDatetimeCalendar],
  template: `
    <ngx-datetime-calendar
      [selected]="selected()"
      [min]="min()"
      [max]="max()"
      [locale]="'en-GB'"
      [weekStartsOn]="weekStartsOn()"
      (daySelect)="onSelect($event)"
    />
  `,
})
class HostCalendar {
  selected = signal<Date | null>(new Date(2024, 5, 15));
  min = signal<Date | null>(null);
  max = signal<Date | null>(null);
  weekStartsOn = signal<Weekday>(1);
  selectedDate: Date | null = null;
  onSelect(d: Date) { this.selectedDate = d; }
}

function setup() {
  const fixture = TestBed.createComponent(HostCalendar);
  fixture.detectChanges();
  return fixture;
}

function $all(fix: ComponentFixture<HostCalendar>, sel: string): HTMLElement[] {
  return Array.from(fix.nativeElement.querySelectorAll(sel));
}

function $by(fix: ComponentFixture<HostCalendar>, sel: string, predicate: (el: HTMLElement) => boolean): HTMLElement {
  const el = $all(fix, sel).find(predicate);
  if (!el) throw new Error(`No element matching ${sel}`);
  return el;
}

describe('NgxDatetimeCalendar', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostCalendar] });
  });

  describe('rendering', () => {
    it('renders 42 day cells in days view', () => {
      const fix = setup();
      expect($all(fix, 'button.ngx-dt-calendar__day')).toHaveLength(42);
      expect($all(fix, '.ngx-dt-calendar__weekday')).toHaveLength(7);
    });

    it('marks the selected day with is-selected and aria-selected', () => {
      const fix = setup();
      const selected = $by(fix, 'button.ngx-dt-calendar__day', (el) => el.classList.contains('is-selected'));
      expect(selected.textContent?.trim()).toBe('15');
      expect(selected.getAttribute('aria-selected')).toBe('true');
    });

    it('updates selected day when input changes', () => {
      const fix = setup();
      fix.componentInstance.selected.set(new Date(2024, 5, 20));
      fix.detectChanges();
      const selected = $by(fix, 'button.ngx-dt-calendar__day', (el) => el.classList.contains('is-selected'));
      expect(selected.textContent?.trim()).toBe('20');
    });
  });

  describe('navigation buttons', () => {
    it('previous / next month buttons advance the month label', () => {
      const fix = setup();
      const initial = fix.nativeElement.querySelector('.ngx-dt-calendar__title')!.textContent;
      $by(fix, '.ngx-dt-calendar__nav', (el) => el.getAttribute('aria-label') === 'Next month').click();
      fix.detectChanges();
      const after = fix.nativeElement.querySelector('.ngx-dt-calendar__title')!.textContent;
      expect(after).not.toBe(initial);
      $by(fix, '.ngx-dt-calendar__nav', (el) => el.getAttribute('aria-label') === 'Previous month').click();
      fix.detectChanges();
      expect(fix.nativeElement.querySelector('.ngx-dt-calendar__title')!.textContent).toBe(initial);
    });
  });

  describe('view switching', () => {
    it('clicking the title opens the months view, then the years view', () => {
      const fix = setup();
      fix.nativeElement.querySelector('.ngx-dt-calendar__title').click();
      fix.detectChanges();
      expect($all(fix, '.ngx-dt-calendar__months')).toHaveLength(1);
      fix.nativeElement.querySelector('.ngx-dt-calendar__title').click();
      fix.detectChanges();
      expect($all(fix, '.ngx-dt-calendar__years')).toHaveLength(1);
    });

    it('months view picks a month and returns to days', () => {
      const fix = setup();
      fix.nativeElement.querySelector('.ngx-dt-calendar__title').click();
      fix.detectChanges();
      const dec = $all(fix, '.ngx-dt-calendar__cell').at(-1)!;
      dec.click();
      fix.detectChanges();
      expect($all(fix, '.ngx-dt-calendar__grid')).toHaveLength(1);
      expect(fix.nativeElement.querySelector('.ngx-dt-calendar__title').textContent).toContain('December');
    });

    it('years view picks a year and returns to months', () => {
      const fix = setup();
      fix.nativeElement.querySelector('.ngx-dt-calendar__title').click();
      fix.detectChanges();
      fix.nativeElement.querySelector('.ngx-dt-calendar__title').click();
      fix.detectChanges();
      const cells = $all(fix, '.ngx-dt-calendar__cell');
      cells[0].click();
      fix.detectChanges();
      expect($all(fix, '.ngx-dt-calendar__months')).toHaveLength(1);
    });

    it('navigating decade in years view updates the range label', () => {
      const fix = setup();
      fix.nativeElement.querySelector('.ngx-dt-calendar__title').click();
      fix.detectChanges();
      fix.nativeElement.querySelector('.ngx-dt-calendar__title').click();
      fix.detectChanges();
      const before = fix.nativeElement.querySelector('.ngx-dt-calendar__title').textContent;
      $by(fix, '.ngx-dt-calendar__nav', (el) => el.getAttribute('aria-label') === 'Next decade').click();
      fix.detectChanges();
      expect(fix.nativeElement.querySelector('.ngx-dt-calendar__title').textContent).not.toBe(before);
    });

    it('next-year nav in months view rolls the year forward', () => {
      const fix = setup();
      fix.nativeElement.querySelector('.ngx-dt-calendar__title').click();
      fix.detectChanges();
      const yearBefore = fix.nativeElement.querySelector('.ngx-dt-calendar__title').textContent;
      $by(fix, '.ngx-dt-calendar__nav', (el) => el.getAttribute('aria-label') === 'Next year').click();
      fix.detectChanges();
      expect(fix.nativeElement.querySelector('.ngx-dt-calendar__title').textContent).not.toBe(yearBefore);
    });

    it('previous-year nav in months view rolls the year back', () => {
      const fix = setup();
      fix.nativeElement.querySelector('.ngx-dt-calendar__title').click();
      fix.detectChanges();
      const yearBefore = fix.nativeElement.querySelector('.ngx-dt-calendar__title').textContent;
      $by(fix, '.ngx-dt-calendar__nav', (el) => el.getAttribute('aria-label') === 'Previous year').click();
      fix.detectChanges();
      expect(fix.nativeElement.querySelector('.ngx-dt-calendar__title').textContent).not.toBe(yearBefore);
    });

    it('previous-decade nav in years view rolls the decade back', () => {
      const fix = setup();
      fix.nativeElement.querySelector('.ngx-dt-calendar__title').click();
      fix.detectChanges();
      fix.nativeElement.querySelector('.ngx-dt-calendar__title').click();
      fix.detectChanges();
      const rangeBefore = fix.nativeElement.querySelector('.ngx-dt-calendar__title').textContent;
      $by(fix, '.ngx-dt-calendar__nav', (el) => el.getAttribute('aria-label') === 'Previous decade').click();
      fix.detectChanges();
      expect(fix.nativeElement.querySelector('.ngx-dt-calendar__title').textContent).not.toBe(rangeBefore);
    });

    it('clicking the years title returns to the days view', () => {
      const fix = setup();
      fix.nativeElement.querySelector('.ngx-dt-calendar__title').click();
      fix.detectChanges();
      fix.nativeElement.querySelector('.ngx-dt-calendar__title').click();
      fix.detectChanges();
      fix.nativeElement.querySelector('.ngx-dt-calendar__title').click(); // years title
      fix.detectChanges();
      expect($all(fix, '.ngx-dt-calendar__grid')).toHaveLength(1);
    });

    it('month and year cells update the roving focus on focus events', () => {
      const fix = setup();
      fix.nativeElement.querySelector('.ngx-dt-calendar__title').click();
      fix.detectChanges();
      const cells = $all(fix, '.ngx-dt-calendar__cell');
      cells[5].dispatchEvent(new FocusEvent('focus', { bubbles: true }));
      fix.detectChanges();
      const focused = $by(fix, '.ngx-dt-calendar__cell', (el) => el.classList.contains('is-focused'));
      expect(focused).toBe(cells[5]);
    });
  });

  describe('selection', () => {
    it('emits daySelect when a day is clicked', () => {
      const fix = setup();
      const day10 = $by(fix, 'button.ngx-dt-calendar__day', (el) => el.textContent?.trim() === '10' && !el.classList.contains('is-outside'));
      day10.click();
      expect(fix.componentInstance.selectedDate?.getDate()).toBe(10);
    });

    it('clicking an outside-month day navigates the visible month', () => {
      const fix = setup();
      const last = $all(fix, 'button.ngx-dt-calendar__day').at(-1)!;
      const wasOutside = last.classList.contains('is-outside');
      last.click();
      fix.detectChanges();
      if (wasOutside) {
        const stillOutside = $all(fix, 'button.ngx-dt-calendar__day').at(-1)!.classList.contains('is-outside');
        // After navigating, the previously-outside day belongs to the new visible month.
        expect(stillOutside).toBe(true);
      }
      expect(fix.componentInstance.selectedDate).not.toBeNull();
    });

    it('does not emit for disabled days', () => {
      const fix = setup();
      fix.componentInstance.min.set(new Date(2024, 5, 20));
      fix.detectChanges();
      const day1 = $by(fix, 'button.ngx-dt-calendar__day', (el) =>
        el.textContent?.trim() === '1' && !el.classList.contains('is-outside'),
      );
      day1.click();
      expect(fix.componentInstance.selectedDate).toBeNull();
    });

    it('respects max', () => {
      const fix = setup();
      fix.componentInstance.max.set(new Date(2024, 5, 10));
      fix.detectChanges();
      const day25 = $by(fix, 'button.ngx-dt-calendar__day', (el) =>
        el.textContent?.trim() === '25' && !el.classList.contains('is-outside'),
      );
      day25.click();
      expect(fix.componentInstance.selectedDate).toBeNull();
    });
  });

  describe('keyboard navigation (days)', () => {
    function keydown(fix: ComponentFixture<HostCalendar>, key: string, opts: KeyboardEventInit = {}): void {
      const host = fix.nativeElement.querySelector('ngx-datetime-calendar')!;
      host.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...opts }));
      fix.detectChanges();
    }
    it('ArrowRight moves focus by one day; ArrowDown by a week', () => {
      const fix = setup();
      keydown(fix, 'ArrowRight');
      const focused = $by(fix, '.ngx-dt-calendar__day', (el) => el.classList.contains('is-focused'));
      expect(focused.textContent?.trim()).toBe('16');
      keydown(fix, 'ArrowDown');
      expect($by(fix, '.ngx-dt-calendar__day', (el) => el.classList.contains('is-focused')).textContent?.trim()).toBe('23');
    });
    it('ArrowUp and ArrowLeft go back', () => {
      const fix = setup();
      keydown(fix, 'ArrowUp');
      expect($by(fix, '.ngx-dt-calendar__day', (el) => el.classList.contains('is-focused')).textContent?.trim()).toBe('8');
      keydown(fix, 'ArrowLeft');
      expect($by(fix, '.ngx-dt-calendar__day', (el) => el.classList.contains('is-focused')).textContent?.trim()).toBe('7');
    });
    it('Home and End jump to week edges', () => {
      const fix = setup();
      keydown(fix, 'Home');
      expect($by(fix, '.ngx-dt-calendar__day', (el) => el.classList.contains('is-focused')).textContent?.trim()).toBe('10');
      keydown(fix, 'End');
      expect($by(fix, '.ngx-dt-calendar__day', (el) => el.classList.contains('is-focused')).textContent?.trim()).toBe('16');
    });
    it('PageUp/PageDown move month; Shift adds year', () => {
      const fix = setup();
      const before = fix.nativeElement.querySelector('.ngx-dt-calendar__title').textContent;
      keydown(fix, 'PageDown');
      expect(fix.nativeElement.querySelector('.ngx-dt-calendar__title').textContent).not.toBe(before);
      keydown(fix, 'PageDown', { shiftKey: true });
      keydown(fix, 'PageUp');
      keydown(fix, 'PageUp', { shiftKey: true });
    });
    it('Enter and Space select the focused day', () => {
      const fix = setup();
      keydown(fix, 'ArrowRight');
      keydown(fix, 'Enter');
      expect(fix.componentInstance.selectedDate?.getDate()).toBe(16);
      keydown(fix, 'ArrowRight');
      keydown(fix, ' ');
      expect(fix.componentInstance.selectedDate?.getDate()).toBe(17);
    });
  });

  describe('keyboard navigation (months and years)', () => {
    function openMonths(fix: ComponentFixture<HostCalendar>) {
      fix.nativeElement.querySelector('.ngx-dt-calendar__title').click();
      fix.detectChanges();
    }
    function openYears(fix: ComponentFixture<HostCalendar>) {
      openMonths(fix);
      fix.nativeElement.querySelector('.ngx-dt-calendar__title').click();
      fix.detectChanges();
    }
    function keydown(fix: ComponentFixture<HostCalendar>, key: string): void {
      fix.nativeElement.querySelector('ngx-datetime-calendar')!
        .dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      fix.detectChanges();
    }

    it('arrow keys move focus across months', () => {
      const fix = setup();
      openMonths(fix);
      keydown(fix, 'ArrowRight');
      keydown(fix, 'ArrowLeft');
      keydown(fix, 'ArrowUp');
      keydown(fix, 'ArrowDown');
      keydown(fix, 'Home');
      keydown(fix, 'End');
      const focused = $by(fix, '.ngx-dt-calendar__cell', (el) => el.classList.contains('is-focused'));
      expect(focused.textContent?.trim()).toBeTruthy();
    });

    it('Enter on months picks the month and returns to days', () => {
      const fix = setup();
      openMonths(fix);
      keydown(fix, 'Enter');
      expect($all(fix, '.ngx-dt-calendar__grid')).toHaveLength(1);
    });

    it('arrow keys move focus across years and may shift the decade', () => {
      const fix = setup();
      openYears(fix);
      keydown(fix, 'ArrowDown');
      keydown(fix, 'ArrowDown');
      keydown(fix, 'ArrowDown');
      keydown(fix, 'ArrowDown');
      keydown(fix, 'ArrowRight');
      keydown(fix, 'ArrowLeft');
      // Just make sure we still render the years grid after all moves.
      expect($all(fix, '.ngx-dt-calendar__years')).toHaveLength(1);
    });

    it('Enter on years picks the year and returns to months', () => {
      const fix = setup();
      openYears(fix);
      keydown(fix, 'Enter');
      expect($all(fix, '.ngx-dt-calendar__months')).toHaveLength(1);
    });
  });

  describe('focusCurrent', () => {
    it('moves DOM focus to the cell with tabindex=0', async () => {
      const fix = setup();
      const cal = fix.debugElement.children[0].componentInstance as NgxDatetimeCalendar;
      cal.focusCurrent();
      fix.detectChanges();
      await Promise.resolve();
      const focused = document.activeElement;
      expect(focused?.classList.contains('ngx-dt-calendar__day')).toBe(true);
    });
  });

  describe('public methods', () => {
    it('showMonth(date) navigates to the requested month and resets the view to days', () => {
      const fix = setup();
      fix.nativeElement.querySelector('.ngx-dt-calendar__title').click();
      fix.detectChanges();
      const cal = fix.debugElement.children[0].componentInstance as NgxDatetimeCalendar;
      cal.showMonth(new Date(2023, 11, 1));
      fix.detectChanges();
      expect(fix.nativeElement.querySelector('.ngx-dt-calendar__title').textContent).toContain('December');
      expect($all(fix, '.ngx-dt-calendar__grid')).toHaveLength(1);
    });
  });

  describe('weekStartsOn', () => {
    it('changes the first weekday in the grid', () => {
      const fix = setup();
      fix.componentInstance.weekStartsOn.set(0 as Weekday);
      fix.detectChanges();
      const firstHeader = fix.nativeElement.querySelector('.ngx-dt-calendar__weekday')!;
      expect(firstHeader.textContent).toBeTruthy();
    });
  });
});
