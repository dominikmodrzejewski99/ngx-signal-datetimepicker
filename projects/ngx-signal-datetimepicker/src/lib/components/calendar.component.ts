import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  linkedSignal,
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

interface EnrichedDay extends CalendarDay {
  /** Stable @for track key. */
  key: number;
  /** ISO timestamp, exposed via data-day for debugging / e2e selectors. */
  iso: string;
  isSelected: boolean;
  isDisabled: boolean;
  isFocused: boolean;
}

@Component({
  selector: 'ngx-datetime-calendar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss',
  host: {
    '(keydown)': 'onKeydown($event)',
  },
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

  /**
   * The month currently being rendered. Derived from `selected`, but writable —
   * user navigation (prev / next, year picker, keyboard) persists until the
   * source signal actually changes.
   */
  private readonly visibleMonth = linkedSignal<Date | null, Date>({
    source: () => this.selected(),
    computation: (sel, prev) =>
      sel ? startOfMonth(sel) : (prev?.value ?? startOfMonth(new Date())),
  });

  protected readonly view = signal<View>('days');
  private readonly gridEl = viewChild<ElementRef<HTMLElement>>('grid');

  /** Roving tabindex anchor for the days grid. */
  protected readonly focusedDate = linkedSignal<Date | null, Date>({
    source: () => this.selected(),
    computation: (sel, prev) => sel ?? prev?.value ?? new Date(),
  });
  protected readonly focusedMonth = signal<number>(
    (this.selected() ?? new Date()).getMonth(),
  );
  protected readonly focusedYear = signal<number>(
    (this.selected() ?? new Date()).getFullYear(),
  );

  /** Tracks whether the next render should programmatically move focus. */
  private readonly focusRequested = signal(false);

  protected readonly weekdayLabels = computed(() =>
    getWeekdayLabels(this.locale(), this.weekStartsOn()),
  );

  /**
   * min/max projected to whole-day boundaries, with infinity sentinels when
   * unset. Lets {@link days} and {@link isDateDisabled} stay a single comparison.
   */
  private readonly minDayMs = computed<number>(() => {
    const m = this.min();
    return m
      ? new Date(m.getFullYear(), m.getMonth(), m.getDate()).getTime()
      : Number.NEGATIVE_INFINITY;
  });
  private readonly maxDayMs = computed<number>(() => {
    const m = this.max();
    return m
      ? new Date(m.getFullYear(), m.getMonth(), m.getDate(), 23, 59, 59, 999).getTime()
      : Number.POSITIVE_INFINITY;
  });

  /**
   * Calendar grid with all per-cell flags pre-computed. Keeps the template free
   * of function calls — read once per change-detection pass.
   */
  protected readonly days = computed<EnrichedDay[]>(() => {
    const grid = buildCalendarGrid(this.visibleMonth(), this.weekStartsOn());
    const sel = this.selected();
    const focus = this.focusedDate();
    const minMs = this.minDayMs();
    const maxMs = this.maxDayMs();
    return grid.map((d) => {
      const t = d.date.getTime();
      return {
        ...d,
        key: t,
        iso: d.date.toISOString(),
        isSelected: sameDay(d.date, sel),
        isFocused: sameDay(d.date, focus),
        isDisabled: t < minMs || t > maxMs,
      };
    });
  });

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
    afterRenderEffect(() => {
      if (!this.focusRequested()) return;
      const grid = this.gridEl()?.nativeElement;
      if (!grid) return;
      grid.querySelector<HTMLElement>('[tabindex="0"]')?.focus();
      this.focusRequested.set(false);
    });
  }

  protected select(day: EnrichedDay): void {
    if (day.isDisabled) return;
    if (!day.inCurrentMonth) {
      this.visibleMonth.set(startOfMonth(day.date));
    }
    this.focusedDate.set(day.date);
    this.daySelect.emit(day.date);
  }

  private isDateDisabled(date: Date): boolean {
    const t = date.getTime();
    return t < this.minDayMs() || t > this.maxDayMs();
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
    const move = (next: Date) => {
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
        const d = new Date(current); d.setDate(d.getDate() - 1); return move(d);
      }
      case 'ArrowRight': {
        const d = new Date(current); d.setDate(d.getDate() + 1); return move(d);
      }
      case 'ArrowUp': {
        const d = new Date(current); d.setDate(d.getDate() - 7); return move(d);
      }
      case 'ArrowDown': {
        const d = new Date(current); d.setDate(d.getDate() + 7); return move(d);
      }
      case 'Home': {
        const offset = (current.getDay() - this.weekStartsOn() + 7) % 7;
        const d = new Date(current); d.setDate(d.getDate() - offset);
        return move(d);
      }
      case 'End': {
        const offset = (current.getDay() - this.weekStartsOn() + 7) % 7;
        const d = new Date(current); d.setDate(d.getDate() + (6 - offset));
        return move(d);
      }
      case 'PageUp': {
        const d = event.shiftKey ? addYears(current, -1) : addMonths(current, -1);
        return move(d);
      }
      case 'PageDown': {
        const d = event.shiftKey ? addYears(current, 1) : addMonths(current, 1);
        return move(d);
      }
      case 'Enter':
      case ' ': {
        event.preventDefault();
        if (this.isDateDisabled(current)) return;
        if (current.getMonth() !== this.visibleMonth().getMonth()) {
          this.visibleMonth.set(startOfMonth(current));
        }
        this.focusedDate.set(current);
        this.daySelect.emit(current);
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
      const yearsList = this.years();
      const start = yearsList[0].value;
      const end = yearsList[yearsList.length - 1].value;
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
