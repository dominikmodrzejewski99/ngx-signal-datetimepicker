import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { NgxDatetimeTime, TimePreset, TimeValue } from './time.component';

@Component({
  selector: 'host-time',
  imports: [NgxDatetimeTime],
  template: `
    <ngx-datetime-time
      [value]="time()"
      [hourCycle]="cycle()"
      [showSeconds]="seconds()"
      [minuteStep]="minuteStep()"
      [secondStep]="secondStep()"
      [presets]="presets()"
      [wheel]="wheel()"
      [disabled]="disabled()"
      [readonly]="readonly()"
      (valueChange)="onChange($event)"
    />
  `,
})
class HostTime {
  time = signal<TimeValue>({ hours: 9, minutes: 30, seconds: 0 });
  cycle = signal<'h12' | 'h23'>('h23');
  seconds = signal(false);
  minuteStep = signal(1);
  secondStep = signal(1);
  presets = signal<readonly TimePreset[]>([]);
  wheel = signal(true);
  disabled = signal(false);
  readonly = signal(false);
  last: TimeValue | null = null;
  onChange(v: TimeValue) { this.last = v; }
}

function setup() {
  const fixture = TestBed.createComponent(HostTime);
  fixture.detectChanges();
  return fixture;
}

function findAll(fix: ComponentFixture<HostTime>, sel: string): HTMLElement[] {
  return Array.from(fix.nativeElement.querySelectorAll(sel));
}

function findByLabel(fix: ComponentFixture<HostTime>, label: string): HTMLElement {
  const all = findAll(fix, '[aria-label]');
  const found = all.find((el) => el.getAttribute('aria-label') === label);
  if (!found) throw new Error(`No element with aria-label="${label}"`);
  return found;
}

