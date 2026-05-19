# Launch playbook

A concrete plan to get this library in front of the Angular community.
Order matters — do the **prerequisites** first, then run the **launch
sequence** over ~2 weeks, then keep the **steady-state** loop going.

## 0. Prerequisites (one-off)

Before you announce anything, the repo has to feel solid in 30 seconds of
skimming. Tick all of these first:

- [x] `0.1.0` published to npm, package name claimed
- [x] Repo public on GitHub with **About** filled in (description + URL +
      topics: `angular`, `angular21`, `signal-forms`, `datepicker`,
      `timepicker`, `datetimepicker`, `accessibility`, `wcag`, `a11y`)
- [x] CI green on `main` *(coverage badge still TODO — needs codecov/coveralls
      wiring)*
- [x] **Vercel preview URL** for the demo app — https://ngx-signal-datetimepicker.vercel.app
- [x] **StackBlitz starter** — linked from README "Try it now" line
- [ ] An animated **GIF or short MP4** of the picker in action embedded
      near the top of the README (Recordit / Kap; ≤ 1 MB) — **biggest
      remaining blocker for launch**
- [x] CHANGELOG entry that describes 0.1.0
- [x] Open the first **GitHub Discussion** thread titled "Roadmap & ideas
      for v0.2" — [discussions/9](https://github.com/dominikmodrzejewski99/ngx-signal-datetimepicker/discussions/9)

## 1. Launch sequence (week 1)

Stagger these across 3–4 days so each gets its own attention budget.

### Day 1 — Repo + Reddit

- Post to **/r/Angular**: title `[Showcase] ngx-signal-datetimepicker — a
  zero-deps datetime picker built on Signal Forms (WCAG AAA out of the box)`.
  Lead with the GIF, link the Vercel demo first and the repo second.
  Avoid a paste of the README — write 3 short paragraphs (problem,
  approach, one code snippet).
- Cross-post to **/r/javascript** with a more general framing.

### Day 2 — Dev blog post

- Publish a write-up on **dev.to** and **Medium** (canonical link to
  dev.to). Title options:
  - "Building a Signal Forms-native datetime picker in Angular 21"
  - "Why the Angular ecosystem needs a unified date+time control — and
    how Signal Forms make it easy"
- Add tags: `angular`, `webdev`, `accessibility`, `typescript`,
  `opensource`.
- Embed the StackBlitz; link the repo and Vercel demo. Add a CTA: "Open
  an issue with your edge cases".

### Day 3 — Social

- **X / Twitter**: 1 tweet thread (4–5 posts) following the structure
  problem → solution → one-line install → GIF → "RT if you've ever
  fought a separate date + time control". Tag `@angular`,
  `#angular`, `#a11y`.
- **LinkedIn**: a single post, less casual, lead with the WCAG AAA angle
  for the enterprise crowd. Most Polish & DACH Angular devs you want to
  reach live there, not on X.
- **Mastodon (fosstodon.org)**: same as X but with more `#a11y` tags.

### Day 4 — Targeted channels

- **Angular Discord** (#showcase) — short message + repo link + GIF.
  Don't spam other channels.
- **ngneat Discord** / **Angular Community** Slack: same.
- **awesome-angular** ([PinoyYid/awesome-angular] and
  [gdi2290/awesome-angular]): open a PR adding the library under the
  "Forms" / "Date pickers" section. Use the maintainer's commit-message
  conventions.
- **angularaddicts.com** newsletter — submit via their form.
- **ng-newsletter** — submit via their form.
- **Angular Twitter community** — reply to the latest Angular release
  tweet with "We just shipped X for the new Signal Forms API in this
  release — try it: …" (don't piggyback off unrelated tweets).

## 2. Continuous loop (weekly)

- Reply to every issue within 48 h. Tag with `triage` → `bug` /
  `enhancement` / `good first issue` / `help wanted` within a week.
- Cut a release whenever there's something worth tagging (every 1–2
  weeks early on). Each release gets:
  - CHANGELOG entry
  - One LinkedIn / X post highlighting the headline change
  - StackBlitz starter refresh if the API surface changed
- Watch the npm `weekly downloads` curve — if it stalls after 4 weeks,
  the messaging is wrong; rewrite the README hook.

## 3. Quality multipliers

These take more effort but each one durably moves the needle:

- **Schematic for `ng add ngx-signal-datetimepicker`** — auto-imports
  the component into `App` and adds a sample input. One command =
  half the friction.
- **Compatibility matrix** in README: explicit "Angular 21.x ✓ /
  Angular 20.x ✗ — needs Signal Forms".
- **Themes gallery** — half a dozen ready-made CSS snippets people
  copy-paste (Material 3, shadcn, GitHub, dark, "Polish forms" with
  pl-PL defaults).
- **A reusable preset library** for common business cases:
  weekdays-only, business-hours-only, half-hour-only — published as
  small functions in a `presets` sub-path.
- **Migration guides** away from the most common alternatives
  (Material Datepicker, ngx-bootstrap, ng-zorro). Search traffic from
  "alternatives to X" is real.
- **Stable signal-forms-codelab** — a small repo that walks through
  building a form with this picker. Pin it from the README.

## 4. Numbers to watch

If you don't track, you don't know what's working.

| Metric | Source | Healthy after 30 days |
| ------ | ------ | --------------------- |
| GitHub stars | repo header | 50+ |
| npm weekly downloads | npmjs.com / npm-stat.com | 250+ |
| GitHub issues opened | repo issues | 5–10 (real, not spam) |
| Discussions | repo Discussions | 3+ threads |
| Closed PRs from external contributors | repo Pulse | 1+ |
| Dev.to article reactions | dev.to | 30+ |

If you hit those, you're past escape velocity for a niche library.

## 5. Anti-patterns

Don't:

- Cross-post the exact same wording to 8 places in one day — algos
  notice and so do humans.
- Beg for stars in the README or social posts. Show the demo, the
  problem, and one code snippet. The star comes for free if those land.
- Ignore the first 5 issues. Early responsiveness is the single biggest
  predictor of community trust.
- Ship a 1.0.0 the first month. Stay on `0.x` until the API is settled
  by real users, otherwise every change is "breaking".
