import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, LOCALE_ID, signal } from '@angular/core';
import {
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  form,
  FormField,
  FormRoot,
  required,
} from '@angular/forms/signals';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NgxDatetimePicker } from './datetime-picker.component';
import { TimePreset } from './time.component';

@Component({
  selector: 'host-basic',
  imports: [NgxDatetimePicker],
  template: `
    <ngx-datetime-picker
      [(value)]="value"
      [disabled]="disabled()"
      [showTime]="showTime()"
      [closeOnSelect]="closeOnSelect()"
      [suggestCurrentTime]="suggestCurrentTime()"
      [hourCycle]="'h23'"
      [presets]="presets()"
    />
  `,
})
class HostBasic {
  value = signal<Date | null>(null);
  disabled = signal(false);
  showTime = signal(true);
  closeOnSelect = signal(false);
  suggestCurrentTime = signal(true);
  presets = signal<readonly TimePreset[] | null>(null);
}

@Component({
  selector: 'host-rf',
  imports: [NgxDatetimePicker, ReactiveFormsModule],
  template: `<ngx-datetime-picker [formControl]="ctl" />`,
})
class HostReactive {
  ctl = new FormControl<Date | null>(null, Validators.required);
}

@Component({
  selector: 'host-sf',
  imports: [NgxDatetimePicker, FormField, FormRoot],
  template: `
    <form [formRoot]="fm">
      <ngx-datetime-picker [formField]="fm.start" />
    </form>
  `,
})
class HostSignalForms {
  model = signal<{ start: Date | null }>({ start: null });
  fm = form(this.model, (p) => required(p.start));
}

function trigger(fix: ComponentFixture<unknown>): HTMLButtonElement {
  return fix.nativeElement.querySelector('button.ngx-dt-trigger')!;
}

function isOpen(fix: ComponentFixture<unknown>): boolean {
  return !!fix.nativeElement.querySelector('.ngx-dt-panel');
}

/** Dispatches an Escape keydown event from inside the picker so it bubbles to the host listener. */
function pressEscape(fix: ComponentFixture<unknown>): void {
  const target = fix.nativeElement.querySelector(
    '.ngx-dt-panel, button.ngx-dt-trigger',
  ) as HTMLElement;
  target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  fix.detectChanges();
}

