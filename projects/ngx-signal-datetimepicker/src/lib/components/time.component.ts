import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import {
  clampHour,
  clampMinuteOrSecond,
  HourCycle,
  pad2,
  to12Hour,
  to24Hour,
} from '../utils/date';

export interface TimeValue {
  hours: number; // always 0-23
  minutes: number;
  seconds: number;
}

export interface TimePreset {
  label: string;
  /** Either an absolute time, or a function returning the next value given the current value. */
  apply: TimeValue | ((current: TimeValue) => TimeValue);
}

@Component({
  selector: 'ngx-datetime-time',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ngx-dt-time" role="group" [attr.aria-label]="ariaLabel()">
      <div class="ngx-dt-time__main">
        <div class="ngx-dt-time__field" (wheel)="onWheel($event, 'h')">
          <button
            type="button"
            class="ngx-dt-time__step"
            (click)="step('h', 1)"
            aria-label="Increase hours"
            [disabled]="disabled() || readonly()"
          >▲</button>
          <input
            class="ngx-dt-time__input"
            type="text"
            inputmode="numeric"
            maxlength="2"
            aria-label="Hours"
            [value]="displayHour()"
            (input)="onHourInput($event)"
            (focus)="selectAll($event)"
            (blur)="onBlurHour($event)"
            [disabled]="disabled()"
            [readOnly]="readonly()"
          />
          <button
            type="button"
            class="ngx-dt-time__step"
            (click)="step('h', -1)"
            aria-label="Decrease hours"
            [disabled]="disabled() || readonly()"
          >▼</button>
        </div>

        <span class="ngx-dt-time__sep" aria-hidden="true">:</span>

        <div class="ngx-dt-time__field" (wheel)="onWheel($event, 'm')">
          <button
            type="button"
            class="ngx-dt-time__step"
            (click)="step('m', minuteStep())"
            aria-label="Increase minutes"
            [disabled]="disabled() || readonly()"
          >▲</button>
          <input
            class="ngx-dt-time__input"
            type="text"
            inputmode="numeric"
            maxlength="2"
            aria-label="Minutes"
            [value]="paddedMinutes()"
            (input)="onMinuteInput($event)"
            (focus)="selectAll($event)"
            (blur)="onBlurMinute($event)"
            [disabled]="disabled()"
            [readOnly]="readonly()"
          />
          <button
            type="button"
            class="ngx-dt-time__step"
            (click)="step('m', -minuteStep())"
            aria-label="Decrease minutes"
            [disabled]="disabled() || readonly()"
          >▼</button>
        </div>

        @if (showSeconds()) {
          <span class="ngx-dt-time__sep" aria-hidden="true">:</span>
          <div class="ngx-dt-time__field" (wheel)="onWheel($event, 's')">
            <button
              type="button"
              class="ngx-dt-time__step"
              (click)="step('s', secondStep())"
              aria-label="Increase seconds"
              [disabled]="disabled() || readonly()"
            >▲</button>
            <input
              class="ngx-dt-time__input"
              type="text"
              inputmode="numeric"
              maxlength="2"
              aria-label="Seconds"
              [value]="paddedSeconds()"
              (input)="onSecondInput($event)"
              (focus)="selectAll($event)"
              (blur)="onBlurSecond($event)"
              [disabled]="disabled()"
              [readOnly]="readonly()"
            />
            <button
              type="button"
              class="ngx-dt-time__step"
              (click)="step('s', -secondStep())"
              aria-label="Decrease seconds"
              [disabled]="disabled() || readonly()"
            >▼</button>
          </div>
        }

        @if (hourCycle() === 'h12') {
          <div class="ngx-dt-time__period" role="group" aria-label="AM or PM">
            <button
              type="button"
              class="ngx-dt-time__period-btn"
              [class.is-active]="period() === 'AM'"
              [attr.aria-pressed]="period() === 'AM'"
              (click)="setPeriod('AM')"
              [disabled]="disabled() || readonly()"
            >AM</button>
            <button
              type="button"
              class="ngx-dt-time__period-btn"
              [class.is-active]="period() === 'PM'"
              [attr.aria-pressed]="period() === 'PM'"
              (click)="setPeriod('PM')"
              [disabled]="disabled() || readonly()"
            >PM</button>
          </div>
        }
      </div>

      @if (presets().length) {
        <div class="ngx-dt-time__presets" role="group" aria-label="Quick presets">
          @for (preset of presets(); track preset.label) {
            <button
              type="button"
              class="ngx-dt-time__preset"
              (click)="applyPreset(preset)"
              [disabled]="disabled() || readonly()"
            >{{ preset.label }}</button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .ngx-dt-time {
      display: flex; flex-direction: column;
      gap: var(--ngx-dt-time-gap, 0.5rem);
      font: inherit;
    }
    .ngx-dt-time__main {
      display: flex; align-items: stretch;
      gap: var(--ngx-dt-gap, 0.25rem);
      justify-content: center;
    }
    .ngx-dt-time__field {
      display: inline-flex; flex-direction: column;
      align-items: stretch; gap: 2px;
    }
    .ngx-dt-time__input {
      width: var(--ngx-dt-time-input-width, 3rem);
      height: var(--ngx-dt-time-input-height, 2.5rem);
      text-align: center;
      font-size: var(--ngx-dt-time-input-font-size, 1.25rem);
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      border: 1px solid var(--ngx-dt-border, #d1d5db);
      background: var(--ngx-dt-input-bg, #fff);
      color: var(--ngx-dt-fg, inherit);
      border-radius: var(--ngx-dt-radius, 0.5rem);
      padding: 0.25rem;
    }
    .ngx-dt-time__input:focus-visible {
      outline: 2px solid var(--ngx-dt-focus, #2563eb);
      outline-offset: 1px;
      border-color: var(--ngx-dt-focus, #2563eb);
    }
    .ngx-dt-time__step {
      border: 1px solid var(--ngx-dt-border, #e5e7eb);
      background: var(--ngx-dt-input-bg, #fff);
      color: var(--ngx-dt-fg, inherit);
      width: 100%; height: 1.25rem;
      border-radius: var(--ngx-dt-radius, 0.375rem);
      cursor: pointer;
      font-size: 0.625rem; line-height: 1;
      display: inline-flex; align-items: center; justify-content: center;
    }
    .ngx-dt-time__step:hover:not(:disabled) {
      background: var(--ngx-dt-nav-bg-hover, rgba(0,0,0,0.05));
      border-color: var(--ngx-dt-focus, #2563eb);
    }
    .ngx-dt-time__step:focus-visible {
      outline: 2px solid var(--ngx-dt-focus, #2563eb);
      outline-offset: 1px;
    }
    .ngx-dt-time__step:disabled { opacity: 0.4; cursor: not-allowed; }

    .ngx-dt-time__sep {
      align-self: center;
      font-weight: 700;
      font-size: 1.25rem;
      padding: 0 0.125rem;
      color: var(--ngx-dt-muted, #6b7280);
    }

    .ngx-dt-time__period {
      display: inline-flex; align-self: center;
      border: 1px solid var(--ngx-dt-border, #d1d5db);
      border-radius: var(--ngx-dt-radius, 0.5rem);
      overflow: hidden;
      margin-left: 0.5rem;
    }
    .ngx-dt-time__period-btn {
      border: none;
      background: var(--ngx-dt-input-bg, #fff);
      color: var(--ngx-dt-fg, inherit);
      padding: 0.5rem 0.75rem;
      cursor: pointer; font: inherit; font-weight: 600;
    }
    .ngx-dt-time__period-btn + .ngx-dt-time__period-btn {
      border-left: 1px solid var(--ngx-dt-border, #d1d5db);
    }
    .ngx-dt-time__period-btn:hover:not(.is-active):not(:disabled) {
      background: var(--ngx-dt-nav-bg-hover, rgba(0,0,0,0.05));
    }
    .ngx-dt-time__period-btn.is-active {
      background: var(--ngx-dt-accent, #2563eb);
      color: var(--ngx-dt-accent-fg, #fff);
    }
    .ngx-dt-time__period-btn:focus-visible {
      outline: 2px solid var(--ngx-dt-focus, #2563eb);
      outline-offset: -2px;
    }

    .ngx-dt-time__presets {
      display: flex; flex-wrap: wrap; gap: 0.25rem;
      justify-content: center;
    }
    .ngx-dt-time__preset {
      padding: 0.25rem 0.625rem;
      border: 1px solid var(--ngx-dt-border, #e5e7eb);
      background: transparent;
      color: var(--ngx-dt-fg, inherit);
      border-radius: 9999px;
      cursor: pointer; font: inherit; font-size: 0.8rem;
    }
    .ngx-dt-time__preset:hover:not(:disabled) {
      background: var(--ngx-dt-nav-bg-hover, rgba(0,0,0,0.05));
      border-color: var(--ngx-dt-focus, #2563eb);
    }
    .ngx-dt-time__preset:focus-visible {
      outline: 2px solid var(--ngx-dt-focus, #2563eb);
      outline-offset: 2px;
    }
    .ngx-dt-time__preset:disabled { opacity: 0.4; cursor: not-allowed; }
  `],
})
export class NgxDatetimeTime {
  readonly value = input.required<TimeValue>();
  readonly hourCycle = input<HourCycle>('h23');
  readonly showSeconds = input<boolean>(false);
  readonly minuteStep = input<number>(1);
  readonly secondStep = input<number>(1);
  readonly disabled = input<boolean>(false);
  readonly readonly = input<boolean>(false);
  readonly ariaLabel = input<string>('Time');
  readonly presets = input<readonly TimePreset[]>([]);
  readonly wheel = input<boolean>(true);

  readonly valueChange = output<TimeValue>();

  protected readonly period = computed<'AM' | 'PM'>(() =>
    this.value().hours >= 12 ? 'PM' : 'AM',
  );

  protected readonly displayHour = computed(() => {
    if (this.hourCycle() === 'h12') {
      return pad2(to12Hour(this.value().hours).hour);
    }
    return pad2(this.value().hours);
  });

  protected readonly paddedMinutes = computed(() => pad2(this.value().minutes));
  protected readonly paddedSeconds = computed(() => pad2(this.value().seconds));

  protected step(unit: 'h' | 'm' | 's', delta: number): void {
    if (this.disabled() || this.readonly()) return;
    const current = this.value();
    if (unit === 'h') {
      const hours = (current.hours + delta + 24) % 24;
      this.emit({ ...current, hours });
    } else if (unit === 'm') {
      const minutes = (current.minutes + delta + 60) % 60;
      this.emit({ ...current, minutes });
    } else {
      const seconds = (current.seconds + delta + 60) % 60;
      this.emit({ ...current, seconds });
    }
  }

  protected onWheel(event: WheelEvent, unit: 'h' | 'm' | 's'): void {
    if (!this.wheel() || this.disabled() || this.readonly()) return;
    event.preventDefault();
    const delta = event.deltaY < 0 ? 1 : -1;
    const step =
      unit === 'h' ? 1 : unit === 'm' ? this.minuteStep() : this.secondStep();
    this.step(unit, delta * step);
  }

  protected onHourInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value.replace(/\D/g, '');
    if (raw.length < 1) return;
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) return;
    const clamped = clampHour(parsed, this.hourCycle());
    const hours24 =
      this.hourCycle() === 'h12' ? to24Hour(clamped, this.period()) : clamped;
    this.emit({ ...this.value(), hours: hours24 });
  }

  protected onMinuteInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value.replace(/\D/g, '');
    if (raw.length < 1) return;
    const parsed = clampMinuteOrSecond(Number(raw));
    this.emit({ ...this.value(), minutes: parsed });
  }

  protected onSecondInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value.replace(/\D/g, '');
    if (raw.length < 1) return;
    const parsed = clampMinuteOrSecond(Number(raw));
    this.emit({ ...this.value(), seconds: parsed });
  }

  protected onBlurHour(event: Event): void {
    (event.target as HTMLInputElement).value = this.displayHour();
  }

  protected onBlurMinute(event: Event): void {
    (event.target as HTMLInputElement).value = this.paddedMinutes();
  }

  protected onBlurSecond(event: Event): void {
    (event.target as HTMLInputElement).value = this.paddedSeconds();
  }

  protected selectAll(event: FocusEvent): void {
    (event.target as HTMLInputElement).select();
  }

  protected setPeriod(period: 'AM' | 'PM'): void {
    if (this.disabled() || this.readonly()) return;
    if (this.period() === period) return;
    const current = this.value();
    const { hour } = to12Hour(current.hours);
    this.emit({ ...current, hours: to24Hour(hour, period) });
  }

  protected applyPreset(preset: TimePreset): void {
    if (this.disabled() || this.readonly()) return;
    const next =
      typeof preset.apply === 'function' ? preset.apply(this.value()) : preset.apply;
    this.emit({
      hours: clampHour(next.hours, 'h23'),
      minutes: clampMinuteOrSecond(next.minutes),
      seconds: clampMinuteOrSecond(next.seconds),
    });
  }

  private emit(next: TimeValue): void {
    this.valueChange.emit(next);
  }
}
