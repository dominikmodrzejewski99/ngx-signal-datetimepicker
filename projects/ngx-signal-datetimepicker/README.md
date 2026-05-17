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

## With Reactive Forms

The picker also implements `ControlValueAccessor`, so it drops in to any classic
Reactive Forms control without changes:

```ts
import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgxDatetimePicker } from 'ngx-signal-datetimepicker';

@Component({
  selector: 'app-root',
  imports: [NgxDatetimePicker, ReactiveFormsModule],
  template: `
    <ngx-datetime-picker
      [formControl]="meeting"
      [hourCycle]="'h23'"
      [minuteStep]="15"
    />
    @if (meeting.touched && meeting.errors?.['required']) {
      <p>Please pick a date and time.</p>
    }
  `,
})
export class App {
  protected readonly meeting = new FormControl<Date | null>(null, Validators.required);
}
```

The same component works with template-driven forms (`[(ngModel)]`),
`setDisabledState()` from `disable()/enable()`, and emits `touched` when the
panel closes.

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
  /* Colors — defaults below all meet WCAG AAA contrast (≥7:1) on a white surface */
  --ngx-dt-fg: #111827;        /* primary text — 19.7:1 vs #fff */
  --ngx-dt-muted: #374151;     /* secondary text — 10.7:1 vs #fff */
  --ngx-dt-border: #6b7280;    /* 4.8:1 — non-text contrast (only needs 3:1) */
  --ngx-dt-focus: #1d4ed8;     /* focus outline — 8.6:1 vs #fff */
  --ngx-dt-accent: #1d4ed8;    /* selection / primary button — 8.6:1 with white text */
  --ngx-dt-accent-fg: #ffffff;
  --ngx-dt-input-bg: #ffffff;
  --ngx-dt-panel-bg: #ffffff;
  --ngx-dt-nav-bg-hover: rgba(0, 0, 0, 0.06);
  --ngx-dt-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);

  /* Geometry */
  --ngx-dt-radius: 0.5rem;
  --ngx-dt-radius-lg: 0.75rem;
  --ngx-dt-z: 1000;
  --ngx-dt-trigger-min-width: 16rem;
  --ngx-dt-panel-padding: 0.875rem;
  --ngx-dt-gap: 0.25rem;

  /* Accessibility-critical sizes (WCAG AAA) */
  --ngx-dt-target-size: 2.75rem;  /* 44 CSS px — WCAG 2.5.5 Target Size */
  --ngx-dt-focus-width: 3px;      /* WCAG 2.4.13 Focus Appearance */
}
```

> Override these to retheme. If you swap `--ngx-dt-fg`, `--ngx-dt-muted`,
> `--ngx-dt-focus` or `--ngx-dt-accent`, double-check the contrast ratios so
> the picker keeps its AAA conformance under your colors.

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

## Accessibility (WCAG 2.2 AAA)

The default build targets **WCAG 2.2 Level AAA**. The relevant criteria and
how this library satisfies each one:

### Perceivable
- **1.4.6 Contrast (Enhanced) — AAA**: every text token in the default theme
  has ≥7:1 contrast on a white surface (primary text 19.7:1, secondary text
  10.7:1, focus / accent 8.6:1). Override via CSS custom properties if you
  reskin — the README lists the ratios so you can keep AAA.
- **1.4.8 Visual Presentation — AAA**: text is left-aligned (no
  justification), inherits the page's line-height, allows user text-spacing
  overrides, and the panel reflows at 320 CSS px wide without horizontal
  scroll.
- **1.4.11 Non-text Contrast — AA**: borders/dividers are ≥3:1.
- **1.4.13 Content on Hover or Focus — AA**: the panel is dismissable with
  `Escape`, persistent until the user closes it, and hover targets stay
  hoverable.

### Operable
- **2.1.1 / 2.1.3 Keyboard (No Exception) — AAA**: every interaction has a
  keyboard equivalent. Days, months, years grids use a **roving tabindex** so
  only one cell is in the tab order; arrow keys move focus between cells.
  Keyboard map in the days grid:
  - `ArrowLeft` / `ArrowRight` — previous / next day
  - `ArrowUp` / `ArrowDown` — previous / next week
  - `Home` / `End` — start / end of the current week
  - `PageUp` / `PageDown` — previous / next month
  - `Shift + PageUp` / `Shift + PageDown` — previous / next year
  - `Enter` / `Space` — select the focused day
  - `Escape` — close the panel and return focus to the trigger
  - Months and years views: arrows move, `Enter`/`Space` selects.
- **2.3.3 Animation from Interactions — AAA**: the only transition (floating
  label) is wrapped in `@media (prefers-reduced-motion: no-preference)`, so
  users who request reduced motion get no animation.
- **2.4.7 Focus Visible — AA** and **2.4.13 Focus Appearance — AAA**: every
  interactive element gets a **3 px** solid outline using `--ngx-dt-focus`
  with a 2 px offset (`--ngx-dt-focus-width`). The 3:1 contrast against
  adjacent colors is guaranteed by the AAA-grade `--ngx-dt-focus` default.
- **2.4.11 / 2.4.12 Focus Not Obscured (AA / AAA)**: the panel opens below
  the trigger and the trigger keeps a `:focus-visible` outline; nothing in
  the library overlaps the focused element.
- **2.5.5 Target Size (Enhanced) — AAA**: triggers, calendar cells, nav
  arrows, action buttons, AM/PM toggle, and preset chips are all at least
  **44×44 CSS px** (`--ngx-dt-target-size: 2.75rem`). The compact ▲/▼ step
  buttons in the time field fall under the **"Equivalent" exception**: the
  44-px text input above them lets the user enter any value directly.

### Understandable
- **3.2.1 / 3.2.2 — A** + **3.2.5 Change on Request — AAA**: focus and input
  events never change context on their own. The model updates only when the
  user picks a date or types a time; the panel never auto-closes unless you
  opt in with `closeOnSelect`.
- **3.3.1 / 3.3.6 — AAA**: Signal Forms and Reactive Forms validation
  surface errors through their normal channels; the picker exposes
  `aria-invalid` and the value is reversible with the **Clear** button.

### Robust
- **4.1.2 Name, Role, Value — A**: trigger is a real `<button>` with
  `aria-haspopup="dialog"`, `aria-expanded`, and `aria-labelledby` when a
  floating label is in use. The panel is `role="dialog"` with an
  `aria-label`. The calendar uses `role="grid"` with `columnheader` weekday
  labels, `gridcell` cells, and `aria-selected` / `aria-disabled`. AM/PM
  toggles use `aria-pressed`.

> AXE: passes 0 issues on the demo app with the default theme. If you swap
> the color tokens, re-test with your custom palette.

## License

MIT © Dominik Modrzejewski
