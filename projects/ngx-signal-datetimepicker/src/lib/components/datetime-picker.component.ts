import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  effect,
  ElementRef,
  forwardRef,
  inject,
  input,
  LOCALE_ID,
  model,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { FormValueControl } from '@angular/forms/signals';
import { NgTemplateOutlet } from '@angular/common';
import {
  clampDate,
  combineDateAndTime,
  defaultDisplayFormat,
  formatDateTime,
  fromZonedFacade,
  HourCycle,
  toZonedFacade,
  Weekday,
} from '../utils/date';
import { NgxDatetimeCalendar } from './calendar.component';
import { NgxDatetimeTime, TimePreset, TimeValue } from './time.component';

export interface NgxDatetimeTriggerContext {
  value: Date | null;
  display: string;
  open: () => void;
  toggle: () => void;
  disabled: boolean;
}

export interface NgxDatetimePanelContext {
  value: Date | null;
  close: () => void;
}

const DEFAULT_PRESETS: readonly TimePreset[] = [
  {
    label: 'Now',
    apply: () => {
      const now = new Date();
      return { hours: now.getHours(), minutes: now.getMinutes(), seconds: now.getSeconds() };
    },
  },
  { label: '09:00', apply: { hours: 9, minutes: 0, seconds: 0 } },
  { label: '12:00', apply: { hours: 12, minutes: 0, seconds: 0 } },
  { label: '18:00', apply: { hours: 18, minutes: 0, seconds: 0 } },
  {
    label: '+15m',
    apply: (current) => {
      const total = current.hours * 60 + current.minutes + 15;
      return {
        hours: Math.floor(total / 60) % 24,
        minutes: total % 60,
        seconds: current.seconds,
      };
    },
  },
  {
    label: '+1h',
    apply: (current) => ({
      hours: (current.hours + 1) % 24,
      minutes: current.minutes,
      seconds: current.seconds,
    }),
  },
];

function currentTime(timeZone?: string | null): TimeValue {
  const now = new Date();
  const facade = timeZone ? toZonedFacade(now, timeZone) : now;
  return {
    hours: facade.getHours(),
    minutes: facade.getMinutes(),
    seconds: facade.getSeconds(),
  };
}

