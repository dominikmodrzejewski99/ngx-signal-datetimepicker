import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
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
            [attr.aria-label]="'Close year selection'"
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

        <div class="ngx-dt-calendar__grid" role="grid">
          @for (day of days(); track day.date.getTime()) {
            <button
              type="button"
              role="gridcell"
              class="ngx-dt-calendar__day"
              [class.is-outside]="!day.inCurrentMonth"
              [class.is-today]="day.isToday"
              [class.is-selected]="isSelected(day)"
              [class.is-disabled]="isDisabled(day)"
              [attr.aria-selected]="isSelected(day)"
              [attr.aria-disabled]="isDisabled(day)"
              [disabled]="isDisabled(day)"
              [attr.tabindex]="isSelected(day) ? 0 : -1"
              (click)="select(day)"
            >
              {{ day.date.getDate() }}
            </button>
          }
        </div>
      } @else if (view() === 'months') {
        <div class="ngx-dt-calendar__months">
          @for (m of months(); track m.index) {
            <button
              type="button"
              class="ngx-dt-calendar__cell"
              [class.is-selected]="m.isSelected"
              [class.is-today]="m.isCurrent"
              [attr.aria-pressed]="m.isSelected"
              (click)="pickMonth(m.index)"
            >{{ m.label }}</button>
          }
        </div>
      } @else {
        <div class="ngx-dt-calendar__years">
          @for (y of years(); track y.value) {
            <button
              type="button"
              class="ngx-dt-calendar__cell"
              [class.is-selected]="y.isSelected"
              [class.is-today]="y.isCurrent"
              [class.is-outside]="y.outOfRange"
              [attr.aria-pressed]="y.isSelected"
              (click)="pickYear(y.value)"
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
    .ngx-dt-calendar__day {
      aspect-ratio: 1;
      border: 1px solid transparent;
      background: transparent;
      color: var(--ngx-dt-fg, inherit);
      border-radius: var(--ngx-dt-radius, 0.5rem);
      cursor: pointer; font: inherit;
      display: inline-flex; align-items: center; justify-content: center;
    }
    .ngx-dt-calendar__day:hover:not(:disabled) {
      background: var(--ngx-dt-nav-bg-hover, rgba(0,0,0,0.05));
    }
    .ngx-dt-calendar__day:focus-visible {
      outline: 2px solid var(--ngx-dt-focus, #2563eb); outline-offset: 1px;
    }
    .ngx-dt-calendar__day.is-outside { color: var(--ngx-dt-muted, #9ca3af); }
    .ngx-dt-calendar__day.is-today {
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
      border: 1px solid transparent;
      background: transparent;
      color: var(--ngx-dt-fg, inherit);
      border-radius: var(--ngx-dt-radius, 0.5rem);
      cursor: pointer; font: inherit;
      text-align: center;
    }
    .ngx-dt-calendar__cell:hover {
      background: var(--ngx-dt-nav-bg-hover, rgba(0,0,0,0.05));
    }
    .ngx-dt-calendar__cell.is-today {
      box-shadow: inset 0 0 0 1px var(--ngx-dt-focus, #2563eb);
      font-weight: 600;
    }
    .ngx-dt-calendar__cell.is-outside { color: var(--ngx-dt-muted, #9ca3af); }
    .ngx-dt-calendar__cell:focus-visible {
      outline: 2px solid var(--ngx-dt-focus, #2563eb); outline-offset: 1px;
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

  readonly daySelect = output<Date>();

  private readonly visibleMonth = signal<Date>(startOfMonth(this.selected() ?? new Date()));
  protected readonly view = signal<View>('days');

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
    return Array.from({ length: 12 }, (_, i) => ({
      index: i,
      label: fmt.format(new Date(year, i, 1)),
      isSelected: !!sel && sel.getFullYear() === year && sel.getMonth() === i,
      isCurrent: now.getFullYear() === year && now.getMonth() === i,
    }));
  });

  protected readonly years = computed(() => {
    const focus = this.visibleMonth().getFullYear();
    const start = focus - (focus % 12);
    const now = new Date();
    const sel = this.selected();
    return Array.from({ length: 12 }, (_, i) => {
      const value = start + i;
      return {
        value,
        isSelected: !!sel && sel.getFullYear() === value,
        isCurrent: now.getFullYear() === value,
        outOfRange: false,
      };
    });
  });

  protected readonly yearsRangeLabel = computed(() => {
    const list = this.years();
    return `${list[0].value} – ${list[list.length - 1].value}`;
  });

  protected isSelected(day: CalendarDay): boolean {
    return sameDay(day.date, this.selected());
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
    this.view.set('days');
  }

  protected pickYear(year: number): void {
    const current = this.visibleMonth();
    this.visibleMonth.set(new Date(year, current.getMonth(), 1));
    this.view.set('months');
  }

  showMonth(date: Date): void {
    this.visibleMonth.set(startOfMonth(date));
    this.view.set('days');
  }
}
