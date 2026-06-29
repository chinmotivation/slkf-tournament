-- Add logo_url to associations so each HM dojo can store its logo
alter table associations
  add column if not exists logo_url text;

-- Supabase Storage bucket for dojo logos (run once in dashboard or via CLI)
-- insert into storage.buckets (id, name, public)
-- values ('dojo-logos', 'dojo-logos', true)
-- on conflict (id) do nothing;

-- RLS: HM can read/write only their own logo object (path = user_id/logo.*)
-- create policy "HM upload own logo"
--   on storage.objects for insert
--   with check (bucket_id = 'dojo-logos' and (storage.foldername(name))[1] = auth.uid()::text);

-- create policy "HM update own logo"
--   on storage.objects for update
--   with check (bucket_id = 'dojo-logos' and (storage.foldername(name))[1] = auth.uid()::text);

-- create policy "Public read logos"
--   on storage.objects for select
--   using (bucket_id = 'dojo-logos');
