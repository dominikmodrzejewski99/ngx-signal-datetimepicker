import {
  ChangeDetectionStrategy,
  Component,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { form, required, submit } from '@angular/forms/signals';
import { NgxDatetimePicker } from 'ngx-signal-datetimepicker';

interface MeetingModel {
  start: Date | null;
}

interface QuickStartStep {
  readonly id: string;
  readonly title: string;
  readonly hint: string;
  readonly file: string;
  readonly code: string;
}

interface ApiRow {
  readonly name: string;
  readonly sig?: 'model' | 'signal' | 'output' | 'method';
  readonly type: string;
  readonly desc: string;
}

interface ApiGroup {
  readonly title: string;
  readonly meta: string;
  readonly rows: ApiRow[];
}

interface ExampleRecipe {
  readonly title: string;
  readonly tag: string;
  readonly code: string;
}

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // We render the landing as a top-level page; let global styles do the work
  // and skip per-component view encapsulation so the markup styles cleanly.
  encapsulation: ViewEncapsulation.None,
  imports: [NgxDatetimePicker],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  // --- live demo (mounted into the hero) ---------------------------------
  protected readonly demoValue = signal<Date | null>(new Date());

  // Hidden form-control + signal-form so the "API" / "Examples" snippets
  // are not made up — they correspond to actual working code.
  protected readonly reactiveControl = new FormControl<Date | null>(
    null,
    Validators.required,
  );
  protected readonly meeting = signal<MeetingModel>({ start: null });
  protected readonly meetingForm = form<MeetingModel>(this.meeting, (path) => {
    required(path.start, { message: 'Meeting start is required' });
  });
  protected async submitMeeting(): Promise<void> {
    await submit(this.meetingForm, async () => undefined);
  }

  // --- install + copy state ---------------------------------------------
  protected readonly installCommand = 'npm i ngx-signal-datetimepicker';
  protected readonly copied = signal(false);
  protected async copyInstall(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.installCommand);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1600);
    } catch {
      /* clipboard unavailable — silently ignore */
    }
  }

  // --- quick-start tabs --------------------------------------------------
  protected readonly quickStartSteps: readonly QuickStartStep[] = [
    {
      id: 's1',
      title: 'Install the package',
      hint: 'One npm install. No peer-dep dance.',
      file: 'terminal · zsh',
      code:
`# Install
$ npm i ngx-signal-datetimepicker

# or
$ pnpm add ngx-signal-datetimepicker
$ yarn add ngx-signal-datetimepicker`,
    },
    {
      id: 's2',
      title: 'Import the standalone component',
      hint: 'Drop it into the imports array of any standalone component.',
      file: 'booking.component.ts',
      code:
`import { Component, signal } from '@angular/core';
import { NgxDatetimePicker } from 'ngx-signal-datetimepicker';

@Component({
  selector: 'app-booking',
  imports: [NgxDatetimePicker],
  templateUrl: './booking.component.html',
})
export class BookingComponent {
  protected readonly checkIn = signal<Date | null>(new Date());
}`,
    },
    {
      id: 's3',
      title: 'Bind a signal',
      hint: 'Two-way bind [(value)] to a writable signal. Done.',
      file: 'booking.component.html',
      code:
`<!-- booking.component.html -->
<ngx-datetime-picker
  [(value)]="checkIn"
  [minDate]="today"
  [hourCycle]="'h23'"
/>`,
    },
    {
      id: 's4',
      title: 'React to changes',
      hint: 'Use effect() or computed() as usual.',
      file: 'booking.component.ts',
      code:
`constructor() {
  effect(() => {
    console.log('Check-in set to', this.checkIn());
  });
}

// Computed derivations work too:
protected readonly endsThisWeek = computed(() => {
  const v = this.checkIn();
  return !!v && isThisWeek(v);
});`,
    },
  ];

  protected readonly activeStep = signal<string>('s1');
  protected activate(id: string): void { this.activeStep.set(id); }
  protected stepIndex(id: string): number {
    return this.quickStartSteps.findIndex((s) => s.id === id) + 1;
  }
  protected activeStepObj(): QuickStartStep {
    const id = this.activeStep();
    return this.quickStartSteps.find((s) => s.id === id) ?? this.quickStartSteps[0];
  }

  // --- API tables --------------------------------------------------------
  protected readonly apiGroups: readonly ApiGroup[] = [
    {
      title: '<ngx-datetime-picker /> · inputs',
      meta: 'most-used',
      rows: [
        { name: 'value', sig: 'model', type: 'Date | null', desc: 'Two-way bound selection. Use <code>[(value)]="mySignal"</code>. Also satisfies <code>ControlValueAccessor</code> and Signal Forms <code>FormValueControl</code>.' },
        { name: 'disabled', sig: 'signal', type: 'boolean', desc: 'Disables the trigger; combines with the disabled state pushed in by Reactive Forms.' },
        { name: 'readonly', sig: 'signal', type: 'boolean', desc: 'Read-only mode — opens, navigates, but rejects writes.' },
        { name: 'required', sig: 'signal', type: 'boolean', desc: 'Marks the field as required for ARIA and Signal Forms validators.' },
        { name: 'minDate · maxDate', sig: 'signal', type: 'Date | null', desc: 'Hard boundaries. Out-of-range days render disabled and are unfocusable.' },
        { name: 'locale', sig: 'signal', type: 'string | null', desc: 'BCP-47 tag. Falls back to Angular\'s <code>LOCALE_ID</code>, then to <code>en-US</code>.' },
        { name: 'timeZone', sig: 'signal', type: 'string | null', desc: 'IANA zone (e.g. <code>Europe/Warsaw</code>). Calendar and time inputs interpret the bound <code>Date</code> as wall time in this zone.' },
        { name: 'weekStartsOn', sig: 'signal', type: '0..6', desc: '0 = Sunday, 1 = Monday, …' },
        { name: 'hourCycle', sig: 'signal', type: "'h12' | 'h23'", desc: '12-hour or 24-hour clock.' },
        { name: 'showSeconds · showTime', sig: 'signal', type: 'boolean', desc: 'Toggle the seconds spinner and the entire time row.' },
        { name: 'minuteStep · secondStep', sig: 'signal', type: 'number', desc: 'Granularity of the spin buttons and presets.' },
        { name: 'displayFormat', sig: 'signal', type: 'Intl.DateTimeFormatOptions | null', desc: 'Override the trigger\'s display format. Sensible default mixes date + time per <code>hourCycle</code>.' },
        { name: 'label · hint', sig: 'signal', type: 'string | null', desc: 'Optional floating label (Material-style) plus a helper hint under the trigger.' },
        { name: 'wizard', sig: 'signal', type: 'boolean', desc: 'Two-step flow: pick a date, then a time. Back button returns to the calendar without losing the value.' },
        { name: 'presets', sig: 'signal', type: 'TimePreset[] | null', desc: 'Quick-pick chips under the time inputs. Default presets cover Now / 09:00 / 12:00 / 18:00 / +15m / +1h.' },
        { name: 'suggestCurrentTime', sig: 'signal', type: 'boolean', desc: 'Pre-fill the time inputs with the current wall clock when opening with a null value (default <code>true</code>).' },
      ],
    },
    {
      title: '<ngx-datetime-picker /> · outputs &amp; bindings',
      meta: 'integrations',
      rows: [
        { name: 'value', sig: 'output', type: '(value) two-way event', desc: 'Companion event to the <code>value</code> model. Most apps won\'t need it — read the signal instead.' },
        { name: 'touched', sig: 'output', type: '(touched) two-way event', desc: 'Fires <code>true</code> when the panel closes (parity with Reactive Forms <code>touched</code>).' },
        { name: '[formField]', sig: 'method', type: 'FieldTree<Date | null>', desc: 'Signal Forms binding. The picker implements <code>FormValueControl&lt;Date | null&gt;</code>, so validators (<code>required</code>, custom) flow through with no boilerplate.' },
        { name: '[formControl] / [(ngModel)]', sig: 'method', type: 'FormControl / NgModel', desc: 'ControlValueAccessor is registered, so the same component drops into <code>@angular/forms</code> without changes.' },
      ],
    },
    {
      title: 'CSS custom properties · theming',
      meta: 'override anything',
      rows: [
        { name: '--ngx-dt-accent', type: 'color', desc: 'Primary brand color — selected day, primary button, focused step.' },
        { name: '--ngx-dt-focus', type: 'color', desc: 'Focus indicator. Default keeps a 7:1 contrast ratio against white.' },
        { name: '--ngx-dt-target-size', type: 'length', desc: 'Minimum tappable size for triggers, day cells, nav arrows. Defaults to <code>2.75rem</code> for WCAG 2.2 AAA.' },
        { name: '--ngx-dt-focus-width', type: 'length', desc: 'Outline width for <code>:focus-visible</code>. Default <code>3px</code>.' },
        { name: '--ngx-dt-radius · --ngx-dt-radius-lg', type: 'length', desc: 'Corner rounding for inputs and the popup panel.' },
        { name: '--ngx-dt-trigger-min-width', type: 'length', desc: 'Defaults to <code>16rem</code>. Set to <code>0</code> to let the trigger fully fill a constrained grid cell.' },
      ],
    },
  ];

  // --- examples ---------------------------------------------------------
  protected readonly examples: readonly ExampleRecipe[] = [
    {
      title: 'Reactive validation with a computed',
      tag: 'recipe · 01',
      code:
`protected readonly from = signal<Date | null>(new Date());
protected readonly to   = signal<Date | null>(null);

protected readonly isValid = computed(() => {
  const a = this.from(), b = this.to();
  return !!a && !!b && +b > +a;
});

// In the template:
<ngx-datetime-picker [(value)]="from" />
<ngx-datetime-picker [(value)]="to" [minDate]="from()" />
@if (!isValid()) { <p>Pick a later end date.</p> }`,
    },
    {
      title: 'Reactive Forms drop-in',
      tag: 'recipe · 02',
      code:
`import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgxDatetimePicker } from 'ngx-signal-datetimepicker';

@Component({
  imports: [NgxDatetimePicker, ReactiveFormsModule],
  template: \`
    <ngx-datetime-picker
      [formControl]="meeting"
      [hourCycle]="'h23'"
      [minuteStep]="15"
    />
    @if (meeting.touched && meeting.errors?.['required']) {
      <p>Pick a meeting time.</p>
    }
  \`,
})
export class App {
  protected meeting = new FormControl<Date | null>(null, Validators.required);
}`,
    },
    {
      title: 'Signal Forms binding via [formField]',
      tag: 'recipe · 03',
      code:
`import { form, FormField, FormRoot, required, submit }
  from '@angular/forms/signals';

interface Model { start: Date | null; }

protected readonly model = signal<Model>({ start: null });
protected readonly fm = form<Model>(this.model, (p) => {
  required(p.start, { message: 'Pick a date & time' });
});

<form [formRoot]="fm" (submit)="save()">
  <ngx-datetime-picker [formField]="fm.start" />
</form>`,
    },
    {
      title: 'Wall-clock time in any IANA zone',
      tag: 'recipe · 04',
      code:
`<!-- value stays a UTC Date — model is unambiguous -->
<ngx-datetime-picker
  [(value)]="bookingUtc"
  [timeZone]="'America/New_York'"
  [hourCycle]="'h23'"
/>

// The calendar and time inputs render in New York wall time.
// bookingUtc.toISOString() always returns the canonical UTC instant.`,
    },
  ];

  // --- value-formatting for the hero readout ---------------------------
  protected readonly valueLine = (v: Date | null): string =>
    v ? v.toISOString() : 'null';
}
