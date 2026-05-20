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
  /** Always 0-23, even when {@link NgxDatetimeTime.hourCycle} is `'h12'`. */
  hours: number;
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
  templateUrl: './time.component.html',
  styleUrl: './time.component.scss',
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
      this.valueChange.emit({ ...current, hours });
    } else if (unit === 'm') {
      const minutes = (current.minutes + delta + 60) % 60;
      this.valueChange.emit({ ...current, minutes });
    } else {
      const seconds = (current.seconds + delta + 60) % 60;
      this.valueChange.emit({ ...current, seconds });
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
    const raw = this.digitsOnly(event);
    if (raw.length < 1) return;
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) return;
    const clamped = clampHour(parsed, this.hourCycle());
    const hours24 =
      this.hourCycle() === 'h12' ? to24Hour(clamped, this.period()) : clamped;
    this.valueChange.emit({ ...this.value(), hours: hours24 });
  }

  protected onMinuteInput(event: Event): void {
    const raw = this.digitsOnly(event);
    if (raw.length < 1) return;
    this.valueChange.emit({
      ...this.value(),
      minutes: clampMinuteOrSecond(Number(raw)),
    });
  }

  protected onSecondInput(event: Event): void {
    const raw = this.digitsOnly(event);
    if (raw.length < 1) return;
    this.valueChange.emit({
      ...this.value(),
      seconds: clampMinuteOrSecond(Number(raw)),
    });
  }

  // Blur handlers re-sync the visible text with the canonical model. This is
  // needed because `[value]` only writes to the DOM when the bound value
  // actually changes, and an invalid keystroke that clamps to the *current*
  // value would otherwise leave stale text in the input.
  protected onBlurHour(event: Event): void {
    this.inputEl(event).value = this.displayHour();
  }

  protected onBlurMinute(event: Event): void {
    this.inputEl(event).value = this.paddedMinutes();
  }

  protected onBlurSecond(event: Event): void {
    this.inputEl(event).value = this.paddedSeconds();
  }

  protected selectAll(event: FocusEvent): void {
    this.inputEl(event).select();
  }

  protected setPeriod(period: 'AM' | 'PM'): void {
    if (this.disabled() || this.readonly()) return;
    if (this.period() === period) return;
    const current = this.value();
    const { hour } = to12Hour(current.hours);
    this.valueChange.emit({ ...current, hours: to24Hour(hour, period) });
  }

  protected applyPreset(preset: TimePreset): void {
    if (this.disabled() || this.readonly()) return;
    const next =
      typeof preset.apply === 'function' ? preset.apply(this.value()) : preset.apply;
    this.valueChange.emit({
      hours: clampHour(next.hours, 'h23'),
      minutes: clampMinuteOrSecond(next.minutes),
      seconds: clampMinuteOrSecond(next.seconds),
    });
  }

  private inputEl(event: Event): HTMLInputElement {
    return event.target as HTMLInputElement;
  }

  private digitsOnly(event: Event): string {
    return this.inputEl(event).value.replace(/\D/g, '');
  }
}
