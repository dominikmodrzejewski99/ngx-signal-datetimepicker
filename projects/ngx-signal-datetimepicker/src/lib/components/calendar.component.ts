import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  addMonths,
  addYears,
  buildCalendarGrid,
  CalendarDay,
  getWeekdayLabels,
  sameDay,
  startOfMonth,
  Weekday,
} from '../utils/date';

type View = 'days' | 'months' | 'years';

@Component({
  selector: 'ngx-datetime-calendar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(keydown)': 'onKeydown($event)',
  },
  template: `
    <div class="ngx-dt-calendar" role="group" [attr.aria-label]="ariaLabel()">
      <header class="ngx-dt-calendar__header">
        @if (view() === 'days') {
          <button
            type="button"
            class="ngx-dt-calendar__nav"
            aria-label="Previous month"
            (click)="navigate(-1)"
          >‹</button>
          <button
            type="button"
            class="ngx-dt-calendar__title"
            (click)="setView('months')"
            [attr.aria-label]="'Switch to month selection. Currently ' + monthLabel()"
          >{{ monthLabel() }}</button>
          <button
            type="button"
            class="ngx-dt-calendar__nav"
            aria-label="Next month"
            (click)="navigate(1)"
          >›</button>
        } @else if (view() === 'months') {
          <button
            type="button"
            class="ngx-dt-calendar__nav"
            aria-label="Previous year"
            (click)="navigateYear(-1)"
          >‹</button>
          <button
            type="button"
            class="ngx-dt-calendar__title"
            (click)="setView('years')"
            [attr.aria-label]="'Switch to year selection. Currently ' + yearLabel()"
          >{{ yearLabel() }}</button>
          <button
            type="button"
            class="ngx-dt-calendar__nav"
            aria-label="Next year"
            (click)="navigateYear(1)"
          >›</button>
        } @else {
          <button
            type="button"
            class="ngx-dt-calendar__nav"
            aria-label="Previous decade"
            (click)="navigateDecade(-1)"
          >‹</button>
          <button
            type="button"
            class="ngx-dt-calendar__title"
            (click)="setView('days')"
            aria-label="Close year selection"
          >{{ yearsRangeLabel() }}</button>
          <button
            type="button"
            class="ngx-dt-calendar__nav"
            aria-label="Next decade"
            (click)="navigateDecade(1)"
          >›</button>
        }
      </header>

      @if (view() === 'days') {
        <div class="ngx-dt-calendar__weekdays" role="row">
          @for (label of weekdayLabels(); track label) {
            <span class="ngx-dt-calendar__weekday" role="columnheader">{{ label }}</span>
          }
        </div>

        <div #grid class="ngx-dt-calendar__grid" role="grid">
          @for (day of days(); track day.date.getTime()) {
            <button
              type="button"
              role="gridcell"
              class="ngx-dt-calendar__day"
              [class.is-outside]="!day.inCurrentMonth"
              [class.is-today]="day.isToday"
              [class.is-selected]="isSelected(day)"
              [class.is-disabled]="isDisabled(day)"
              [class.is-focused]="isFocused(day)"
              [attr.aria-selected]="isSelected(day)"
              [attr.aria-disabled]="isDisabled(day)"
              [attr.data-day]="day.date.toISOString()"
              [disabled]="isDisabled(day)"
              [attr.tabindex]="isFocused(day) ? 0 : -1"
              (click)="select(day)"
              (focus)="focusedDate.set(day.date)"
            >
              {{ day.date.getDate() }}
            </button>
          }
        </div>
      } @else if (view() === 'months') {
        <div class="ngx-dt-calendar__months" role="grid">
          @for (m of months(); track m.index) {
            <button
              type="button"
              role="gridcell"
              class="ngx-dt-calendar__cell"
              [class.is-selected]="m.isSelected"
              [class.is-today]="m.isCurrent"
              [class.is-focused]="m.isFocused"
              [attr.aria-pressed]="m.isSelected"
              [attr.tabindex]="m.isFocused ? 0 : -1"
              (click)="pickMonth(m.index)"
              (focus)="focusedMonth.set(m.index)"
            >{{ m.label }}</button>
          }
        </div>
      } @else {
        <div class="ngx-dt-calendar__years" role="grid">
          @for (y of years(); track y.value) {
            <button
              type="button"
              role="gridcell"
              class="ngx-dt-calendar__cell"
              [class.is-selected]="y.isSelected"
              [class.is-today]="y.isCurrent"
              [class.is-focused]="y.isFocused"
              [class.is-outside]="y.outOfRange"
              [attr.aria-pressed]="y.isSelected"
              [attr.tabindex]="y.isFocused ? 0 : -1"
              (click)="pickYear(y.value)"
              (focus)="focusedYear.set(y.value)"
            >{{ y.value }}</button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .ngx-dt-calendar {
      display: flex; flex-direction: column;
      gap: var(--ngx-dt-gap, 0.375rem);
    }
    .ngx-dt-calendar__header {
      display: flex; align-items: center; gap: 0.25rem;
    }
    .ngx-dt-calendar__title {
      flex: 1; text-align: center; font-weight: 600;
      background: transparent; border: 1px solid transparent;
      color: var(--ngx-dt-fg, inherit);
      padding: 0.375rem 0.5rem;
      border-radius: var(--ngx-dt-radius, 0.5rem);
      cursor: pointer; font: inherit; font-weight: 600;
    }
    .ngx-dt-calendar__title:hover { background: var(--ngx-dt-nav-bg-hover, rgba(0,0,0,0.05)); }
    .ngx-dt-calendar__title:focus-visible {
      outline: 2px solid var(--ngx-dt-focus, #2563eb); outline-offset: 2px;
    }
    .ngx-dt-calendar__nav {
      border: 1px solid transparent;
      background: transparent;
      color: var(--ngx-dt-fg, inherit);
      width: 2rem; height: 2rem;
      border-radius: var(--ngx-dt-radius, 0.5rem);
      cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 1.125rem; line-height: 1;
    }
    .ngx-dt-calendar__nav:hover { background: var(--ngx-dt-nav-bg-hover, rgba(0,0,0,0.05)); }
    .ngx-dt-calendar__nav:focus-visible {
      outline: 2px solid var(--ngx-dt-focus, #2563eb); outline-offset: 2px;
    }

    .ngx-dt-calendar__weekdays,
    .ngx-dt-calendar__grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 2px;
    }
    .ngx-dt-calendar__weekday {
      text-align: center;
      font-size: 0.7rem;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      color: var(--ngx-dt-muted, #6b7280);
      padding: 0.25rem 0;
    }
    .ngx-dt-calendar__day,
    .ngx-dt-calendar__cell {
      border: 1px solid transparent;
      background: transparent;
      color: var(--ngx-dt-fg, inherit);
      border-radius: var(--ngx-dt-radius, 0.5rem);
      cursor: pointer; font: inherit;
    }
    .ngx-dt-calendar__day {
      aspect-ratio: 1;
      display: inline-flex; align-items: center; justify-content: center;
    }
    .ngx-dt-calendar__day:hover:not(:disabled),
    .ngx-dt-calendar__cell:hover:not(:disabled) {
      background: var(--ngx-dt-nav-bg-hover, rgba(0,0,0,0.05));
    }
    .ngx-dt-calendar__day:focus-visible,
    .ngx-dt-calendar__cell:focus-visible {
      outline: 2px solid var(--ngx-dt-focus, #2563eb); outline-offset: 1px;
    }
    .ngx-dt-calendar__day.is-outside,
    .ngx-dt-calendar__cell.is-outside { color: var(--ngx-dt-muted, #9ca3af); }
    .ngx-dt-calendar__day.is-today,
    .ngx-dt-calendar__cell.is-today {
      font-weight: 700;
      box-shadow: inset 0 0 0 1px var(--ngx-dt-focus, #2563eb);
    }
    .ngx-dt-calendar__day.is-selected,
    .ngx-dt-calendar__cell.is-selected {
      background: var(--ngx-dt-accent, #2563eb);
      color: var(--ngx-dt-accent-fg, #fff);
    }
    .ngx-dt-calendar__day.is-disabled,
    .ngx-dt-calendar__day:disabled { opacity: 0.4; cursor: not-allowed; }

    .ngx-dt-calendar__months {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px;
    }
    .ngx-dt-calendar__years {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px;
    }
    .ngx-dt-calendar__cell {
      padding: 0.75rem 0.25rem;
      text-align: center;
    }
  `],
})
export class NgxDatetimeCalendar {
  readonly selected = input<Date | null>(null);
  readonly min = input<Date | null>(null);
  readonly max = input<Date | null>(null);
  readonly locale = input<string>('en-US');
  readonly weekStartsOn = input<Weekday>(1);
  readonly ariaLabel = input<string>('Calendar');
  /** When true, the calendar moves DOM focus to the focused cell after any keyboard nav. */
  readonly autoFocus = input<boolean>(false);

