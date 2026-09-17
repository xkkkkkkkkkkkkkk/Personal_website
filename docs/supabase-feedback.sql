-- ============================================================
--  V3 — Feedback table for the Contact panel
--
--  Run this once in the Supabase SQL editor
--  (Dashboard -> SQL Editor -> New query -> paste -> Run).
--
--  Safe to run more than once, and safe to run on a database where a
--  `feedback` table already exists: section 2 repairs the shape instead of
--  silently doing nothing. (A bare `create table if not exists` would skip an
--  existing table entirely, leaving it without the columns the form sends —
--  and PostgREST then rejects every submit with PGRST204.)
--
--  Sections 3 and 4 are the two things that make the public "anon" key able to
--  write from the browser at all. A table created by hand in the SQL editor
--  does NOT get these automatically, so a submit fails with
--  `42501 permission denied for table feedback`.
-- ============================================================


-- ------------------------------------------------------------
--  1. Create the table (no-op if it already exists)
-- ------------------------------------------------------------
create table if not exists public.feedback (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name       text        check (char_length(name) <= 80),
  email      text        check (char_length(email) <= 120),
  message    text        not null check (char_length(message) between 1 and 2000),
  page       text        default 'contact'
);

comment on table public.feedback is
  'Visitor feedback submitted from the Contact panel feedback form.';


-- ------------------------------------------------------------
--  2. Repair: make sure every column the website sends exists.
--
--  Each line is a no-op when the column is already there, so this is what
--  heals a table that was created by hand or by an older version of this file.
-- ------------------------------------------------------------
alter table public.feedback add column if not exists created_at timestamptz not null default now();
alter table public.feedback add column if not exists name       text;
alter table public.feedback add column if not exists email      text;
alter table public.feedback add column if not exists message    text;
alter table public.feedback add column if not exists page       text default 'contact';

-- `message` is the one field the form always sends. A table built by hand may
-- have left it nullable, so drop any body-less rows and enforce NOT NULL.
delete from public.feedback where message is null;
alter table public.feedback alter column message set not null;


-- ------------------------------------------------------------
--  3. Grants — without these the browser's anon key cannot write.
--
--  `usage` on the schema lets anon address the table at all, and `insert`
--  lets it add rows. That is the whole surface the public key should have;
--  in particular anon is NOT granted select, update or delete.
-- ------------------------------------------------------------
grant usage on schema public to anon;
grant insert on table public.feedback to anon;


-- ------------------------------------------------------------
--  4. Row level security
--
--  The anon key ships inside the public page, so it must not be able to read
--  anything. The policy below allows INSERT only: visitors can submit, but
--  nobody can list other people's feedback through the website.
--  You still see every row in the Supabase dashboard, which bypasses RLS.
--
--  Note: RLS is a filter, not a grant. The GRANT in section 3 is still
--  required — failing to grant it gives `42501 permission denied`, long
--  before any policy is consulted.
-- ------------------------------------------------------------
alter table public.feedback enable row level security;

drop policy if exists "anon can insert feedback" on public.feedback;
create policy "anon can insert feedback"
  on public.feedback
  for insert
  to anon
  with check (true);

-- No SELECT / UPDATE / DELETE policy on purpose.


-- ------------------------------------------------------------
--  5. Reload PostgREST's schema cache so new columns and grants are visible
--     to the REST API immediately (otherwise they can 404 for a while).
-- ------------------------------------------------------------
notify pgrst, 'reload schema';


-- ------------------------------------------------------------
--  6. Handy when browsing submissions newest-first in the dashboard.
-- ------------------------------------------------------------
create index if not exists feedback_created_at_idx
  on public.feedback (created_at desc);
