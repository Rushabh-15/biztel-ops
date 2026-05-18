# BiztelAI Ops — Manufacturing Document Digitization

Built in 48 hours as a working prototype for BiztelAI Technologies' full-stack
internship assignment. Digitizes handwritten Machine Shop Data forms into
structured, reviewable production records with operational analytics.

**Live:** https://biztel-ops.vercel.app
**Repo:** https://github.com/Rushabh-15/biztel-ops

## Demo flow (the path the Loom video walks)

1. `/upload` — drop a Machine Shop Data form (image or PDF).
2. The server stores it, then runs Gemini 2.5 Flash vision to extract every
   non-blank row into a structured record (date, shift, employee #, op code,
   machine #, work order #, qty, time).
3. `/documents/[id]` — review the source image alongside an editable form. Each
   field shows OCR confidence (green / amber / red) and inline validation
   messages from the rules engine. Saving writes per-field audit entries.
4. `/history` — filter, search, and paginate every extracted record.
5. `/` — dashboard tiles + Recharts (qty over time, shift / machine / top ops).

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 · App Router · TypeScript · Turbopack |
| UI | Tailwind v4 · shadcn/ui (base-ui) |
| Database + Storage | Supabase (Postgres + public bucket) |
| Vision LLM | Google Gemini 2.5 Flash (`@google/generative-ai`) |
| Validation | Zod (LLM output) + custom rules in `lib/validation.ts` |
| Charts | Recharts 3 |
| Server state | TanStack Query 5 |
| Deployment | Vercel |
| Auth | **None** — single-tenant prototype |

## Architecture map

```
app/
  layout.tsx                     # Sidebar shell + TanStack provider
  page.tsx                       # Dashboard (server): tiles + charts
  upload/page.tsx                # Dropzone + recent uploads
  documents/[id]/page.tsx        # Review server page → ReviewScreen
  history/page.tsx               # Filterable records table
  api/upload/route.ts            # POST: storage + documents insert
  api/extract/route.ts           # POST: Gemini + Zod + records + audit
  api/records/[id]/route.ts      # PATCH: edit + audit_log + revalidate
  error.tsx | not-found.tsx
components/
  app-sidebar.tsx                # 3-link nav with active state
  upload-dropzone.tsx            # react-dropzone + useMutation
  recent-uploads.tsx             # Server-rendered status table
  review-screen.tsx              # Image preview + editable record cards
  dashboard-charts.tsx           # Recharts (line + 3 bars)
lib/
  supabase.ts                    # Lazy browser + service-role clients
  extract.ts                     # Gemini prompt, Zod schema, confidence layering
  validation.ts                  # Pure rules engine (errors + warnings)
supabase/
  schema.sql                     # Tables, indexes, trigger, storage bucket
  seed.sql                       # 5 demo docs + 15 records for the Loom demo
```

## Getting started

### 1 · Supabase project

Create a new project at https://supabase.com. In **SQL Editor**, paste and run
[`supabase/schema.sql`](supabase/schema.sql). This creates the `documents`,
`extracted_records`, and `audit_log` tables, the `set_updated_at` trigger, and
a public `documents` storage bucket. (Optional: also run
[`supabase/seed.sql`](supabase/seed.sql) to populate 15 demo records.)

### 2 · Env vars (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
```

Supabase keys come from **Project Settings → API**. Gemini key from
https://aistudio.google.com/apikey.

### 3 · Install & run

```bash
npm install
npm run dev
```

Open http://localhost:3000.

### 4 · Deploy

Import the repo in Vercel, paste the same four env vars under
**Settings → Environment Variables**, deploy.

## Data model (Machine Shop Data form)

The sample dataset is a printed table with 10 numbered rows for shift logs.
Six sample images were provided and the prompt + validation accept the union
of formats observed across them — i.e., shift can be Roman *or* Arabic, op
codes 5–6 digits, work orders 5–8 digits, machines `MC-…` *or* `ABC-Tnn`.
Gemini normalizes the input variations into the canonical forms below:

| Field | Format after extraction | Example |
|---|---|---|
| `date` | `YYYY-MM-DD` — prompt expands `DD/MM/YY` → `20YY`, fills `DD/MM` (no year) with `2026` | `2026-04-20` |
| `shift` | `I` \| `II` \| `III` — prompt normalizes Arabic `1`/`2`/`3` to Roman | `II` |
| `employee_number` | `^BT\d{4}$` | `BT4710` |
| `operation_code` | `^\d{5,6}$` | `856430`, `54321` |
| `machine_number` | `^[A-Z]{2,3}-[A-Z0-9]{2,5}$` | `MC-730`, `ABC-T30` |
| `work_order_number` | `^\d{5,8}$` | `165460`, `24686870` |
| `quantity_produced` | positive int (cell `-` / `NA` → null) | `25` |
| `time_taken` | hours, integer or decimal | `4.5`, `8` |

Cells with strike-throughs (writer corrections) are extracted as the
replacement value with confidence capped at 0.7 and a note explaining the
correction was applied.

The Gemini prompt drops blank rows and emits its own per-field confidence;
`lib/extract.ts` then bumps confidence to `0.95` when a regex match is perfect,
caps at `0.7` when the model flagged handwriting ambiguity, and zeroes nulls.
UI threshold: **green ≥ 0.85**, **amber 0.6–0.85**, **red < 0.6**.

## Edit flow & audit trail

`PATCH /api/records/[id]` is the single mutation endpoint. It:

1. Diffs incoming values against the current row.
2. Writes one `audit_log` row per changed field (`field`, `old_value`, `new_value`).
3. Re-runs `validate()` against the merged record and persists the new
   `validation_errors` jsonb.
4. Marks the record `reviewed = true`.
5. Bumps the parent `documents.status` to `reviewed` when every sibling is done.

`raw_extraction` and `confidence` are kept untouched after a manual edit so
the original LLM output stays as ground truth for forensics.

## Assumptions & tradeoffs

- **No auth.** Anyone with the URL can upload, edit, and view. Acceptable for
  a single-tenant prototype; the first step in any real deployment.
- **One sample document.** The Gemini prompt and validation rules were tuned
  against the single provided JPEG. Different layouts will likely need prompt
  tweaks. Multi-document training data would let us measure accuracy properly.
- **Synchronous extraction.** `/api/extract` runs Gemini inside the request
  (10–20 s). Fine for the demo with `maxDuration = 60`. A real version would
  queue extraction to a worker so the upload response stays fast.
- **No retries on Gemini 5xx.** A 503 from the model fails the document and
  surfaces an error message; the "Re-extract" button on the review screen lets
  a user retry.
- **No tests.** Manual smoke testing only. The 48-hour budget went to features.
  Extraction + validation are the lowest-trust pieces and would be the first
  to get coverage.
- **Vercel hobby payload cap.** `/api/upload` rejects files > 4 MB to stay
  under the 4.5 MB serverless function limit. Real-world raise: use Supabase
  signed-upload URLs and skip the function entirely.
- **Polish skipped:** no dark-mode toggle, no responsive mobile review screen,
  no bulk upload, no `audit_log` viewer UI. Bandwidth went to the demo path.

## What I'd do next with more time

- Two-pass extraction with disagreement-based confidence (run Gemini twice,
  flag fields where the two passes disagree).
- Per-user history + RLS once auth lands.
- Bulk upload + a queue worker for batch ingestion.
- Mobile-responsive review screen (foreman use case on the shop floor).
- A `/documents/[id]/audit` view that walks every change with timestamps.
- Tests for `lib/extract.ts` (prompt regressions) and `lib/validation.ts`
  (rule changes).
