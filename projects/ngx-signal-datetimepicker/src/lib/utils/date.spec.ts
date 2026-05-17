import { describe, expect, it } from 'vitest';
import {
  addMonths,
  addYears,
  buildCalendarGrid,
  clampDate,
  clampHour,
  clampMinuteOrSecond,
  combineDateAndTime,
  defaultDisplayFormat,
  endOfMonth,
  formatDateTime,
  getWeekdayLabels,
  isAfter,
  isBefore,
  pad2,
  sameDay,
  startOfMonth,
  to12Hour,
  to24Hour,
  Weekday,
} from './date';

describe('date utils', () => {
  describe('startOfMonth / endOfMonth', () => {
    it('returns first ms of month', () => {
      const d = startOfMonth(new Date(2024, 5, 17, 13, 45, 22, 500));
      expect(d.toISOString()).toBe(new Date(2024, 5, 1, 0, 0, 0, 0).toISOString());
    });
    it('returns last ms of month', () => {
      const d = endOfMonth(new Date(2024, 1, 5));
      expect(d.getMonth()).toBe(1);
      expect(d.getDate()).toBe(29); // 2024 is a leap year
      expect(d.getHours()).toBe(23);
      expect(d.getMilliseconds()).toBe(999);
    });
  });

  describe('addMonths', () => {
    it('adds and subtracts months', () => {
      const base = new Date(2024, 0, 31);
      expect(addMonths(base, 1).getMonth()).toBe(1);
      expect(addMonths(base, 1).getDate()).toBe(29); // clamps to last day of Feb
      expect(addMonths(base, -1).getMonth()).toBe(11);
      expect(addMonths(base, -1).getFullYear()).toBe(2023);
    });
  });

  describe('addYears', () => {
    it('adds and subtracts years', () => {
      const base = new Date(2024, 2, 15);
      expect(addYears(base, 1).getFullYear()).toBe(2025);
      expect(addYears(base, -10).getFullYear()).toBe(2014);
    });
  });

  describe('sameDay', () => {
    it('returns true when both args are the same calendar day', () => {
      expect(sameDay(new Date(2024, 1, 1, 0), new Date(2024, 1, 1, 23))).toBe(true);
      expect(sameDay(new Date(2024, 1, 1), new Date(2024, 1, 2))).toBe(false);
    });
    it('returns false when either is nullish', () => {
      expect(sameDay(null, new Date())).toBe(false);
      expect(sameDay(new Date(), undefined)).toBe(false);
      expect(sameDay(null, null)).toBe(false);
    });
  });

  describe('clampDate', () => {
    const min = new Date(2024, 0, 5);
    const max = new Date(2024, 0, 10);
    it('clamps below min', () => {
      expect(clampDate(new Date(2024, 0, 1), min, max).getTime()).toBe(min.getTime());
    });
    it('clamps above max', () => {
      expect(clampDate(new Date(2024, 0, 20), min, max).getTime()).toBe(max.getTime());
    });
    it('returns input when within range', () => {
      const v = new Date(2024, 0, 7);
      expect(clampDate(v, min, max).getTime()).toBe(v.getTime());
    });
    it('ignores nullish bounds', () => {
      const v = new Date(2024, 0, 7);
      expect(clampDate(v, null, null)).toEqual(v);
    });
  });

  describe('isBefore / isAfter', () => {
    it('compares two dates', () => {
      const a = new Date(2024, 0, 1);
      const b = new Date(2024, 0, 2);
      expect(isBefore(a, b)).toBe(true);
      expect(isAfter(b, a)).toBe(true);
      expect(isBefore(b, a)).toBe(false);
      expect(isAfter(a, b)).toBe(false);
    });
  });

  describe('buildCalendarGrid', () => {
    it('emits 42 cells starting on the configured weekday', () => {
      const grid = buildCalendarGrid(new Date(2024, 5, 15), 1 as Weekday);
      expect(grid).toHaveLength(42);
      expect(grid[0].date.getDay()).toBe(1); // starts on Monday
    });
    it('marks today and current month correctly', () => {
      const today = new Date();
      const grid = buildCalendarGrid(today, 1 as Weekday);
      const todayCell = grid.find((d) => sameDay(d.date, today));
      expect(todayCell?.isToday).toBe(true);
      expect(todayCell?.inCurrentMonth).toBe(true);
    });
  });

  describe('getWeekdayLabels', () => {
    it('returns 7 unique labels', () => {
      const labels = getWeekdayLabels('en-US', 0 as Weekday);
      expect(labels).toHaveLength(7);
      expect(new Set(labels).size).toBeGreaterThan(0);
    });
    it('respects weekStartsOn', () => {
      const monLabels = getWeekdayLabels('en-US', 1 as Weekday);
      const sunLabels = getWeekdayLabels('en-US', 0 as Weekday);
      expect(monLabels[0]).not.toBe(sunLabels[0]);
    });
  });

  describe('combineDateAndTime', () => {
    it('preserves date and applies time', () => {
      const d = combineDateAndTime(new Date(2024, 5, 17), 14, 30, 15);
      expect(d.getFullYear()).toBe(2024);
      expect(d.getMonth()).toBe(5);
      expect(d.getDate()).toBe(17);
      expect(d.getHours()).toBe(14);
      expect(d.getMinutes()).toBe(30);
      expect(d.getSeconds()).toBe(15);
    });
    it('defaults seconds to 0', () => {
      const d = combineDateAndTime(new Date(2024, 0, 1), 10, 5);
      expect(d.getSeconds()).toBe(0);
    });
  });

  describe('formatDateTime / defaultDisplayFormat', () => {
    it('formats with Intl', () => {
      const out = formatDateTime(
        new Date(Date.UTC(2024, 0, 5, 12, 0)),
        'en-GB',
        { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' },
      );
      expect(out).toContain('2024');
    });
    it('returns sensible default options', () => {
      const opts = defaultDisplayFormat(true, 'h12');
      expect(opts.second).toBe('2-digit');
      expect(opts.hourCycle).toBe('h12');
      const opts2 = defaultDisplayFormat(false, 'h23');
      expect(opts2.second).toBeUndefined();
      expect(opts2.hourCycle).toBe('h23');
    });
  });

  describe('pad2', () => {
    it('pads single digits', () => {
      expect(pad2(0)).toBe('00');
      expect(pad2(9)).toBe('09');
      expect(pad2(10)).toBe('10');
      expect(pad2(99)).toBe('99');
    });
  });

  describe('clampHour', () => {
    it('clamps to 0-23 for h23', () => {
      expect(clampHour(-5, 'h23')).toBe(0);
      expect(clampHour(25, 'h23')).toBe(23);
      expect(clampHour(12, 'h23')).toBe(12);
    });
    it('clamps to 1-12 for h12', () => {
      expect(clampHour(0, 'h12')).toBe(1);
      expect(clampHour(15, 'h12')).toBe(12);
      expect(clampHour(7, 'h12')).toBe(7);
    });
    it('falls back to min for NaN', () => {
      expect(clampHour(NaN, 'h23')).toBe(0);
      expect(clampHour(NaN, 'h12')).toBe(1);
    });
  });

  describe('clampMinuteOrSecond', () => {
    it('clamps to 0-59', () => {
      expect(clampMinuteOrSecond(-1)).toBe(0);
      expect(clampMinuteOrSecond(75)).toBe(59);
      expect(clampMinuteOrSecond(30)).toBe(30);
      expect(clampMinuteOrSecond(NaN)).toBe(0);
    });
  });

  describe('to24Hour / to12Hour', () => {
    it('to24Hour handles edge AM/PM', () => {
      expect(to24Hour(12, 'AM')).toBe(0);
      expect(to24Hour(1, 'AM')).toBe(1);
      expect(to24Hour(11, 'AM')).toBe(11);
      expect(to24Hour(12, 'PM')).toBe(12);
      expect(to24Hour(1, 'PM')).toBe(13);
      expect(to24Hour(11, 'PM')).toBe(23);
    });
    it('to12Hour returns hour + period', () => {
      expect(to12Hour(0)).toEqual({ hour: 12, period: 'AM' });
      expect(to12Hour(11)).toEqual({ hour: 11, period: 'AM' });
      expect(to12Hour(12)).toEqual({ hour: 12, period: 'PM' });
      expect(to12Hour(13)).toEqual({ hour: 1, period: 'PM' });
      expect(to12Hour(23)).toEqual({ hour: 11, period: 'PM' });
    });
  });
});
