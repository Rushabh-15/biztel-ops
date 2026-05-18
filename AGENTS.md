# AI workflow

## Tools used

- **Claude Code** (primary) — repo scaffolding, route handlers, the Gemini
  prompt + Zod schema, validation rules, the review screen, dashboard
  aggregators, README. Operated as a hands-on pair: it wrote the bulk of the
  code, I drove decisions, the dataset recon, and the demo cuts.
- **Gemini 2.5 Flash** — vision OCR in production. Native JSON output via
  `response_mime_type: "application/json"` so the route handler just runs Zod
  on the response.
- **ChatGPT** — occasional rubber-duck on product trade-offs (extraction
  synchrony, where polish ROI was worth it).

## Where AI accelerated me

- **Iterating on the Gemini extraction prompt.** Roughly six versions across
  Hour 4–6 to nail the dataset-specific shift normalization (Roman numerals,
  not A/B/C), date expansion (`DD/MM/YY → 20YY-MM-DD`), and dropping the 7
  blank rows the printed form left empty.
- **Zod schema from sample JSON** of a single extraction response.
- **Boilerplate** — Supabase server/browser client helpers, the
  multipart/form-data upload route, shadcn integration with Tailwind v4, the
  Next 16 dynamic route handler signature (`params: Promise<...>`), Recharts
  responsive chart layouts.
- **Writing validation rules from a plain-English spec.** I described the
  format constraints; Claude produced the regex-based rules engine that diffs
  cleanly with the audit log.
- **Surface polish under pressure** — error.tsx, not-found.tsx, loading.tsx
  skeletons, empty states. Things I'd skip manually under a 48-hour clock.

## Where I drove manually

- **Dataset reconnaissance.** Opening the sample image and writing down the
  real field formats before any code — caught that the brief's assumed shift
  enum (A/B/C/Morning/Afternoon/Night) and field regexes (`^E\d{3,6}$`, etc.)
  did not match the actual `BT\d{4}` / Roman numeral / 6-digit-code shape.
  Locked those corrections in a memory file before letting any code reference
  the wrong assumptions.
- **Confidence layering strategy.** Model self-reported confidence as primary
  signal, regex match as a bump to 0.95, null as 0, hand-flag cap at 0.7.
- **Product decisions.** Three-link sidebar (Dashboard / Upload / History)
  instead of squeezing in a fourth tab. Synchronous extraction inside the
  upload response vs. a polling pattern (synchronous wins for a single-screen
  demo with `maxDuration = 60`). Re-extract button vs. delete + re-upload.
- **Demo path scope.** Cut polish that wouldn't show in the Loom — no
  responsive mobile, no dark mode, no audit-log viewer UI.
- **Debugging Vercel deploy state.** A 404 on `/api/extract` despite a
  successful local build turned out to be a UI rollback I'd hit by accident
  in the Vercel dashboard — diagnosed by reading the response `x-matched-path`
  header against the deployed commit's file tree.

## Prompt patterns that worked

- **"Here's the dataset image — write down the actual field formats before
  touching any code."** Pinning the real schema before generation stopped the
  model from hallucinating regex against the brief's assumed shapes.
- **"Validate this Gemini response with Zod, then walk through the
  confidence layering: model self-report, regex bump to 0.95 on perfect
  match, cap at 0.7 if notes flag ambiguity, zero for nulls."**
- **"Use the Next 16 docs in `node_modules/next/dist/docs/` before writing
  this route handler — params are now `Promise<...>`."** Pointing the agent
  at the actual installed docs sidestepped stale training data.
- **"Generate the validation rule for shift ∈ {I, II, III} with both error
  and warning severities. Pure function, no DB calls."**
- **"Why is the live URL still showing the old layout?"** as a debugging
  prompt, paired with the response-header dump — got to root cause faster
  than poking at the dashboard.

## What I'd do differently with more time

- Two-pass extraction: run Gemini twice with slightly different prompt
  framings, then surface fields where the two disagree as low-confidence even
  if either pass alone was high-confidence. The single-pass approach is fine
  for the sample but brittle.
- Tests for `lib/extract.ts` and `lib/validation.ts` — the two highest-risk
  pieces in the demo path. Even a handful of fixture-based tests would catch
  regressions in the prompt or rules.
- Auth + RLS, then a `/documents/[id]/audit` view so the audit log isn't
  invisible.
- A small admin script to bulk-reprocess documents with an updated prompt
  without re-uploading.

---

<!-- BEGIN:nextjs-agent-rules -->
> Build-context note for future agents working in this repo: Next.js 16
> ships with breaking changes from prior versions. Dynamic route `params`
> and `searchParams` are now `Promise<...>` and must be `await`ed; `headers()`
> and `cookies()` are async. Consult `node_modules/next/dist/docs/` before
> writing or modifying any route handler, layout, or page.
<!-- END:nextjs-agent-rules -->