  readonly daySelect = output<Date>();

  private readonly visibleMonth = signal<Date>(startOfMonth(this.selected() ?? new Date()));
  protected readonly view = signal<View>('days');
  private readonly gridEl = viewChild<ElementRef<HTMLElement>>('grid');

  /** Roving tabindex anchor for days. */
  protected readonly focusedDate = signal<Date>(
    this.selected() ?? new Date(),
  );
  /** Roving tabindex anchor for months view. */
  protected readonly focusedMonth = signal<number>(
    (this.selected() ?? new Date()).getMonth(),
  );
  /** Roving tabindex anchor for years view. */
  protected readonly focusedYear = signal<number>(
    (this.selected() ?? new Date()).getFullYear(),
  );

  /** Tracks whether the next render should programmatically move focus. */
  private readonly focusRequested = signal(false);

  protected readonly weekdayLabels = computed(() =>
    getWeekdayLabels(this.locale(), this.weekStartsOn()),
  );

  protected readonly days = computed<CalendarDay[]>(() =>
    buildCalendarGrid(this.visibleMonth(), this.weekStartsOn()),
  );

  protected readonly monthLabel = computed(() =>
    new Intl.DateTimeFormat(this.locale(), { month: 'long', year: 'numeric' }).format(
      this.visibleMonth(),
    ),
  );

