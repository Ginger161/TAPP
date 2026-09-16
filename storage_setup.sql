-- Run this in the Supabase SQL editor to set up the expenses bucket

-- Create the expenses bucket
insert into storage.buckets (id, name, public) values ('expenses', 'expenses', true);

-- Enable RLS on storage objects
alter table storage.objects enable row level security;

-- Policy: Allow authenticated users to upload to the expenses bucket
create policy "Allow authenticated uploads" on storage.objects for insert to authenticated with check (bucket_id = 'expenses');

-- Policy: Allow public read access (since URLs need to be viewed)
create policy "Allow public viewing" on storage.objects for select to public using (bucket_id = 'expenses');
