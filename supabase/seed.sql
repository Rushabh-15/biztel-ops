-- BiztelAI demo seed
-- Adds 5 pre-processed documents + 15 records so the dashboard, history, and
-- review screens look real in the Loom demo even before any live uploads.
--
-- HOW TO RUN: Supabase Dashboard → SQL Editor → paste → Run.
-- Safe to re-run: every row uses a fixed UUID + ON CONFLICT DO NOTHING.
-- TO RESET (re-seed from scratch):
--   DELETE FROM public.extracted_records WHERE id LIKE '11111111-%';
--   DELETE FROM public.documents         WHERE id LIKE '11111111-%';
--
-- All seed docs share the same file_url (an already-uploaded sample). The
-- review screen will show that one image for every seed doc — fine for the
-- demo since the records are what matter.

-- ─── documents ────────────────────────────────────────────────────────────────
insert into public.documents (id, file_name, file_url, file_type, status, uploaded_at) values
  ('11111111-0001-0000-0000-000000000001', 'shift_log_2026_04_15.jpeg', 'https://fxqckbmaytdqubssswxo.supabase.co/storage/v1/object/public/documents/51d29917-e4d7-4d2e-8548-25ed97b72b69/BiztelAI_dataset.jpeg', 'image/jpeg', 'reviewed',  '2026-04-15T18:30:00Z'),
  ('11111111-0001-0000-0000-000000000002', 'shift_log_2026_04_18.jpeg', 'https://fxqckbmaytdqubssswxo.supabase.co/storage/v1/object/public/documents/51d29917-e4d7-4d2e-8548-25ed97b72b69/BiztelAI_dataset.jpeg', 'image/jpeg', 'reviewed',  '2026-04-18T19:10:00Z'),
  ('11111111-0001-0000-0000-000000000003', 'shift_log_2026_04_22.jpeg', 'https://fxqckbmaytdqubssswxo.supabase.co/storage/v1/object/public/documents/51d29917-e4d7-4d2e-8548-25ed97b72b69/BiztelAI_dataset.jpeg', 'image/jpeg', 'processed', '2026-04-22T20:05:00Z'),
  ('11111111-0001-0000-0000-000000000004', 'production_sheet_apr_25.jpeg', 'https://fxqckbmaytdqubssswxo.supabase.co/storage/v1/object/public/documents/51d29917-e4d7-4d2e-8548-25ed97b72b69/BiztelAI_dataset.jpeg', 'image/jpeg', 'processed', '2026-04-25T18:50:00Z'),
  ('11111111-0001-0000-0000-000000000005', 'shift_log_2026_05_01.jpeg', 'https://fxqckbmaytdqubssswxo.supabase.co/storage/v1/object/public/documents/51d29917-e4d7-4d2e-8548-25ed97b72b69/BiztelAI_dataset.jpeg', 'image/jpeg', 'processed', '2026-05-01T17:45:00Z')
on conflict (id) do nothing;