  protected readonly yearLabel = computed(() => `${this.visibleMonth().getFullYear()}`);

  protected readonly months = computed(() => {
    const fmt = new Intl.DateTimeFormat(this.locale(), { month: 'short' });
    const year = this.visibleMonth().getFullYear();
    const now = new Date();
    const sel = this.selected();
    const focusIdx = this.focusedMonth();
    return Array.from({ length: 12 }, (_, i) => ({
      index: i,
      label: fmt.format(new Date(year, i, 1)),
      isSelected: !!sel && sel.getFullYear() === year && sel.getMonth() === i,
      isCurrent: now.getFullYear() === year && now.getMonth() === i,
      isFocused: i === focusIdx,
    }));
  });

  protected readonly years = computed(() => {
    const focus = this.visibleMonth().getFullYear();
    const start = focus - (focus % 12);
    const now = new Date();
    const sel = this.selected();
    const fy = this.focusedYear();
    return Array.from({ length: 12 }, (_, i) => {
      const value = start + i;
      return {
        value,
        isSelected: !!sel && sel.getFullYear() === value,
        isCurrent: now.getFullYear() === value,
        isFocused: value === fy,
        outOfRange: false,
      };
    });
  });

  protected readonly yearsRangeLabel = computed(() => {
    const list = this.years();
    return `${list[0].value} – ${list[list.length - 1].value}`;
  });

  constructor() {
    // Keep the visible month in sync when the selected value changes externally.
    effect(() => {
      const sel = this.selected();
      if (sel) {
        this.visibleMonth.set(startOfMonth(sel));
        this.focusedDate.set(sel);
      }
    });

    // After render, if a focus was requested, move focus to the day with [tabindex=0].
    afterRenderEffect(() => {
      if (!this.focusRequested()) return;
      const grid = this.gridEl()?.nativeElement;
      if (!grid) return;
      const cell = grid.querySelector<HTMLElement>('[tabindex="0"]');
      cell?.focus();
      this.focusRequested.set(false);
    });
  }

  protected isSelected(day: CalendarDay): boolean {
    return sameDay(day.date, this.selected());
  }

  protected isFocused(day: CalendarDay): boolean {
    return sameDay(day.date, this.focusedDate());
  }

  protected isDisabled(day: CalendarDay): boolean {
    const min = this.min();
    const max = this.max();
    if (min && day.date.getTime() < new Date(min.getFullYear(), min.getMonth(), min.getDate()).getTime()) return true;
    if (max && day.date.getTime() > new Date(max.getFullYear(), max.getMonth(), max.getDate(), 23, 59, 59, 999).getTime()) return true;
    return false;
  }

  protected select(day: CalendarDay): void {
    if (this.isDisabled(day)) return;
    if (!day.inCurrentMonth) {
      this.visibleMonth.set(startOfMonth(day.date));
    }
    this.focusedDate.set(day.date);
    this.daySelect.emit(day.date);
  }

  protected navigate(months: number): void {
    this.visibleMonth.set(addMonths(this.visibleMonth(), months));
  }

  protected navigateYear(years: number): void {
    this.visibleMonth.set(addYears(this.visibleMonth(), years));
  }

  protected navigateDecade(direction: 1 | -1): void {
    this.visibleMonth.set(addYears(this.visibleMonth(), 12 * direction));
  }

  protected setView(view: View): void {
    this.view.set(view);
  }