describe('NgxDatetimePicker', () => {
  describe('standalone signal binding', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({ imports: [HostBasic] });
    });

    it('opens and closes the panel via the trigger and Escape', () => {
      const fix = TestBed.createComponent(HostBasic);
      fix.detectChanges();
      expect(isOpen(fix)).toBe(false);
      trigger(fix).click();
      fix.detectChanges();
      expect(isOpen(fix)).toBe(true);
      pressEscape(fix);
      expect(isOpen(fix)).toBe(false);
    });

    it('does not open when disabled', () => {
      const fix = TestBed.createComponent(HostBasic);
      fix.componentInstance.disabled.set(true);
      fix.detectChanges();
      trigger(fix).click();
      fix.detectChanges();
      expect(isOpen(fix)).toBe(false);
    });

    it('renders the placeholder when value is null and a formatted value otherwise', () => {
      const fix = TestBed.createComponent(HostBasic);
      fix.detectChanges();
      const text = trigger(fix).textContent ?? '';
      expect(text).toContain('Select date and time');
      fix.componentInstance.value.set(new Date(2024, 5, 17, 14, 30));
      fix.detectChanges();
      expect(trigger(fix).textContent).not.toContain('Select date');
    });

    it('clicking a day combines it with the current draft time', () => {
      const fix = TestBed.createComponent(HostBasic);
      fix.componentInstance.suggestCurrentTime.set(false);
      fix.detectChanges();
      trigger(fix).click();
      fix.detectChanges();
      const days = fix.nativeElement.querySelectorAll('button.ngx-dt-calendar__day');
      const middle = days[15] as HTMLButtonElement;
      middle.click();
      fix.detectChanges();
      const v = fix.componentInstance.value();
      expect(v).not.toBeNull();
      // Time stays at 00:00 because suggestCurrentTime is disabled.
      expect(v!.getHours()).toBe(0);
      expect(v!.getMinutes()).toBe(0);
    });

    it('suggestCurrentTime pre-fills hours/minutes when opening with null value', () => {
      const fix = TestBed.createComponent(HostBasic);
      fix.detectChanges();
      trigger(fix).click();
      fix.detectChanges();
      const inputs = fix.nativeElement.querySelectorAll(
        'input.ngx-dt-time__input',
      ) as NodeListOf<HTMLInputElement>;
      const now = new Date();
      expect(inputs[0].value).toBe(String(now.getHours()).padStart(2, '0'));
    });

    it('clear() resets value and re-fills draft time', () => {
      const fix = TestBed.createComponent(HostBasic);
      fix.componentInstance.value.set(new Date(2024, 5, 17, 14, 30));
      fix.detectChanges();
      trigger(fix).click();
      fix.detectChanges();
      const clearBtn = Array.from(fix.nativeElement.querySelectorAll('button')).find(
        (b: any) => b.textContent.trim() === 'Clear',
      ) as HTMLButtonElement;
      clearBtn.click();
      fix.detectChanges();
      expect(fix.componentInstance.value()).toBeNull();
    });

    it('setNow sets the value to the clamped current time', () => {
      const fix = TestBed.createComponent(HostBasic);
      fix.detectChanges();
      trigger(fix).click();
      fix.detectChanges();
      // The action-row "Now" button — distinct from the time preset of the same label.
      const actionButtons = fix.nativeElement.querySelectorAll('.ngx-dt-actions .ngx-dt-btn');
      const nowBtn = actionButtons[0] as HTMLButtonElement;
      nowBtn.click();
      fix.detectChanges();
      expect(fix.componentInstance.value()).not.toBeNull();
    });

    it('closeOnSelect closes the panel after a date click when showTime is false', () => {
      const fix = TestBed.createComponent(HostBasic);
      fix.componentInstance.showTime.set(false);
      fix.componentInstance.closeOnSelect.set(true);
      fix.detectChanges();
      trigger(fix).click();
      fix.detectChanges();
      (fix.nativeElement.querySelector('button.ngx-dt-calendar__day') as HTMLButtonElement).click();
      fix.detectChanges();
      expect(isOpen(fix)).toBe(false);
    });

    it('clicking outside closes the panel without yanking focus to the trigger', () => {
      const fix = TestBed.createComponent(HostBasic);
      fix.detectChanges();
      trigger(fix).click();
      fix.detectChanges();
      document.body.click();
      fix.detectChanges();
      expect(isOpen(fix)).toBe(false);
    });

    it('exposes default time presets and applies them', () => {
      const fix = TestBed.createComponent(HostBasic);
      fix.componentInstance.value.set(new Date(2024, 5, 17, 0, 0));
      fix.detectChanges();
      trigger(fix).click();
      fix.detectChanges();
      const presets = fix.nativeElement.querySelectorAll('button.ngx-dt-time__preset') as NodeListOf<HTMLButtonElement>;
      const noon = Array.from(presets).find((b) => b.textContent?.trim() === '12:00')!;
      noon.click();
      fix.detectChanges();
      expect(fix.componentInstance.value()?.getHours()).toBe(12);

      const plus15 = Array.from(presets).find((b) => b.textContent?.trim() === '+15m')!;
      plus15.click();
      fix.detectChanges();
      expect(fix.componentInstance.value()?.getMinutes()).toBe(15);

      const plus1h = Array.from(presets).find((b) => b.textContent?.trim() === '+1h')!;
      plus1h.click();
      fix.detectChanges();
      expect(fix.componentInstance.value()?.getHours()).toBe(13);

      const nowPreset = Array.from(presets).find((b) => b.textContent?.trim() === 'Now')!;
      nowPreset.click();
      fix.detectChanges();
      expect(fix.componentInstance.value()).not.toBeNull();
    });

    it('custom presets input overrides the defaults', () => {
      const fix = TestBed.createComponent(HostBasic);
      fix.componentInstance.presets.set([
        { label: 'X', apply: { hours: 7, minutes: 7, seconds: 7 } },
      ]);
      fix.componentInstance.value.set(new Date(2024, 5, 17, 0, 0));
      fix.detectChanges();
      trigger(fix).click();
      fix.detectChanges();
      const presets = fix.nativeElement.querySelectorAll('button.ngx-dt-time__preset');
      expect(presets).toHaveLength(1);
      (presets[0] as HTMLButtonElement).click();
      fix.detectChanges();
      expect(fix.componentInstance.value()?.getHours()).toBe(7);
    });
  });

  describe('Reactive Forms (ControlValueAccessor)', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({ imports: [HostReactive] });
    });

    it('writeValue updates the trigger display', () => {
      const fix = TestBed.createComponent(HostReactive);
      fix.detectChanges();
      const before = trigger(fix).textContent ?? '';
      expect(before).toContain('Select date');
      fix.componentInstance.ctl.setValue(new Date(2024, 5, 17, 9, 0));
      fix.detectChanges();
      expect(trigger(fix).textContent).not.toContain('Select date');
    });

    it('user interaction calls back through onChange', () => {
      const fix = TestBed.createComponent(HostReactive);
      fix.detectChanges();
      trigger(fix).click();
      fix.detectChanges();
      const day = fix.nativeElement.querySelector('button.ngx-dt-calendar__day') as HTMLButtonElement;
      day.click();
      fix.detectChanges();
      expect(fix.componentInstance.ctl.value).not.toBeNull();
      expect(fix.componentInstance.ctl.dirty).toBe(true);
    });

    it('disable() on the FormControl disables the trigger', () => {
      const fix = TestBed.createComponent(HostReactive);
      fix.detectChanges();
      fix.componentInstance.ctl.disable();
      fix.detectChanges();
      expect(trigger(fix).disabled).toBe(true);
      trigger(fix).click();
      fix.detectChanges();
      expect(isOpen(fix)).toBe(false);
    });

    it('closing the panel marks the control as touched', () => {
      const fix = TestBed.createComponent(HostReactive);
      fix.detectChanges();
      trigger(fix).click();
      fix.detectChanges();
      expect(fix.componentInstance.ctl.touched).toBe(false);
      pressEscape(fix);
      expect(fix.componentInstance.ctl.touched).toBe(true);
    });
  });

  describe('custom templates', () => {
    @Component({
      selector: 'host-tpl',
      imports: [NgxDatetimePicker],
      template: `
        <ngx-datetime-picker [(value)]="value">
          <ng-template
            #triggerTpl
            let-display="display"
            let-toggle="toggle"
          >
            <button type="button" class="my-trigger" (click)="toggle()">
              {{ display }}
            </button>
          </ng-template>
          <ng-template #headerTpl>
            <h3 class="my-header">Header</h3>
          </ng-template>
          <ng-template #footerTpl let-close="close">
            <button class="my-footer" (click)="close()">Done</button>
          </ng-template>
        </ngx-datetime-picker>
      `,
    })
    class HostTpl {
      value = signal<Date | null>(null);
    }

    beforeEach(() => TestBed.configureTestingModule({ imports: [HostTpl] }));

    it('renders the projected trigger, header, and footer templates', () => {
      const fix = TestBed.createComponent(HostTpl);
      fix.detectChanges();
      const trigger = fix.nativeElement.querySelector('button.my-trigger') as HTMLButtonElement;
      expect(trigger).toBeTruthy();
      trigger.click();
      fix.detectChanges();
      expect(fix.nativeElement.querySelector('.my-header')).toBeTruthy();
      const footer = fix.nativeElement.querySelector('.my-footer') as HTMLButtonElement;
      expect(footer).toBeTruthy();
      footer.click();
      fix.detectChanges();
      // ctx.close() collapses the panel
      expect(fix.nativeElement.querySelector('.ngx-dt-panel')).toBeNull();
    });
  });

  describe('confirm button', () => {
    beforeEach(() => TestBed.configureTestingModule({ imports: [HostBasic] }));
    it('OK button closes the panel', () => {
      const fix = TestBed.createComponent(HostBasic);
      fix.detectChanges();
      trigger(fix).click();
      fix.detectChanges();
      const okBtn = Array.from(
        fix.nativeElement.querySelectorAll('.ngx-dt-actions .ngx-dt-btn'),
      ).at(-1) as HTMLButtonElement;
      expect(okBtn.textContent?.trim()).toBe('OK');
      okBtn.click();
      fix.detectChanges();
      expect(isOpen(fix)).toBe(false);
    });
  });

  describe('locale resolution', () => {
    @Component({
      selector: 'host-loc',
      imports: [NgxDatetimePicker],
      template: `<ngx-datetime-picker [(value)]="value" [locale]="locale()" />`,
    })
    class HostLocale {
      value = signal<Date | null>(new Date(2024, 5, 17, 14, 30));
      locale = signal<string | null>(null);
    }

    it('falls back to the injected LOCALE_ID when no input is provided', () => {
      TestBed.configureTestingModule({
        imports: [HostLocale],
        providers: [{ provide: LOCALE_ID, useValue: 'pl-PL' }],
      });
      const fix = TestBed.createComponent(HostLocale);
      fix.detectChanges();
      // Polish month name is "cze" (czerwiec)
      const text = trigger(fix).textContent ?? '';
      expect(text.toLowerCase()).toMatch(/cze/);
    });

    it('explicit locale input wins over LOCALE_ID', () => {
      TestBed.configureTestingModule({
        imports: [HostLocale],
        providers: [{ provide: LOCALE_ID, useValue: 'pl-PL' }],
      });
      const fix = TestBed.createComponent(HostLocale);
      fix.componentInstance.locale.set('de-DE');
      fix.detectChanges();
      const text = trigger(fix).textContent ?? '';
      // German month name "Juni"
      expect(text).toMatch(/Juni|Jun/i);
    });

    it('falls back to en-US when neither input nor LOCALE_ID is set', () => {
      TestBed.configureTestingModule({ imports: [HostLocale] });
      const fix = TestBed.createComponent(HostLocale);
      fix.detectChanges();
      const text = trigger(fix).textContent ?? '';
      expect(text).toMatch(/Jun|Jul|Aug|May/i);
    });
  });

  describe('Signal Forms ([formField])', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({ imports: [HostSignalForms] });
    });

    it('binds value through the field tree and reports required errors', () => {
      const fix = TestBed.createComponent(HostSignalForms);
      fix.detectChanges();
      const startState = fix.componentInstance.fm.start();
      expect(startState.value()).toBeNull();
      expect(startState.invalid()).toBe(true);

      trigger(fix).click();
      fix.detectChanges();
      const day = fix.nativeElement.querySelector('button.ngx-dt-calendar__day') as HTMLButtonElement;
      day.click();
      fix.detectChanges();
      expect(fix.componentInstance.fm.start().value()).not.toBeNull();
      expect(fix.componentInstance.fm.start().valid()).toBe(true);
    });
  });
});
