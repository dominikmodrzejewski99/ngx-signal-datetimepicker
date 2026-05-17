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
  HourCycle,
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

function currentTime(): TimeValue {
  const now = new Date();
  return { hours: now.getHours(), minutes: now.getMinutes(), seconds: now.getSeconds() };
}

@Component({
  selector: 'ngx-datetime-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgxDatetimeCalendar, NgxDatetimeTime, NgTemplateOutlet],
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
    '[attr.data-cycle]': 'hourCycle()',
    '(document:click)': 'onDocumentClick($event)',
    '(keydown.escape)': 'close()',
  },
  template: `
    @if (triggerTpl(); as tpl) {
      <ng-container
        [ngTemplateOutlet]="tpl"
        [ngTemplateOutletContext]="triggerContext()"
      />
    } @else {
      <button
        type="button"
        class="ngx-dt-trigger"
        [attr.aria-haspopup]="'dialog'"
        [attr.aria-expanded]="isOpen()"
        [disabled]="effectiveDisabled()"
        (click)="toggle()"
      >
        <span class="ngx-dt-trigger__text" [class.is-placeholder]="!value()">
          {{ displayText() }}
        </span>
        <span class="ngx-dt-trigger__icon" aria-hidden="true">📅</span>
      </button>
    }

    @if (isOpen()) {
      <div
        #panel
        class="ngx-dt-panel"
        role="dialog"
        [attr.aria-label]="ariaLabel()"
      >
        @if (headerTpl(); as tpl) {
          <ng-container
            [ngTemplateOutlet]="tpl"
            [ngTemplateOutletContext]="panelContext()"
          />
        }
        <ngx-datetime-calendar
          #calendar
          [selected]="value()"
          [min]="minDate()"
          [max]="maxDate()"
          [locale]="locale()"
          [weekStartsOn]="weekStartsOn()"
          [ariaLabel]="'Date'"
          (daySelect)="onDateSelect($event)"
        />
        @if (showTime()) {
          <div class="ngx-dt-divider" role="separator"></div>
          @if (!value()) {
            <p class="ngx-dt-hint">{{ pickDateHint() }}</p>
          }
          <ngx-datetime-time
            [value]="timeValue()"
            [hourCycle]="hourCycle()"
            [showSeconds]="showSeconds()"
            [minuteStep]="minuteStep()"
            [secondStep]="secondStep()"
            [disabled]="effectiveDisabled()"
            [readonly]="readonly()"
            [presets]="effectivePresets()"
            [wheel]="wheelStep()"
            (valueChange)="onTimeChange($event)"
          />
        }
        @if (footerTpl(); as tpl) {
          <ng-container
            [ngTemplateOutlet]="tpl"
            [ngTemplateOutletContext]="panelContext()"
          />
        } @else {
          <div class="ngx-dt-actions">
            <button
              type="button"
              class="ngx-dt-btn ngx-dt-btn--ghost"
              (click)="setNow()"
              [disabled]="effectiveDisabled() || readonly()"
            >{{ nowLabel() }}</button>
            <span class="ngx-dt-actions__spacer"></span>
            <button
              type="button"
              class="ngx-dt-btn ngx-dt-btn--ghost"
              (click)="clear()"
              [disabled]="effectiveDisabled() || readonly() || !value()"
            >{{ clearLabel() }}</button>
            <button
              type="button"
              class="ngx-dt-btn ngx-dt-btn--primary"
              (click)="confirm()"
              [disabled]="effectiveDisabled() || readonly()"
            >{{ confirmLabel() }}</button>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    :host { position: relative; display: inline-block; font-family: var(--ngx-dt-font, inherit); }
    :host.is-disabled { opacity: 0.6; pointer-events: none; }

    .ngx-dt-trigger {
      display: inline-flex; align-items: center; gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--ngx-dt-border, #d1d5db);
      background: var(--ngx-dt-input-bg, #fff);
      color: var(--ngx-dt-fg, inherit);
      border-radius: var(--ngx-dt-radius, 0.5rem);
      cursor: pointer;
      font: inherit;
      min-width: var(--ngx-dt-trigger-min-width, 16rem);
      justify-content: space-between;
    }
    .ngx-dt-trigger:hover:not(:disabled) {
      border-color: var(--ngx-dt-focus, #2563eb);
    }
    .ngx-dt-trigger:focus-visible {
      outline: 2px solid var(--ngx-dt-focus, #2563eb);
      outline-offset: 2px;
    }
    .ngx-dt-trigger__text.is-placeholder { color: var(--ngx-dt-muted, #6b7280); }

    .ngx-dt-panel {
      position: absolute;
      z-index: var(--ngx-dt-z, 1000);
      top: calc(100% + 0.375rem);
      left: 0;
      background: var(--ngx-dt-panel-bg, #fff);
      color: var(--ngx-dt-fg, inherit);
      border: 1px solid var(--ngx-dt-border, #e5e7eb);
      border-radius: var(--ngx-dt-radius-lg, 0.75rem);
      padding: var(--ngx-dt-panel-padding, 0.875rem);
      box-shadow: var(--ngx-dt-shadow, 0 12px 32px rgba(0,0,0,0.12));
      display: flex; flex-direction: column; gap: 0.75rem;
      min-width: 19rem;
    }
    .ngx-dt-divider { height: 1px; background: var(--ngx-dt-border, #e5e7eb); }
    .ngx-dt-hint {
      margin: 0;
      font-size: 0.75rem;
      color: var(--ngx-dt-muted, #6b7280);
      text-align: center;
    }
    .ngx-dt-actions {
      display: flex; align-items: center; gap: 0.375rem;
    }
    .ngx-dt-actions__spacer { flex: 1; }
    .ngx-dt-btn {
      padding: 0.5rem 0.875rem;
      border-radius: var(--ngx-dt-radius, 0.5rem);
      border: 1px solid transparent;
      cursor: pointer;
      font: inherit; font-weight: 500;
    }
    .ngx-dt-btn:focus-visible {
      outline: 2px solid var(--ngx-dt-focus, #2563eb);
      outline-offset: 2px;
    }
    .ngx-dt-btn--ghost {
      background: transparent;
      color: var(--ngx-dt-fg, inherit);
    }
    .ngx-dt-btn--ghost:hover:not(:disabled) {
      background: var(--ngx-dt-nav-bg-hover, rgba(0,0,0,0.05));
    }
    .ngx-dt-btn--primary {
      background: var(--ngx-dt-accent, #2563eb);
      color: var(--ngx-dt-accent-fg, #fff);
    }
    .ngx-dt-btn--primary:hover:not(:disabled) { filter: brightness(0.95); }
    .ngx-dt-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class NgxDatetimePicker
  implements FormValueControl<Date | null>, ControlValueAccessor
{
  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);

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
  }

  // -- ControlValueAccessor ---------------------------------------------------

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

  // Customization inputs
  readonly locale = input<string>('en-US');
  readonly weekStartsOn = input<Weekday>(1);
  readonly hourCycle = input<HourCycle>('h23');
  readonly showSeconds = input<boolean>(false);
  readonly showTime = input<boolean>(true);
  readonly minuteStep = input<number>(1);
  readonly secondStep = input<number>(1);
  readonly placeholder = input<string>('Select date and time');
  readonly displayFormat = input<Intl.DateTimeFormatOptions | null>(null);
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

  // Template slots
  readonly triggerTpl = contentChild<TemplateRef<NgxDatetimeTriggerContext>>('triggerTpl');
  readonly headerTpl = contentChild<TemplateRef<NgxDatetimePanelContext>>('headerTpl');
  readonly footerTpl = contentChild<TemplateRef<NgxDatetimePanelContext>>('footerTpl');

  protected readonly isOpen = signal(false);
  protected readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly calendar = viewChild<NgxDatetimeCalendar>('calendar');

  /** Tracks whether the next render should move focus into the panel. */
  private readonly pendingPanelFocus = signal(false);
  /** Tracks whether the next render should move focus back to the trigger after close. */
  private readonly pendingTriggerFocus = signal(false);

  constructor() {
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
  }

  /** Time used while value is null — lets the user fiddle with hours/minutes before picking a date. */
  private readonly draftTime = signal<TimeValue>({ hours: 0, minutes: 0, seconds: 0 });

  protected readonly timeValue = computed<TimeValue>(() => {
    const v = this.value();
    if (v) return { hours: v.getHours(), minutes: v.getMinutes(), seconds: v.getSeconds() };
    return this.draftTime();
  });

  protected readonly effectivePresets = computed<readonly TimePreset[]>(
    () => this.presets() ?? DEFAULT_PRESETS,
  );

  protected readonly displayText = computed(() => {
    const v = this.value();
    if (!v) return this.placeholder();
    const fmt = this.displayFormat() ?? defaultDisplayFormat(this.showSeconds(), this.hourCycle());
    return formatDateTime(v, this.locale(), fmt);
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

  open(): void {
    if (this.effectiveDisabled()) return;
    if (!this.value() && this.suggestCurrentTime()) {
      this.draftTime.set(currentTime());
    }
    this.isOpen.set(true);
    this.pendingPanelFocus.set(true);
  }

  close(returnFocus = true): void {
    if (this.isOpen()) {
      this.isOpen.set(false);
      this.touched.set(true);
      if (returnFocus) {
        this.pendingTriggerFocus.set(true);
      }
    }
  }

  toggle(): void {
    this.isOpen() ? this.close() : this.open();
  }

  clear(): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    this.value.set(null);
    if (this.suggestCurrentTime()) {
      this.draftTime.set(currentTime());
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
    this.draftTime.set({
      hours: clamped.getHours(),
      minutes: clamped.getMinutes(),
      seconds: clamped.getSeconds(),
    });
  }

  protected onDateSelect(date: Date): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    const current = this.value();
    const t = current
      ? { hours: current.getHours(), minutes: current.getMinutes(), seconds: current.getSeconds() }
      : this.draftTime();
    const next = combineDateAndTime(date, t.hours, t.minutes, t.seconds);
    this.value.set(clampDate(next, this.minDate(), this.maxDate()));
    if (this.closeOnSelect() && !this.showTime()) {
      this.close();
    }
  }

  protected onTimeChange(time: TimeValue): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    this.draftTime.set(time);
    const current = this.value();
    if (!current) return; // wait until a date is picked
    const next = combineDateAndTime(current, time.hours, time.minutes, time.seconds);
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

  focus(): void {
    const trigger = this.hostRef.nativeElement.querySelector<HTMLElement>(
      'button.ngx-dt-trigger',
    );
    trigger?.focus();
  }
}
