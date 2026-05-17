-- BiztelAI ops: initial schema
-- Paste this entire file into Supabase Dashboard → SQL Editor → New query → Run.
-- Safe to re-run: uses IF NOT EXISTS / ON CONFLICT guards.
--
-- Auth model: none (single-tenant prototype). All DB writes go through Next.js
-- server routes using SUPABASE_SERVICE_ROLE_KEY (bypasses RLS). RLS is left
-- disabled on these tables; do not expose direct anon-key queries from the
-- browser.
--
-- Field formats locked to the "Machine shop data" form sample:
--   shift             ∈ { 'I', 'II', 'III' }     (Roman numerals)
--   employee_number   matches ^BT\d{4}$
--   operation_code    matches ^\d{6}$
--   machine_number    matches ^MC-\d{3,4}$
--   work_order_number matches ^\d{6}$
-- These are enforced in lib/validation.ts, not as DB constraints, so raw LLM
-- output can still land in the table for the review screen to fix.

create extension if not exists "pgcrypto";

-- ─── documents ────────────────────────────────────────────────────────────────
create table if not exists public.documents (
  id            uuid primary key default gen_random_uuid(),
  file_name     text not null,
  file_url      text not null,
  file_type     text not null,
  page_count    int  not null default 1,
  status        text not null default 'uploaded',
                -- uploaded | processing | processed | reviewed | failed
  uploaded_at   timestamptz not null default now(),
  error_message text
);

create index if not exists documents_uploaded_at_idx on public.documents (uploaded_at desc);
create index if not exists documents_status_idx      on public.documents (status);

-- ─── extracted_records ───────────────────────────────────────────────────────
create table if not exists public.extracted_records (
  id                 uuid primary key default gen_random_uuid(),
  document_id        uuid not null references public.documents(id) on delete cascade,
  row_index          int,                -- preserves "S. No" row order from source form
  date               date,
  shift              text,
  employee_number    text,
  operation_code     text,
  machine_number     text,
  work_order_number  text,
  quantity_produced  int,
  time_taken         numeric,
  raw_extraction     jsonb,              -- full Gemini response for this record
  confidence         jsonb,              -- { field: 0.0..1.0 }
  validation_errors  jsonb,              -- [{ field, severity, message }]
  reviewed           boolean not null default false,
  reviewed_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists extracted_records_document_id_idx on public.extracted_records (document_id);
create index if not exists extracted_records_work_order_idx  on public.extracted_records (work_order_number);
create index if not exists extracted_records_date_idx        on public.extracted_records (date);

-- auto-update updated_at on row changes
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end
$$;

drop trigger if exists trg_extracted_records_updated_at on public.extracted_records;
create trigger trg_extracted_records_updated_at
  before update on public.extracted_records
  for each row execute function public.set_updated_at();

-- ─── audit_log ────────────────────────────────────────────────────────────────
create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  record_id   uuid references public.extracted_records(id) on delete cascade,
  field       text not null,
  old_value   text,
  new_value   text,
  changed_at  timestamptz not null default now()
);

create index if not exists audit_log_record_id_idx on public.audit_log (record_id);

-- ─── storage bucket ───────────────────────────────────────────────────────────
-- Public bucket so file_url values resolve without signed URLs. Uploads go
-- through the server using the service-role key, so no storage.objects policies
-- are needed for the demo path.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do nothing;
