# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] — 2026-05-20

### Added
- **Mobile bottom-sheet layout.** On viewports narrower than the new `mobileBreakpoint` input (default 640 px), the panel detaches from the trigger and renders as a full-width bottom sheet with a tappable backdrop. The dialog gets `aria-modal="true"` while in this mode, and the bottom padding honours `env(safe-area-inset-bottom)` for iOS notch clearance.
- **`mobileBreakpoint`** input (`number`, default `640`). Set `0` to disable the mobile layout entirely.
- Larger 48 CSS px target size under any `pointer: coarse` media (phones, tablets, kiosks).
- Slide-up / fade-in animations on the bottom sheet, disabled under `prefers-reduced-motion`.

### Changed
- Calendar, time, and datetime-picker component templates and styles are now externalized to sibling `.html` / `.scss` files. No public API change.

### Documentation
- New **"Why not `<input type="datetime-local">`?"** comparison table in both READMEs covering UI control, locale, time zones, validation messages, disabled dates, keyboard support on mobile, and AAA accessibility.

## [0.1.1] — 2026-05-19

### Documentation
- Add animated demo GIF (and MP4 alternative) to the README so the picker's value is visible at a glance on npm and GitHub.

## [0.1.0] — 2026-05-17

Initial release.

### Added
- Angular `LOCALE_ID` integration: when `locale` input is omitted, the picker uses the injected locale.
- IANA `timeZone` input: calendar and time inputs interpret the bound `Date` as wall time in that zone; the model stays a UTC `Date`.
- Material-style floating label via `label` / `hint` inputs with full ARIA wiring.
- Reactive Forms support via `ControlValueAccessor` (`[formControl]`, `[(ngModel)]`, `setDisabledState`, touched-on-close).
- Full WCAG 2.2 AAA keyboard navigation with roving tabindex; focus moves into the panel on open and back to the trigger on close.

### Changed
- Default color tokens now meet WCAG AAA 7:1 contrast on white surfaces.
- Default `--ngx-dt-target-size` is 2.75 rem (44 CSS px) for AAA target-size conformance.
- `:focus-visible` outline is 3 px (`--ngx-dt-focus-width`).