  protected pickMonth(index: number): void {
    const current = this.visibleMonth();
    this.visibleMonth.set(new Date(current.getFullYear(), index, 1));
    this.focusedMonth.set(index);
    this.view.set('days');
  }

  protected pickYear(year: number): void {
    const current = this.visibleMonth();
    this.visibleMonth.set(new Date(year, current.getMonth(), 1));
    this.focusedYear.set(year);
    this.view.set('months');
  }

  showMonth(date: Date): void {
    this.visibleMonth.set(startOfMonth(date));
    this.view.set('days');
  }

  /** Move focus to the currently-focused cell. Called by parent after open. */
  focusCurrent(): void {
    this.focusRequested.set(true);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.view() === 'days') {
      this.handleDaysKeydown(event);
    } else if (this.view() === 'months') {
      this.handleMonthsKeydown(event);
    } else {
      this.handleYearsKeydown(event);
    }
  }

  private handleDaysKeydown(event: KeyboardEvent): void {
    const current = this.focusedDate();
    const handled = (next: Date) => {
      event.preventDefault();
      this.focusedDate.set(next);
      if (
        next.getMonth() !== this.visibleMonth().getMonth() ||
        next.getFullYear() !== this.visibleMonth().getFullYear()
      ) {
        this.visibleMonth.set(startOfMonth(next));
      }
      this.focusRequested.set(true);
    };

    switch (event.key) {
      case 'ArrowLeft': {
        const d = new Date(current); d.setDate(d.getDate() - 1); return handled(d);
      }
      case 'ArrowRight': {
        const d = new Date(current); d.setDate(d.getDate() + 1); return handled(d);
      }
      case 'ArrowUp': {
        const d = new Date(current); d.setDate(d.getDate() - 7); return handled(d);
      }
      case 'ArrowDown': {
        const d = new Date(current); d.setDate(d.getDate() + 7); return handled(d);
      }
      case 'Home': {
        const offset = (current.getDay() - this.weekStartsOn() + 7) % 7;
        const d = new Date(current); d.setDate(d.getDate() - offset);
        return handled(d);
      }
      case 'End': {
        const offset = (current.getDay() - this.weekStartsOn() + 7) % 7;
        const d = new Date(current); d.setDate(d.getDate() + (6 - offset));
        return handled(d);
      }
      case 'PageUp': {
        const d = event.shiftKey ? addYears(current, -1) : addMonths(current, -1);
        return handled(d);
      }
      case 'PageDown': {
        const d = event.shiftKey ? addYears(current, 1) : addMonths(current, 1);
        return handled(d);
      }
      case 'Enter':
      case ' ': {
        event.preventDefault();
        const day: CalendarDay = {
          date: current,
          inCurrentMonth: current.getMonth() === this.visibleMonth().getMonth(),
          isToday: sameDay(current, new Date()),
        };
        this.select(day);
        return;
      }
    }
  }

  private handleMonthsKeydown(event: KeyboardEvent): void {
    const current = this.focusedMonth();
    const move = (delta: number) => {
      event.preventDefault();
      const next = (current + delta + 12) % 12;
      this.focusedMonth.set(next);
      this.focusRequested.set(true);
    };
    switch (event.key) {
      case 'ArrowLeft': return move(-1);
      case 'ArrowRight': return move(1);
      case 'ArrowUp': return move(-3);
      case 'ArrowDown': return move(3);
      case 'Home': {
        event.preventDefault();
        this.focusedMonth.set(0);
        this.focusRequested.set(true);
        return;
      }
      case 'End': {
        event.preventDefault();
        this.focusedMonth.set(11);
        this.focusRequested.set(true);
        return;
      }
      case 'Enter':
      case ' ': {
        event.preventDefault();
        this.pickMonth(current);
        return;
      }
    }
  }

  private handleYearsKeydown(event: KeyboardEvent): void {
    const current = this.focusedYear();
    const move = (delta: number) => {
      event.preventDefault();
      this.focusedYear.set(current + delta);
      // Make sure the visible decade is updated if we move outside the current grid
      const start = this.years()[0].value;
      const end = this.years()[this.years().length - 1].value;
      if (current + delta < start || current + delta > end) {
        this.visibleMonth.set(addYears(this.visibleMonth(), delta));
      }
      this.focusRequested.set(true);
    };
    switch (event.key) {
      case 'ArrowLeft': return move(-1);
      case 'ArrowRight': return move(1);
      case 'ArrowUp': return move(-4);
      case 'ArrowDown': return move(4);
      case 'Enter':
      case ' ': {
        event.preventDefault();
        this.pickYear(current);
        return;
      }
    }
  }
}