@Component({
  selector: 'ngx-datetime-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgxDatetimeCalendar, NgxDatetimeTime, NgTemplateOutlet],
  templateUrl: './datetime-picker.component.html',
  styleUrl: './datetime-picker.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => NgxDatetimePicker),
      multi: true,
    },
  ],
  host: {
    'class': 'ngx-dt-host',
    '[class.is-open]': 'isOpen()',
    '[class.is-disabled]': 'effectiveDisabled()',
    '[class.is-mobile]': 'isMobile()',
    '[attr.data-cycle]': 'hourCycle()',
    '(document:click)': 'onDocumentClick($event)',
    '(keydown.escape)': 'close()',
  },
})
export class NgxDatetimePicker
  implements FormValueControl<Date | null>, ControlValueAccessor
{
  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injectedLocale = inject(LOCALE_ID, { optional: true });

  /** Resolved BCP-47 tag: explicit input → injected LOCALE_ID → 'en-US'. */
  protected readonly effectiveLocale = computed(
    () => this.locale() ?? this.injectedLocale ?? 'en-US',
  );

  /**
   * Two-way bound value. Acts as a `ModelSignal<Date | null>` so the component
   * satisfies Signal Forms' `FormValueControl<Date | null>` contract while also
   * being drivable from a parent template or from Reactive Forms via
   * `ControlValueAccessor`.
   */
  readonly value = model<Date | null>(null);

  // Standard FormUiControl signals (auto-bound by [formField])
  readonly disabled = input<boolean>(false);
  readonly readonly = input<boolean>(false);
  readonly required = input<boolean>(false);
  readonly minDate = input<Date | null>(null);
  readonly maxDate = input<Date | null>(null);
  readonly name = input<string>('');
  readonly touched = model<boolean>(false);

  // Customization inputs
  /**
   * BCP-47 locale tag used for date/time labels and formatting.
   *
   * When omitted, the component falls back to Angular's `LOCALE_ID` (the value
   * configured via `provideZonelessChangeDetection`, `bootstrapApplication`, or
   * the build-time `--localize`), and finally to `'en-US'`.
   */
  readonly locale = input<string | null>(null);
  readonly weekStartsOn = input<Weekday>(1);
  readonly hourCycle = input<HourCycle>('h23');
  readonly showSeconds = input<boolean>(false);
  readonly showTime = input<boolean>(true);
  readonly minuteStep = input<number>(1);
  readonly secondStep = input<number>(1);
  readonly placeholder = input<string>('Select date and time');
  readonly displayFormat = input<Intl.DateTimeFormatOptions | null>(null);
  /**
   * IANA time-zone name (e.g. `'Europe/Warsaw'`, `'America/New_York'`,
   * `'UTC'`). When set, the calendar and time inputs interpret the bound `Date`
   * as wall-clock time in that zone; the model is still a JavaScript `Date`
   * (an absolute UTC instant). When `null`, the picker uses the browser's local
   * zone (existing behavior).
   */
  readonly timeZone = input<string | null>(null);
  readonly closeOnSelect = input<boolean>(false);
  readonly clearLabel = input<string>('Clear');
  readonly confirmLabel = input<string>('OK');
  readonly nowLabel = input<string>('Now');
  readonly pickDateHint = input<string>('Pick a date to confirm this time');
  readonly ariaLabel = input<string>('Date and time picker');
  readonly presets = input<readonly TimePreset[] | null>(null);
  readonly wheelStep = input<boolean>(true);
  /**
   * If a value is null when the picker opens, pre-fill the time inputs with the current time
   * so the user gets a sensible default. Set to `false` to start at 00:00.
   */
  readonly suggestCurrentTime = input<boolean>(true);

  /**
   * Step-by-step (wizard) flow: when `true`, the panel shows the calendar
   * first; after a date is selected the panel switches to the time view and
   * a "Back" button lets the user return to the calendar. When `false`
   * (default) the calendar and time controls render side-by-side as before.
   * Has no effect when `showTime` is `false`.
   */
  readonly wizard = input<boolean>(false);
  /**
   * Viewport width (in CSS pixels) below which the panel renders as a
   * full-width bottom sheet with a backdrop instead of an absolutely-positioned
   * dropdown. Default is `640`, matching the common "tablet portrait" breakpoint.
   * Set to `0` to disable the mobile layout entirely.
   */
  readonly mobileBreakpoint = input<number>(640);
  /** Footer label for the "go back to the calendar" button in wizard mode. */
  readonly backLabel = input<string>('Back');
  /** Footer label for the "advance to the time step" button in wizard mode. */
  readonly nextLabel = input<string>('Next');
  /** Caption for the wizard date step (step 1). */
  readonly dateStepLabel = input<string>('Date');
  /** Caption for the wizard time step (step 2). */
  readonly timeStepLabel = input<string>('Time');

  /**
   * Optional floating label. When set, the trigger renders inside a Material-style
   * outlined field. The label sits over the input area and animates up to the
   * border when the picker is focused, opened, or has a value.
   */
  readonly label = input<string | null>(null);
  /** Optional helper text rendered under a labeled trigger. */
  readonly hint = input<string | null>(null);

  // CVA wiring -------------------------------------------------------------

  /** Disabled state driven by Reactive Forms via setDisabledState(). */
  private readonly cvaDisabled = signal(false);
  /** Last value pushed in by writeValue — used to avoid bouncing it back through onChange. */
  private cvaWriting = false;

  /** Combined disabled state used by the template / public API. */
  protected readonly effectiveDisabled = computed(
    () => this.disabled() || this.cvaDisabled(),
  );

  private cvaOnChange: (value: Date | null) => void = () => undefined;
  private cvaOnTouched: () => void = () => undefined;

  writeValue(value: Date | null): void {
    this.cvaWriting = true;
    this.value.set(value);
  }
  registerOnChange(fn: (value: Date | null) => void): void {
    this.cvaOnChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.cvaOnTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.cvaDisabled.set(isDisabled);
  }

  // Stable IDs for aria-labelledby / aria-describedby ----------------------

  private static seq = 0;
  private readonly instanceId = `${++NgxDatetimePicker.seq}`;
  protected readonly labelId = `ngx-dt-label-${this.instanceId}`;
  protected readonly hintId = `ngx-dt-hint-${this.instanceId}`;

  /**
   * True when the floating label should be in its "raised" position — when
   * the panel is open, the picker has a value, or the trigger has focus.
   * (Focus is also handled in pure CSS via `:focus-within`.)
   */
  protected readonly labelFloating = computed(
    () => this.isOpen() || !!this.value(),
  );

  // Template projection slots and view children ---------------------------

  readonly triggerTpl = contentChild<TemplateRef<NgxDatetimeTriggerContext>>('triggerTpl');
  readonly headerTpl = contentChild<TemplateRef<NgxDatetimePanelContext>>('headerTpl');
  readonly footerTpl = contentChild<TemplateRef<NgxDatetimePanelContext>>('footerTpl');

  private readonly triggerBtn = viewChild<ElementRef<HTMLButtonElement>>('triggerBtn');
  private readonly calendar = viewChild<NgxDatetimeCalendar>('calendar');

  // Local state ------------------------------------------------------------

  protected readonly isOpen = signal(false);
  /** Current step in wizard mode. Ignored when `wizard()` is `false`. */
  protected readonly step = signal<'date' | 'time'>('date');
  /** True when the viewport is narrower than `mobileBreakpoint`. */
  protected readonly isMobile = signal(false);

  /** Tracks whether the next render should move focus into the panel. */
  private readonly pendingPanelFocus = signal(false);
  /** Tracks whether the next render should move focus back to the trigger after close. */
  private readonly pendingTriggerFocus = signal(false);

  /** Time used while value is null — lets the user fiddle with hours/minutes before picking a date. */
  private readonly draftTime = signal<TimeValue>({ hours: 0, minutes: 0, seconds: 0 });

  constructor() {
    // Push internal value changes to the Reactive Forms control.
    effect(() => {
      const value = this.value();
      if (this.cvaWriting) {
        this.cvaWriting = false;
        return;
      }
      this.cvaOnChange(value);
    });

    // Focus management for WCAG: move focus into the panel on open and back on close.
    afterRenderEffect(() => {
      if (this.pendingPanelFocus() && this.isOpen()) {
        this.calendar()?.focusCurrent();
        this.pendingPanelFocus.set(false);
      }
      if (this.pendingTriggerFocus() && !this.isOpen()) {
        this.focus();
        this.pendingTriggerFocus.set(false);
      }
    });

    // Track viewport width to flip to bottom-sheet layout on mobile.
    effect((onCleanup) => {
      const bp = this.mobileBreakpoint();
      if (bp <= 0 || typeof window === 'undefined' || !window.matchMedia) {
        this.isMobile.set(false);
        return;
      }
      const mql = window.matchMedia(`(max-width: ${bp - 1}px)`);
      const update = (e: MediaQueryList | MediaQueryListEvent) =>
        this.isMobile.set(e.matches);
      update(mql);
      mql.addEventListener('change', update);
      onCleanup(() => mql.removeEventListener('change', update));
    });
  }

  // Derived state ----------------------------------------------------------

  /** The selected value, projected into the configured time zone (or local). */
  protected readonly zonedSelected = computed<Date | null>(() => {
    const v = this.value();
    if (!v) return null;
    const tz = this.timeZone();
    return tz ? toZonedFacade(v, tz) : v;
  });

  protected readonly zonedMin = computed<Date | null>(() => {
    const v = this.minDate();
    if (!v) return null;
    const tz = this.timeZone();
    return tz ? toZonedFacade(v, tz) : v;
  });

  protected readonly zonedMax = computed<Date | null>(() => {
    const v = this.maxDate();
    if (!v) return null;
    const tz = this.timeZone();
    return tz ? toZonedFacade(v, tz) : v;
  });

  protected readonly timeValue = computed<TimeValue>(() => {
    const facade = this.zonedSelected();
    if (facade) {
      return {
        hours: facade.getHours(),
        minutes: facade.getMinutes(),
        seconds: facade.getSeconds(),
      };
    }
    return this.draftTime();
  });

  protected readonly effectivePresets = computed<readonly TimePreset[]>(
    () => this.presets() ?? DEFAULT_PRESETS,
  );

  protected readonly displayText = computed(() => {
    const v = this.value();
    if (!v) return this.placeholder();
    const userFmt = this.displayFormat();
    const tz = this.timeZone();
    const base = userFmt ?? defaultDisplayFormat(this.showSeconds(), this.hourCycle());
    const fmt: Intl.DateTimeFormatOptions = tz ? { ...base, timeZone: tz } : base;
    return formatDateTime(v, this.effectiveLocale(), fmt);
  });

  protected readonly triggerContext = computed<NgxDatetimeTriggerContext>(() => ({
    value: this.value(),
    display: this.displayText(),
    open: () => this.open(),
    toggle: () => this.toggle(),
    disabled: this.effectiveDisabled(),
  }));

  protected readonly panelContext = computed<NgxDatetimePanelContext>(() => ({
    value: this.value(),
    close: () => this.close(),
  }));

  // Public API -------------------------------------------------------------

  open(): void {
    if (this.effectiveDisabled()) return;
    if (!this.value() && this.suggestCurrentTime()) {
      this.draftTime.set(currentTime(this.timeZone()));
    }
    // Wizard always opens on the date step.
    if (this.wizard()) this.step.set('date');
    this.isOpen.set(true);
    this.pendingPanelFocus.set(true);
  }

  close(returnFocus = true): void {
    if (!this.isOpen()) return;
    this.isOpen.set(false);
    this.touched.set(true);
    this.cvaOnTouched();
    if (returnFocus) {
      this.pendingTriggerFocus.set(true);
    }
  }

  toggle(): void {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  clear(): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    this.value.set(null);
    if (this.suggestCurrentTime()) {
      this.draftTime.set(currentTime(this.timeZone()));
    }
    this.touched.set(true);
  }

  confirm(): void {
    this.close();
  }

  setNow(): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    const clamped = clampDate(new Date(), this.minDate(), this.maxDate());
    this.value.set(clamped);
    const tz = this.timeZone();
    const projected = tz ? toZonedFacade(clamped, tz) : clamped;
    this.draftTime.set({
      hours: projected.getHours(),
      minutes: projected.getMinutes(),
      seconds: projected.getSeconds(),
    });
  }

  /** Wizard navigation — go back to the calendar step. */
  goToDate(): void {
    this.step.set('date');
  }

  /** Wizard navigation — move to the time step (no-op until a date is set). */
  goToTime(): void {
    if (!this.value()) return;
    this.step.set('time');
  }

  focus(): void {
    this.triggerBtn()?.nativeElement.focus();
  }

  // Event handlers ---------------------------------------------------------

  protected onDateSelect(date: Date): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    const tz = this.timeZone();
    const current = this.value();
    const currentFacade = current
      ? tz ? toZonedFacade(current, tz) : current
      : null;
    const t = currentFacade
      ? {
          hours: currentFacade.getHours(),
          minutes: currentFacade.getMinutes(),
          seconds: currentFacade.getSeconds(),
        }
      : this.draftTime();
    const facade = combineDateAndTime(date, t.hours, t.minutes, t.seconds);
    const next = tz ? fromZonedFacade(facade, tz) : facade;
    this.value.set(clampDate(next, this.minDate(), this.maxDate()));

    // Wizard: a date pick advances to the time step.
    if (this.wizard() && this.showTime()) {
      this.step.set('time');
      return;
    }

    if (this.closeOnSelect() && !this.showTime()) {
      this.close();
    }
  }

  protected onTimeChange(time: TimeValue): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    this.draftTime.set(time);
    const current = this.value();
    if (!current) return; // wait until a date is picked
    const tz = this.timeZone();
    const facade = tz ? toZonedFacade(current, tz) : current;
    const newFacade = combineDateAndTime(facade, time.hours, time.minutes, time.seconds);
    const next = tz ? fromZonedFacade(newFacade, tz) : newFacade;
    this.value.set(clampDate(next, this.minDate(), this.maxDate()));
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen()) return;
    const target = event.target as Node | null;
    if (!target) return;
    if (!this.hostRef.nativeElement.contains(target)) {
      // Don't yank focus back to the trigger when the user clicked elsewhere intentionally.
      this.close(false);
    }
  }
}