-- ─── extracted_records ───────────────────────────────────────────────────────
-- All confidence/raw_extraction blobs are abbreviated demo-grade; the editing
-- flow on the live URL produces the full shape.
insert into public.extracted_records (
  id, document_id, row_index, date, shift, employee_number, operation_code,
  machine_number, work_order_number, quantity_produced, time_taken,
  raw_extraction, confidence, validation_errors, reviewed, reviewed_at,
  created_at, updated_at
) values
  -- Doc 1 — 2026-04-15, all clean, all reviewed
  ('11111111-1111-0000-0000-000000000001', '11111111-0001-0000-0000-000000000001', 1, '2026-04-15', 'I',   'BT4710', '856430', 'MC-730', '165460', 28, 4.0,
   '{}'::jsonb, '{"date":1,"shift":1,"employee_number":1,"operation_code":0.95,"machine_number":1,"work_order_number":0.95,"quantity_produced":1,"time_taken":1}'::jsonb, '[]'::jsonb, true, '2026-04-15T19:00:00Z', '2026-04-15T18:30:30Z', '2026-04-15T19:00:00Z'),
  ('11111111-1111-0000-0000-000000000002', '11111111-0001-0000-0000-000000000001', 2, '2026-04-15', 'II',  'BT4715', '856460', 'MC-780', '165500', 35, 6.5,
   '{}'::jsonb, '{"date":1,"shift":1,"employee_number":1,"operation_code":0.95,"machine_number":1,"work_order_number":0.95,"quantity_produced":1,"time_taken":1}'::jsonb, '[]'::jsonb, true, '2026-04-15T19:00:00Z', '2026-04-15T18:30:30Z', '2026-04-15T19:00:00Z'),
  ('11111111-1111-0000-0000-000000000003', '11111111-0001-0000-0000-000000000001', 3, '2026-04-15', 'III', 'BT4720', '856470', 'MC-850', '601200', 22, 7.5,
   '{}'::jsonb, '{"date":1,"shift":1,"employee_number":1,"operation_code":0.95,"machine_number":1,"work_order_number":0.95,"quantity_produced":1,"time_taken":1}'::jsonb, '[]'::jsonb, true, '2026-04-15T19:00:00Z', '2026-04-15T18:30:30Z', '2026-04-15T19:00:00Z'),

  -- Doc 2 — 2026-04-18, all clean, all reviewed
  ('11111111-1111-0000-0000-000000000004', '11111111-0001-0000-0000-000000000002', 1, '2026-04-18', 'I',   'BT4710', '856430', 'MC-730', '165470', 30, 4.5,
   '{}'::jsonb, '{"date":1,"shift":1,"employee_number":1,"operation_code":0.95,"machine_number":1,"work_order_number":0.95,"quantity_produced":1,"time_taken":1}'::jsonb, '[]'::jsonb, true, '2026-04-18T19:30:00Z', '2026-04-18T19:10:30Z', '2026-04-18T19:30:00Z'),
  ('11111111-1111-0000-0000-000000000005', '11111111-0001-0000-0000-000000000002', 2, '2026-04-18', 'II',  'BT4715', '856490', 'MC-910', '165520', 42, 8.0,
   '{}'::jsonb, '{"date":1,"shift":1,"employee_number":1,"operation_code":0.95,"machine_number":1,"work_order_number":0.95,"quantity_produced":1,"time_taken":1}'::jsonb, '[]'::jsonb, true, '2026-04-18T19:30:00Z', '2026-04-18T19:10:30Z', '2026-04-18T19:30:00Z'),
  ('11111111-1111-0000-0000-000000000006', '11111111-0001-0000-0000-000000000002', 3, '2026-04-18', 'II',  'BT4720', '856460', 'MC-780', '165540', 38, 7.0,
   '{}'::jsonb, '{"date":1,"shift":1,"employee_number":1,"operation_code":0.95,"machine_number":1,"work_order_number":0.95,"quantity_produced":1,"time_taken":1}'::jsonb, '[]'::jsonb, true, '2026-04-18T19:30:00Z', '2026-04-18T19:10:30Z', '2026-04-18T19:30:00Z'),

  -- Doc 3 — 2026-04-22, mixed: one low-confidence record awaiting review
  ('11111111-1111-0000-0000-000000000007', '11111111-0001-0000-0000-000000000003', 1, '2026-04-22', 'I',   'BT4710', '856500', 'MC-960', '165600', 45, 8.5,
   '{}'::jsonb, '{"date":1,"shift":1,"employee_number":1,"operation_code":0.95,"machine_number":1,"work_order_number":0.95,"quantity_produced":1,"time_taken":1}'::jsonb, '[]'::jsonb, false, null, '2026-04-22T20:05:30Z', '2026-04-22T20:05:30Z'),
  ('11111111-1111-0000-0000-000000000008', '11111111-0001-0000-0000-000000000003', 2, '2026-04-22', 'III', 'BT4720', '856470', 'MC-850', '601220', 25, 7.0,
   '{}'::jsonb, '{"date":1,"shift":1,"employee_number":1,"operation_code":0.95,"machine_number":1,"work_order_number":0.95,"quantity_produced":1,"time_taken":1}'::jsonb, '[]'::jsonb, false, null, '2026-04-22T20:05:30Z', '2026-04-22T20:05:30Z'),
  ('11111111-1111-0000-0000-000000000009', '11111111-0001-0000-0000-000000000003', 3, '2026-04-22', 'III', 'BT4720', '856430', 'MC-730', '165620', 18, 5.0,
   '{}'::jsonb, '{"date":1,"shift":1,"employee_number":1,"operation_code":0.65,"machine_number":1,"work_order_number":0.55,"quantity_produced":0.7,"time_taken":1}'::jsonb,
   '[{"field":"work_order_number","severity":"warning","message":"Low OCR confidence — verify"}]'::jsonb,
   false, null, '2026-04-22T20:05:30Z', '2026-04-22T20:05:30Z'),

  -- Doc 4 — 2026-04-25, has an incomplete row to showcase validation panel
  ('11111111-1111-0000-0000-000000000010', '11111111-0001-0000-0000-000000000004', 1, '2026-04-25', 'I',   'BT4715', '856490', 'MC-910', '165700', 40, 7.5,
   '{}'::jsonb, '{"date":1,"shift":1,"employee_number":1,"operation_code":0.95,"machine_number":1,"work_order_number":0.95,"quantity_produced":1,"time_taken":1}'::jsonb, '[]'::jsonb, false, null, '2026-04-25T18:50:30Z', '2026-04-25T18:50:30Z'),
  ('11111111-1111-0000-0000-000000000011', '11111111-0001-0000-0000-000000000004', 2, '2026-04-25', 'II',  'BT4710', '856460', 'MC-780', '165720', 35, 6.0,
   '{}'::jsonb, '{"date":1,"shift":1,"employee_number":1,"operation_code":0.95,"machine_number":1,"work_order_number":0.95,"quantity_produced":1,"time_taken":1}'::jsonb, '[]'::jsonb, false, null, '2026-04-25T18:50:30Z', '2026-04-25T18:50:30Z'),
  ('11111111-1111-0000-0000-000000000012', '11111111-0001-0000-0000-000000000004', 3, null,         null,  'BT4720', null,     'MC-850', null,     null, null,
   '{}'::jsonb, '{"date":0,"shift":0,"employee_number":1,"operation_code":0,"machine_number":1,"work_order_number":0,"quantity_produced":0,"time_taken":0}'::jsonb,
   '[{"field":"date","severity":"error","message":"date is required"},{"field":"shift","severity":"error","message":"shift is required"},{"field":"work_order_number","severity":"error","message":"work_order_number is required"},{"field":"quantity_produced","severity":"error","message":"quantity_produced is required"}]'::jsonb,
   false, null, '2026-04-25T18:50:30Z', '2026-04-25T18:50:30Z'),

  -- Doc 5 — 2026-05-01, all clean, awaiting review
  ('11111111-1111-0000-0000-000000000013', '11111111-0001-0000-0000-000000000005', 1, '2026-05-01', 'I',   'BT4710', '856430', 'MC-730', '165800', 33, 5.0,
   '{}'::jsonb, '{"date":1,"shift":1,"employee_number":1,"operation_code":0.95,"machine_number":1,"work_order_number":0.95,"quantity_produced":1,"time_taken":1}'::jsonb, '[]'::jsonb, false, null, '2026-05-01T17:45:30Z', '2026-05-01T17:45:30Z'),
  ('11111111-1111-0000-0000-000000000014', '11111111-0001-0000-0000-000000000005', 2, '2026-05-01', 'II',  'BT4715', '856500', 'MC-960', '165820', 48, 8.5,
   '{}'::jsonb, '{"date":1,"shift":1,"employee_number":1,"operation_code":0.95,"machine_number":1,"work_order_number":0.95,"quantity_produced":1,"time_taken":1}'::jsonb, '[]'::jsonb, false, null, '2026-05-01T17:45:30Z', '2026-05-01T17:45:30Z'),
  ('11111111-1111-0000-0000-000000000015', '11111111-0001-0000-0000-000000000005', 3, '2026-05-01', 'III', 'BT4720', '856470', 'MC-850', '601250', 27, 7.5,
   '{}'::jsonb, '{"date":1,"shift":1,"employee_number":1,"operation_code":0.95,"machine_number":1,"work_order_number":0.95,"quantity_produced":1,"time_taken":1}'::jsonb, '[]'::jsonb, false, null, '2026-05-01T17:45:30Z', '2026-05-01T17:45:30Z')
on conflict (id) do nothing;
