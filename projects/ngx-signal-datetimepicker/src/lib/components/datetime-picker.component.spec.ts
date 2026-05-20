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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

  describe('floating label', () => {
    @Component({
      selector: 'host-fl',
      imports: [NgxDatetimePicker],
      template: `
        <ngx-datetime-picker
          [(value)]="value"
          [label]="label()"
          [hint]="hint()"
        />
      `,
    })
    class HostFloat {
      value = signal<Date | null>(null);
      label = signal<string | null>('Meeting time');
      hint = signal<string | null>('We will send a reminder.');
    }

    beforeEach(() => TestBed.configureTestingModule({ imports: [HostFloat] }));

    it('renders a floating field wrapper with label and hint when label is set', () => {
      const fix = TestBed.createComponent(HostFloat);
      fix.detectChanges();
      const field = fix.nativeElement.querySelector('.ngx-dt-field');
      expect(field).toBeTruthy();
      expect(field.querySelector('.ngx-dt-field__label')?.textContent?.trim()).toBe('Meeting time');
      expect(field.querySelector('.ngx-dt-field__hint')?.textContent?.trim()).toMatch(/reminder/);
    });

    it('label is not floating when empty + closed; floats when opened or filled', () => {
      const fix = TestBed.createComponent(HostFloat);
      fix.detectChanges();
      const field = fix.nativeElement.querySelector('.ngx-dt-field');
      expect(field.classList.contains('is-floating')).toBe(false);

      // Opening the panel raises the label.
      trigger(fix).click();
      fix.detectChanges();
      expect(field.classList.contains('is-floating')).toBe(true);

      // Closing without a value drops it again.
      pressEscape(fix);
      expect(field.classList.contains('is-floating')).toBe(false);

      // Setting a value also raises the label.
      fix.componentInstance.value.set(new Date(2024, 5, 17, 14, 30));
      fix.detectChanges();
      expect(field.classList.contains('is-floating')).toBe(true);
    });

    it('the trigger is associated with the label via aria-labelledby', () => {
      const fix = TestBed.createComponent(HostFloat);
      fix.detectChanges();
      const btn = trigger(fix);
      const label = fix.nativeElement.querySelector('.ngx-dt-field__label');
      const labelId = label.getAttribute('id');
      expect(labelId).toBeTruthy();
      expect(btn.getAttribute('aria-labelledby')).toBe(labelId);
    });

    it('the hint id is referenced by aria-describedby and dropped when hint is null', () => {
      const fix = TestBed.createComponent(HostFloat);
      fix.detectChanges();
      const hintEl = fix.nativeElement.querySelector('.ngx-dt-field__hint');
      const hintId = hintEl.getAttribute('id');
      expect(trigger(fix).getAttribute('aria-describedby')).toBe(hintId);
      fix.componentInstance.hint.set(null);
      fix.detectChanges();
      expect(fix.nativeElement.querySelector('.ngx-dt-field__hint')).toBeNull();
      expect(trigger(fix).getAttribute('aria-describedby')).toBeNull();
    });

    it('without label input, the legacy plain trigger is rendered', () => {
      const fix = TestBed.createComponent(HostFloat);
      fix.componentInstance.label.set(null);
      fix.detectChanges();
      expect(fix.nativeElement.querySelector('.ngx-dt-field')).toBeNull();
      expect(trigger(fix)).toBeTruthy();
    });
  });

  describe('wizard mode', () => {
    @Component({
      selector: 'host-wiz',
      imports: [NgxDatetimePicker],
      template: `
        <ngx-datetime-picker [(value)]="value" [wizard]="true" />
      `,
    })
    class HostWizard {
      value = signal<Date | null>(null);
    }

    beforeEach(() => TestBed.configureTestingModule({ imports: [HostWizard] }));

    function openPanel(fix: ComponentFixture<HostWizard>): void {
      trigger(fix).click();
      fix.detectChanges();
    }

    it('opens on the date step with the calendar visible and the time hidden', () => {
      const fix = TestBed.createComponent(HostWizard);
      fix.detectChanges();
      openPanel(fix);
      expect(fix.nativeElement.querySelector('ngx-datetime-calendar')).toBeTruthy();
      expect(fix.nativeElement.querySelector('ngx-datetime-time')).toBeNull();
      // Step indicator is rendered
      const steps = fix.nativeElement.querySelectorAll('.ngx-dt-steps__step');
      expect(steps).toHaveLength(2);
      expect(steps[0].classList.contains('is-active')).toBe(true);
      expect(steps[1].disabled).toBe(true); // can't jump to time without picking a date
    });

    it('picking a day auto-advances to the time step', () => {
      const fix = TestBed.createComponent(HostWizard);
      fix.detectChanges();
      openPanel(fix);
      const day = fix.nativeElement.querySelector(
        'button.ngx-dt-calendar__day:not(.is-outside)',
      ) as HTMLButtonElement;
      day.click();
      fix.detectChanges();
      // Calendar gone, time visible
      expect(fix.nativeElement.querySelector('ngx-datetime-calendar')).toBeNull();
      expect(fix.nativeElement.querySelector('ngx-datetime-time')).toBeTruthy();
      const steps = fix.nativeElement.querySelectorAll('.ngx-dt-steps__step');
      expect(steps[1].classList.contains('is-active')).toBe(true);
      expect(steps[0].classList.contains('is-done')).toBe(true);
    });

    it('Back button returns to the date step without losing the value', () => {
      const fix = TestBed.createComponent(HostWizard);
      fix.detectChanges();
      openPanel(fix);
      (fix.nativeElement.querySelector('button.ngx-dt-calendar__day:not(.is-outside)') as HTMLButtonElement).click();
      fix.detectChanges();
      const valueBefore = fix.componentInstance.value();
      // Find footer "Back" button
      const backBtn = Array.from(
        fix.nativeElement.querySelectorAll('.ngx-dt-actions .ngx-dt-btn'),
      ).find((b: any) => b.textContent.trim().includes('Back')) as HTMLButtonElement;
      backBtn.click();
      fix.detectChanges();
      expect(fix.nativeElement.querySelector('ngx-datetime-calendar')).toBeTruthy();
      expect(fix.nativeElement.querySelector('ngx-datetime-time')).toBeNull();
      expect(fix.componentInstance.value()).toBe(valueBefore);
    });

    it('clicking step 1 in the stepper also goes back to the date step', () => {
      const fix = TestBed.createComponent(HostWizard);
      fix.detectChanges();
      openPanel(fix);
      (fix.nativeElement.querySelector('button.ngx-dt-calendar__day:not(.is-outside)') as HTMLButtonElement).click();
      fix.detectChanges();
      const dateStep = fix.nativeElement.querySelectorAll('.ngx-dt-steps__step')[0] as HTMLButtonElement;
      dateStep.click();
      fix.detectChanges();
      expect(fix.nativeElement.querySelector('ngx-datetime-calendar')).toBeTruthy();
    });

    it('Next button on the date step advances when a value is set', () => {
      const fix = TestBed.createComponent(HostWizard);
      fix.componentInstance.value.set(new Date(2024, 5, 17, 14, 30));
      fix.detectChanges();
      openPanel(fix);
      const nextBtn = Array.from(
        fix.nativeElement.querySelectorAll('.ngx-dt-actions .ngx-dt-btn'),
      ).find((b: any) => b.textContent.trim().includes('Next')) as HTMLButtonElement;
      expect(nextBtn.disabled).toBe(false);
      nextBtn.click();
      fix.detectChanges();
      expect(fix.nativeElement.querySelector('ngx-datetime-time')).toBeTruthy();
    });

    it('goToTime is a no-op when no value is set', () => {
      const fix = TestBed.createComponent(HostWizard);
      fix.detectChanges();
      openPanel(fix);
      const picker = fix.debugElement.query((el) => el.name === 'ngx-datetime-picker').componentInstance as NgxDatetimePicker;
      picker.goToTime();
      fix.detectChanges();
      // Still on the date step because no value
      expect(fix.nativeElement.querySelector('ngx-datetime-calendar')).toBeTruthy();
    });

    it('reopening the picker always starts on the date step', () => {
      const fix = TestBed.createComponent(HostWizard);
      fix.componentInstance.value.set(new Date(2024, 5, 17, 14, 30));
      fix.detectChanges();
      openPanel(fix);
      // Advance to time
      const nextBtn = Array.from(
        fix.nativeElement.querySelectorAll('.ngx-dt-actions .ngx-dt-btn'),
      ).find((b: any) => b.textContent.trim().includes('Next')) as HTMLButtonElement;
      nextBtn.click();
      fix.detectChanges();
      // Close
      pressEscape(fix);
      // Reopen — should be back on the date step
      openPanel(fix);
      expect(fix.nativeElement.querySelector('ngx-datetime-calendar')).toBeTruthy();
      expect(fix.nativeElement.querySelector('ngx-datetime-time')).toBeNull();
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

  describe('mobile bottom sheet', () => {
    let originalMatchMedia: typeof window.matchMedia;

    function mockMatchMedia(matches: boolean): void {
      window.matchMedia = vi.fn().mockImplementation(() => ({
        matches,
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })) as unknown as typeof window.matchMedia;
    }

    beforeEach(() => {
      originalMatchMedia = window.matchMedia;
      TestBed.configureTestingModule({ imports: [HostBasic] });
    });

    afterEach(() => {
      window.matchMedia = originalMatchMedia;
    });

    it('marks the host as mobile and renders a backdrop on narrow viewports', () => {
      mockMatchMedia(true);
      const fix = TestBed.createComponent(HostBasic);
      fix.detectChanges();
      trigger(fix).click();
      fix.detectChanges();
      const host = fix.nativeElement.querySelector('ngx-datetime-picker') as HTMLElement;
      expect(host.classList.contains('is-mobile')).toBe(true);
      expect(fix.nativeElement.querySelector('.ngx-dt-backdrop')).not.toBeNull();
      expect(fix.nativeElement.querySelector('.ngx-dt-panel')?.getAttribute('aria-modal')).toBe(
        'true',
      );
    });

    it('does not render a backdrop on wide viewports', () => {
      mockMatchMedia(false);
      const fix = TestBed.createComponent(HostBasic);
      fix.detectChanges();
      trigger(fix).click();
      fix.detectChanges();
      const host = fix.nativeElement.querySelector('ngx-datetime-picker') as HTMLElement;
      expect(host.classList.contains('is-mobile')).toBe(false);
      expect(fix.nativeElement.querySelector('.ngx-dt-backdrop')).toBeNull();
    });

    it('closes the panel when the backdrop is clicked', () => {
      mockMatchMedia(true);
      const fix = TestBed.createComponent(HostBasic);
      fix.detectChanges();
      trigger(fix).click();
      fix.detectChanges();
      expect(isOpen(fix)).toBe(true);
      const backdrop = fix.nativeElement.querySelector('.ngx-dt-backdrop') as HTMLElement;
      backdrop.click();
      fix.detectChanges();
      expect(isOpen(fix)).toBe(false);
    });
  });
});
