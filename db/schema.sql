-- MedDo database schema (spec/ARCHITECTURE.md, section 2).
-- Three tables, constraints, four indexes, RLS, private Storage bucket and its policies.
-- No triggers, no SQL functions, no Edge Functions.

-- ---------- Tables ----------

create table public.medical_issues (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),   -- also the issue "opened on" date
  name        text not null,
  status      text not null default 'open' check (status in ('open', 'closed')),
  next_step   text
);

create table public.documents (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at       timestamptz not null default now(),
  file_path        text,
  file_mime        text check (file_mime in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  input_text       text,
  extracted_text   text not null,
  content_type     text check (content_type in ('result', 'referral', 'visit_summary', 'prescription', 'receipt_invoice')),
  specialty        text,
  doc_date         date,
  provider         text,
  key_info         text,
  medical_issue_id uuid not null references public.medical_issues(id) on delete restrict,
  fields           jsonb not null default '{}'::jsonb,
  -- exactly one of file / free text
  constraint documents_one_source check ((file_path is not null) <> (input_text is not null))
);

create table public.tasks (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at       timestamptz not null default now(),
  description      text not null,
  type             text not null check (type in ('appointment', 'test', 'result', 'medication', 'refund')),
  status           text not null default 'todo' check (status in ('todo', 'waiting', 'done')),
  due_date         date,
  due_time         time,
  document_id      uuid references public.documents(id) on delete set null,
  medical_issue_id uuid references public.medical_issues(id) on delete set null,
  -- due date is required except for waiting tasks
  constraint tasks_due_date_required check (status = 'waiting' or due_date is not null)
);

-- ---------- Indexes (exactly four) ----------

create index tasks_status_due_date_idx    on public.tasks (status, due_date);
create index tasks_medical_issue_id_idx   on public.tasks (medical_issue_id);
create index documents_medical_issue_idx  on public.documents (medical_issue_id);
create index documents_content_type_idx   on public.documents (content_type);

-- ---------- Row Level Security ----------
-- Only the signed-in user sees and changes her own rows. No policy for anon.

alter table public.medical_issues enable row level security;
alter table public.documents      enable row level security;
alter table public.tasks          enable row level security;

create policy "issues_select_own" on public.medical_issues for select to authenticated
  using (user_id = (select auth.uid()));
create policy "issues_insert_own" on public.medical_issues for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "issues_update_own" on public.medical_issues for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "documents_select_own" on public.documents for select to authenticated
  using (user_id = (select auth.uid()));
create policy "documents_insert_own" on public.documents for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "documents_update_own" on public.documents for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "tasks_select_own" on public.tasks for select to authenticated
  using (user_id = (select auth.uid()));
create policy "tasks_insert_own" on public.tasks for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "tasks_update_own" on public.tasks for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "tasks_delete_own" on public.tasks for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------- Storage: private bucket "documents" ----------
-- Path: {user_id}/{uuid}.{ext}. Access only through signed URLs. No update policy.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

create policy "documents_files_select_own" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "documents_files_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "documents_files_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
