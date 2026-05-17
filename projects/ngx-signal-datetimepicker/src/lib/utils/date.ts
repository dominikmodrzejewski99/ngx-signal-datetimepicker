export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type HourCycle = 'h12' | 'h23';

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  const day = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + months);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, lastDay));
  return next;
}

export function addYears(date: Date, years: number): Date {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return next;
}

export function sameDay(a: Date | null | undefined, b: Date | null | undefined): boolean {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function clampDate(value: Date, min: Date | null, max: Date | null): Date {
  let result = value;
  if (min && result.getTime() < min.getTime()) result = new Date(min);
  if (max && result.getTime() > max.getTime()) result = new Date(max);
  return result;
}

export function isBefore(a: Date, b: Date): boolean {
  return a.getTime() < b.getTime();
}

export function isAfter(a: Date, b: Date): boolean {
  return a.getTime() > b.getTime();
}

export interface CalendarDay {
  date: Date;
  inCurrentMonth: boolean;
  isToday: boolean;
}

export function buildCalendarGrid(
  visibleMonth: Date,
  weekStartsOn: Weekday,
): CalendarDay[] {
  const first = startOfMonth(visibleMonth);
  const firstWeekday = first.getDay();
  const offset = (firstWeekday - weekStartsOn + 7) % 7;

  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - offset);

  const today = new Date();
  const days: CalendarDay[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push({
      date: d,
      inCurrentMonth: d.getMonth() === visibleMonth.getMonth(),
      isToday: sameDay(d, today),
    });
  }
  return days;
}

export function getWeekdayLabels(locale: string, weekStartsOn: Weekday): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  const labels: string[] = [];
  const ref = new Date(2024, 0, 7); // 2024-01-07 is a Sunday
  for (let i = 0; i < 7; i++) {
    const d = new Date(ref);
    d.setDate(ref.getDate() + ((i + weekStartsOn) % 7));
    labels.push(fmt.format(d));
  }
  return labels;
}

export function combineDateAndTime(
  date: Date,
  hours: number,
  minutes: number,
  seconds = 0,
): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hours,
    minutes,
    seconds,
    0,
  );
}

export function formatDateTime(
  value: Date,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(locale, options).format(value);
}

const DEFAULT_FORMAT: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
};

export function defaultDisplayFormat(showSeconds: boolean, hourCycle: HourCycle): Intl.DateTimeFormatOptions {
  return {
    ...DEFAULT_FORMAT,
    second: showSeconds ? '2-digit' : undefined,
    hourCycle,
  };
}

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function clampHour(hour: number, cycle: HourCycle): number {
  const max = cycle === 'h12' ? 12 : 23;
  const min = cycle === 'h12' ? 1 : 0;
  if (Number.isNaN(hour)) return min;
  return Math.max(min, Math.min(max, hour));
}

export function clampMinuteOrSecond(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(59, value));
}

export function to24Hour(hour: number, period: 'AM' | 'PM'): number {
  if (period === 'AM') return hour === 12 ? 0 : hour;
  return hour === 12 ? 12 : hour + 12;
}

export function to12Hour(hour: number): { hour: number; period: 'AM' | 'PM' } {
  const period: 'AM' | 'PM' = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return { hour: h, period };
}