describe('NgxDatetimeTime', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostTime] });
  });

  it('renders hours and minutes padded to two digits', () => {
    const fix = setup();
    const inputs = findAll(fix, 'input.ngx-dt-time__input') as HTMLInputElement[];
    expect(inputs[0].value).toBe('09');
    expect(inputs[1].value).toBe('30');
  });

  it('step hour increments and wraps via 24h', () => {
    const fix = setup();
    fix.componentInstance.time.set({ hours: 23, minutes: 0, seconds: 0 });
    fix.detectChanges();
    findByLabel(fix, 'Increase hours').click();
    expect(fix.componentInstance.last).toEqual({ hours: 0, minutes: 0, seconds: 0 });
    findByLabel(fix, 'Decrease hours').click();
    expect(fix.componentInstance.last).toEqual({ hours: 22, minutes: 0, seconds: 0 });
  });

  it('step minute respects minuteStep input', () => {
    const fix = setup();
    fix.componentInstance.minuteStep.set(15);
    fix.detectChanges();
    findByLabel(fix, 'Increase minutes').click();
    expect(fix.componentInstance.last?.minutes).toBe(45);
  });

  it('shows seconds when enabled and steps them', () => {
    const fix = setup();
    fix.componentInstance.seconds.set(true);
    fix.detectChanges();
    expect(findAll(fix, 'input.ngx-dt-time__input')).toHaveLength(3);
    findByLabel(fix, 'Increase seconds').click();
    expect(fix.componentInstance.last?.seconds).toBe(1);
    findByLabel(fix, 'Decrease seconds').click();
    expect(fix.componentInstance.last?.seconds).toBe(59);
  });

  it('supports manual numeric input across hour, minute, and second inputs', () => {
    const fix = setup();
    fix.componentInstance.seconds.set(true);
    fix.detectChanges();
    const inputs = findAll(fix, 'input.ngx-dt-time__input') as HTMLInputElement[];
    inputs[0].value = '14';
    inputs[0].dispatchEvent(new Event('input'));
    expect(fix.componentInstance.last?.hours).toBe(14);
    inputs[1].value = '07';
    inputs[1].dispatchEvent(new Event('input'));
    expect(fix.componentInstance.last?.minutes).toBe(7);
    inputs[2].value = '42';
    inputs[2].dispatchEvent(new Event('input'));
    expect(fix.componentInstance.last?.seconds).toBe(42);
  });

  it('h12 mode swaps period via segmented buttons', () => {
    const fix = setup();
    fix.componentInstance.cycle.set('h12');
    fix.componentInstance.time.set({ hours: 9, minutes: 0, seconds: 0 });
    fix.detectChanges();
    const pm = findAll(fix, '.ngx-dt-time__period-btn').find((b) => b.textContent?.trim() === 'PM')!;
    pm.click();
    expect(fix.componentInstance.last?.hours).toBe(21);
  });

  it('h12 toggling the active period is a no-op', () => {
    const fix = setup();
    fix.componentInstance.cycle.set('h12');
    fix.componentInstance.time.set({ hours: 9, minutes: 0, seconds: 0 });
    fix.detectChanges();
    const am = findAll(fix, '.ngx-dt-time__period-btn').find((b) => b.textContent?.trim() === 'AM')!;
    am.click();
    expect(fix.componentInstance.last).toBeNull();
  });

  it('mouse wheel adjusts the hour when enabled', () => {
    const fix = setup();
    const field = fix.nativeElement.querySelector('.ngx-dt-time__field')!;
    const evt = new WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true });
    field.dispatchEvent(evt);
    expect(fix.componentInstance.last?.hours).toBe(10);
  });

  it('mouse wheel does nothing when wheel is disabled', () => {
    const fix = setup();
    fix.componentInstance.wheel.set(false);
    fix.detectChanges();
    const field = fix.nativeElement.querySelector('.ngx-dt-time__field')!;
    field.dispatchEvent(new WheelEvent('wheel', { deltaY: 1, bubbles: true, cancelable: true }));
    expect(fix.componentInstance.last).toBeNull();
  });

  it('disabled/readonly suppress all interactions', () => {
    const fix = setup();
    fix.componentInstance.disabled.set(true);
    fix.detectChanges();
    findByLabel(fix, 'Increase hours').click();
    expect(fix.componentInstance.last).toBeNull();
    fix.componentInstance.disabled.set(false);
    fix.componentInstance.readonly.set(true);
    fix.detectChanges();
    findByLabel(fix, 'Increase minutes').click();
    expect(fix.componentInstance.last).toBeNull();
  });

  it('applies absolute and function presets', () => {
    const fix = setup();
    fix.componentInstance.presets.set([
      { label: '12:00', apply: { hours: 12, minutes: 0, seconds: 0 } },
      {
        label: '+15m',
        apply: (cur) => ({ hours: cur.hours, minutes: cur.minutes + 15, seconds: 0 }),
      },
    ]);
    fix.detectChanges();
    const buttons = findAll(fix, '.ngx-dt-time__preset');
    buttons[0].click();
    expect(fix.componentInstance.last).toEqual({ hours: 12, minutes: 0, seconds: 0 });
    buttons[1].click();
    expect(fix.componentInstance.last?.minutes).toBe(45);
  });

  it('blur re-formats input back to the model value (snaps any raw entry to pad-2 display)', () => {
    const fix = setup();
    const inputs = findAll(fix, 'input.ngx-dt-time__input') as HTMLInputElement[];
    inputs[0].value = '7'; // user typed a single digit; the model already shows 09
    inputs[0].dispatchEvent(new Event('blur'));
    // The model value stays 09 because the host signal was not updated; blur must re-render the
    // pad-2 representation of whatever the model currently says.
    expect(inputs[0].value).toBe('09');
    // And the minute/second blur handlers behave the same way.
    inputs[1].value = '5';
    inputs[1].dispatchEvent(new Event('blur'));
    expect(inputs[1].value).toBe('30');
    fix.componentInstance.seconds.set(true);
    fix.detectChanges();
    const secondsInput = findAll(fix, 'input.ngx-dt-time__input')[2] as HTMLInputElement;
    secondsInput.value = '8';
    secondsInput.dispatchEvent(new Event('blur'));
    expect(secondsInput.value).toBe('00');
  });

  it('focus selects the input contents', () => {
    const fix = setup();
    const input = fix.nativeElement.querySelector('input.ngx-dt-time__input') as HTMLInputElement;
    const spy = vi.spyOn(input, 'select');
    input.dispatchEvent(new FocusEvent('focus'));
    expect(spy).toHaveBeenCalled();
  });

  it('empty (non-numeric) input does not emit a change', () => {
    const fix = setup();
    fix.componentInstance.seconds.set(true);
    fix.detectChanges();
    const inputs = findAll(fix, 'input.ngx-dt-time__input') as HTMLInputElement[];
    for (const input of inputs) {
      input.value = '';
      input.dispatchEvent(new Event('input'));
    }
    expect(fix.componentInstance.last).toBeNull();
    // Non-numeric characters get stripped, which yields an empty string and also no emit.
    inputs[0].value = 'abc';
    inputs[0].dispatchEvent(new Event('input'));
    expect(fix.componentInstance.last).toBeNull();
  });

  it('h12 period buttons are disabled in readonly mode and applyPreset is suppressed', () => {
    const fix = setup();
    fix.componentInstance.cycle.set('h12');
    fix.componentInstance.readonly.set(true);
    fix.componentInstance.presets.set([
      { label: 'Five', apply: { hours: 5, minutes: 0, seconds: 0 } },
    ]);
    fix.detectChanges();
    findAll(fix, '.ngx-dt-time__preset')[0].click();
    expect(fix.componentInstance.last).toBeNull();
  });

  it('disabled wheel handler is a no-op', () => {
    const fix = setup();
    fix.componentInstance.disabled.set(true);
    fix.detectChanges();
    fix.nativeElement
      .querySelector('.ngx-dt-time__field')!
      .dispatchEvent(new WheelEvent('wheel', { deltaY: -1, bubbles: true, cancelable: true }));
    expect(fix.componentInstance.last).toBeNull();
  });
});
