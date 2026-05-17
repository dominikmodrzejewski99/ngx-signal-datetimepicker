# ngx-signal-datetimepicker

A small, themeable Angular **datetime picker** that combines date and time selection into a **single control**, built on top of [Angular Signal Forms](https://angular.dev/guide/forms/signals).

- One value, one input: `Date | null` — no need to wire up a date and a time control separately
- First-class **Signal Forms** integration via the `[formField]` directive
- Implements `FormValueControl<Date | null>` (works with `required`, `min`, `max`, `disabled`, `readonly`, validators, touched/dirty, errors)
- Standalone, OnPush, zero runtime dependencies (no moment/dayjs)
- Heavily **customizable**:
  - CSS custom properties for theming
  - Slottable `triggerTpl` / `headerTpl` / `footerTpl` templates
  - 12h / 24h hour cycle, configurable minute / second step
  - Locale-aware labels via `Intl.DateTimeFormat`
- Accessible: keyboard navigation, ARIA roles, focus-visible outlines

> Angular 21+ required (Signal Forms ship under `@angular/forms/signals`).

## Install

```bash
npm install ngx-signal-datetimepicker
```

## Quick start

```ts
import { Component, signal } from '@angular/core';
import { NgxDatetimePicker } from 'ngx-signal-datetimepicker';

@Component({
  selector: 'app-root',
  imports: [NgxDatetimePicker],
  template: `
    <ngx-datetime-picker [(value)]="appointment" />
    <p>Picked: {{ appointment()?.toISOString() }}</p>
  `,
})
export class App {
  protected readonly appointment = signal<Date | null>(new Date());
}
```

## With Signal Forms

```ts
import { Component, signal } from '@angular/core';
import { form, FormField, FormRoot, required, submit } from '@angular/forms/signals';
import { NgxDatetimePicker } from 'ngx-signal-datetimepicker';

interface Model { meeting: Date | null; }

@Component({
  selector: 'app-root',
  imports: [NgxDatetimePicker, FormField, FormRoot],
  template: `
    <form [formRoot]="myForm" (submit)="save()">
      <ngx-datetime-picker
        [formField]="myForm.meeting"
        [hourCycle]="'h23'"
        [minuteStep]="15"
      />
      <button type="submit">Save</button>
    </form>
  `,
})
export class App {
  protected readonly model = signal<Model>({ meeting: null });
  protected readonly myForm = form<Model>(this.model, (path) => {
    required(path.meeting, { message: 'Pick a date & time' });
  });

  protected async save() {
    await submit(this.myForm, async () => {
      // call your API here
      return undefined;
    });
  }
}
```

## Inputs

| Input             | Type                                   | Default                       | Description                                       |
| ----------------- | -------------------------------------- | ----------------------------- | ------------------------------------------------- |
| `value`           | `Date \| null` (`model.required`)      | —                             | Two-way bound value. Required.                    |
| `disabled`        | `boolean`                              | `false`                       | Disables interaction.                             |
| `readonly`        | `boolean`                              | `false`                       | Read-only.                                        |
| `required`        | `boolean`                              | `false`                       | Marks the field as required (bound via Signal Forms). |
| `minDate`         | `Date \| null`                         | `null`                        | Earliest selectable date.                         |
| `maxDate`         | `Date \| null`                         | `null`                        | Latest selectable date.                           |
| `locale`          | `string`                               | `'en-US'`                     | BCP-47 locale tag for labels & formatting.        |
| `weekStartsOn`    | `0..6`                                 | `1` (Monday)                  | First day of the week.                            |
| `hourCycle`       | `'h12' \| 'h23'`                       | `'h23'`                       | 12h or 24h clock.                                 |
| `showSeconds`     | `boolean`                              | `false`                       | Show seconds input.                               |
| `showTime`        | `boolean`                              | `true`                        | Hide the time block to get a pure date picker.    |
| `minuteStep`      | `number`                               | `1`                           | Step in minutes used by the spin buttons.         |
| `secondStep`      | `number`                               | `1`                           | Step in seconds used by the spin buttons.         |
| `placeholder`     | `string`                               | `'Select date and time'`      | Trigger placeholder when value is `null`.         |
| `displayFormat`   | `Intl.DateTimeFormatOptions \| null`   | sensible default              | Override the trigger's display format.            |
| `closeOnSelect`   | `boolean`                              | `false`                       | Close after a date click (only when `showTime` is `false`). |
| `clearLabel`      | `string`                               | `'Clear'`                     | Footer "clear" button label.                      |
| `confirmLabel`    | `string`                               | `'OK'`                        | Footer "confirm" button label.                    |
| `ariaLabel`       | `string`                               | `'Date and time picker'`      | Accessible label for the dialog.                  |

## Theming via CSS custom properties

```css
ngx-datetime-picker {
  --ngx-dt-accent: #ec4899;
  --ngx-dt-accent-fg: #ffffff;
  --ngx-dt-fg: #111827;
  --ngx-dt-muted: #6b7280;
  --ngx-dt-border: #d1d5db;
  --ngx-dt-input-bg: #ffffff;
  --ngx-dt-panel-bg: #ffffff;
  --ngx-dt-nav-bg-hover: rgba(0, 0, 0, 0.05);
  --ngx-dt-radius: 0.375rem;
  --ngx-dt-radius-lg: 0.5rem;
  --ngx-dt-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  --ngx-dt-focus: #2563eb;
  --ngx-dt-z: 1000;
  --ngx-dt-trigger-min-width: 14rem;
  --ngx-dt-panel-padding: 0.75rem;
  --ngx-dt-gap: 0.25rem;
}
```

## Slots / templates

```html
<ngx-datetime-picker [(value)]="value">
  <ng-template #triggerTpl let-ctx>
    <button type="button" (click)="ctx.toggle()" class="my-btn">
      {{ ctx.value ? ctx.display : 'Pick…' }}
    </button>
  </ng-template>

  <ng-template #headerTpl let-ctx>
    <h3>Choose a moment</h3>
  </ng-template>

  <ng-template #footerTpl let-ctx>
    <button (click)="ctx.close()">Done</button>
  </ng-template>
</ngx-datetime-picker>
```

- `triggerTpl` context: `{ value, display, open(), toggle(), disabled }`
- `headerTpl` / `footerTpl` context: `{ value, close() }`

## Accessibility

- The trigger is a `<button>` with `aria-haspopup="dialog"` and `aria-expanded`.
- Panel is a `role="dialog"` with an `aria-label`.
- Calendar grid uses `role="grid"` with weekday `columnheader`s and `gridcell` days; selected day exposes `aria-selected`.
- Closing via Escape, click-outside, or the OK button marks the field as `touched`.
- All interactive elements have `:focus-visible` outlines using `--ngx-dt-focus`.

## License

MIT © Dominik Modrzejewski
