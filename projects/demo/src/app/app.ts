import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { form, FormField, FormRoot, required, submit } from '@angular/forms/signals';
import { NgxDatetimePicker } from 'ngx-signal-datetimepicker';

interface MeetingModel {
  start: Date | null;
}

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgxDatetimePicker, FormField, FormRoot, ReactiveFormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly basic = signal<Date | null>(new Date());
  protected readonly themePrimary = signal<Date | null>(null);
  protected readonly themeSecondary = signal<Date | null>(null);
  protected readonly themeCustom = signal<Date | null>(null);
  protected readonly custom = signal<Date | null>(null);

  protected readonly meeting = signal<MeetingModel>({ start: null });
  protected readonly meetingForm = form<MeetingModel>(this.meeting, (path) => {
    required(path.start, { message: 'Meeting start is required' });
  });

  protected readonly reactiveControl = new FormControl<Date | null>(
    null,
    Validators.required,
  );

  protected submitState = signal<string>('');

  protected async submitMeeting(): Promise<void> {
    const ok = await submit(this.meetingForm, async () => {
      this.submitState.set(`Submitted: ${this.meeting().start?.toISOString() ?? 'null'}`);
      return undefined;
    });
    if (!ok) {
      this.submitState.set('Form is invalid');
    }
  }

  protected toggleReactiveDisabled(): void {
    this.reactiveControl.enabled
      ? this.reactiveControl.disable()
      : this.reactiveControl.enable();
  }

  // Code snippets shown in each section's <details> block.
  protected readonly codeBasic = `import { Component, signal } from '@angular/core';
import { NgxDatetimePicker } from 'ngx-signal-datetimepicker';

@Component({
  selector: 'app-root',
  imports: [NgxDatetimePicker],
  template: \`
    <ngx-datetime-picker [(value)]="basic" [locale]="'en-GB'" />
    <pre>{{ basic()?.toISOString() }}</pre>
  \`,
})
export class App {
  protected basic = signal<Date | null>(new Date());
}`;

  protected readonly codeThemed = `/* Primary — the default AAA blue, no overrides needed */
.theme-card--primary ngx-datetime-picker {
  --ngx-dt-accent: #1d4ed8;
  --ngx-dt-focus:  #1d4ed8;
  --ngx-dt-border: #6b7280;
}

/* Secondary — dark / slate */
.theme-card--secondary {
  background: #0f172a;
  color: #f8fafc;
}
.theme-card--secondary ngx-datetime-picker {
  --ngx-dt-fg:          #f8fafc;
  --ngx-dt-muted:       #cbd5e1;
  --ngx-dt-border:      #475569;
  --ngx-dt-input-bg:    #1e293b;
  --ngx-dt-panel-bg:    #1e293b;
  --ngx-dt-nav-bg-hover: rgba(255,255,255,0.08);
  --ngx-dt-accent:      #38bdf8;
  --ngx-dt-accent-fg:   #0f172a;
  --ngx-dt-focus:       #38bdf8;
  --ngx-dt-shadow:      0 12px 32px rgba(0,0,0,0.5);
}

/* Custom — emerald, chunky radii */
.theme-card--custom ngx-datetime-picker {
  --ngx-dt-accent:    #047857;
  --ngx-dt-accent-fg: #ecfdf5;
  --ngx-dt-focus:     #047857;
  --ngx-dt-border:    #6ee7b7;
  --ngx-dt-panel-bg:  #f0fdf4;
  --ngx-dt-radius:    0.75rem;
  --ngx-dt-radius-lg: 1rem;
  --ngx-dt-shadow:    0 12px 30px rgba(4,120,87,0.18);
}`;

  protected readonly codeCustom = `<ngx-datetime-picker [(value)]="custom" [hourCycle]="'h12'">
  <ng-template
    #triggerTpl
    let-display="display"
    let-toggle="toggle"
    let-value="value"
  >
    <button class="custom-trigger" (click)="toggle()">
      📌 {{ value ? display : 'Pick a moment' }}
    </button>
  </ng-template>

  <ng-template #footerTpl let-close="close">
    <button (click)="close()">Done</button>
  </ng-template>
</ngx-datetime-picker>`;

  protected readonly codeReactive = `import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgxDatetimePicker } from 'ngx-signal-datetimepicker';

@Component({
  imports: [NgxDatetimePicker, ReactiveFormsModule],
  template: \`
    <ngx-datetime-picker
      [formControl]="meeting"
      [hourCycle]="'h23'"
      [minuteStep]="5"
    />
    @if (meeting.touched && meeting.errors?.['required']) {
      <p>Please pick a date and time.</p>
    }
  \`,
})
export class App {
  protected meeting = new FormControl<Date | null>(null, Validators.required);
}`;

  protected readonly codeSignalForms = `import { Component, signal } from '@angular/core';
import { form, FormField, FormRoot, required, submit }
  from '@angular/forms/signals';
import { NgxDatetimePicker } from 'ngx-signal-datetimepicker';

interface Model { start: Date | null; }

@Component({
  imports: [NgxDatetimePicker, FormField, FormRoot],
  template: \`
    <form [formRoot]="fm" (submit)="save()">
      <ngx-datetime-picker
        [formField]="fm.start"
        [hourCycle]="'h23'"
        [minuteStep]="15"
      />
      <button type="submit">Submit</button>
    </form>
  \`,
})
export class App {
  protected model = signal<Model>({ start: null });
  protected fm = form<Model>(this.model, (p) => {
    required(p.start, { message: 'Meeting start is required' });
  });

  async save() {
    await submit(this.fm, async () => undefined);
  }
}`;
}
