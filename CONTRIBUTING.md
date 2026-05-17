# Contributing

Thanks for considering a contribution! This library aims to be **small, dependency-free, and accessible by default**. That sets the bar for changes.

## Quick start

```bash
npm install
npm run build:lib   # build the library — required before the demo can resolve the path alias
npm start           # serve the demo at http://localhost:4200
npm test            # vitest + jsdom with coverage gate
```

`npm test` enforces ≥95% lines/statements and ≥90% branches/functions. Don't drop the floor when you add code.

## What we welcome

- **Bug fixes** with a regression test.
- **New features** that pull their weight: small surface, plenty of presets, no required runtime dep.
- **A11y improvements** (we target WCAG 2.2 AAA — re-check contrast & target sizes when you touch CSS).
- **Locale fixes** and timezone edge cases.
- **Docs** — examples for less-obvious scenarios are gold.

## What we'd rather avoid

- Heavy runtime dependencies (no moment / dayjs / luxon).
- API changes that break existing consumers without a deprecation path.
- Default-theme changes that drop below AAA contrast.

## PR checklist

- [ ] Tests pass: `npm test`
- [ ] Library builds: `npm run build:lib`
- [ ] If user-facing — README table updated
- [ ] If new behavior — at least one happy-path test and one edge case
- [ ] If a11y/CSS — contrast re-checked, focus indicator visible, target ≥44 px on the default theme

## Commit messages

We follow the [Conventional Commits](https://www.conventionalcommits.org) shape:

- `feat(picker): …` — user-facing change
- `fix(calendar): …`
- `docs:` / `chore:` / `test:` / `refactor:`
- Append `!` for breaking changes (`feat(picker)!: rename minDate input`)

## Releasing

Tag `vMAJOR.MINOR.PATCH` on `main` after merging changes. The release workflow builds, runs tests, and publishes to npm with provenance.

## Code of Conduct

This project follows the [Contributor Covenant](./CODE_OF_CONDUCT.md). Be kind.
