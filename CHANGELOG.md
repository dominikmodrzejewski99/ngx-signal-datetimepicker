# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

## [0.1.0] — TBD

Initial release.
