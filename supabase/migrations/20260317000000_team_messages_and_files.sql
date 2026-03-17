-- Create team_messages table for the team chat feature
create table if not exists team_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  sender_email text not null,
  sender_name text,
  content text not null,
  is_ai boolean default false,
  mentions_task_id uuid references tasks(id) on delete set null,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table team_messages enable row level security;

-- Allow authenticated users to read all messages
create policy "Authenticated users can read team messages"
  on team_messages for select
  to authenticated
  using (true);

-- Allow authenticated users to insert their own messages
create policy "Authenticated users can insert team messages"
  on team_messages for insert
  to authenticated
  with check (auth.uid() = user_id or is_ai = true);

-- Create files table for the file management feature
create table if not exists files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  name text not null,
  size_bytes bigint,
  mime_type text,
  storage_path text,
  source text default 'upload',
  onedrive_id text,
  onedrive_url text,
  shared_with text[],
  task_id uuid references tasks(id) on delete set null,
  created_at timestamptz default now()
);

-- Enable Row Level Security on files
alter table files enable row level security;

-- Allow users to manage their own files and see shared ones
create policy "Users can manage their own files"
  on files for all
  to authenticated
  using (auth.uid() = user_id or auth.jwt() ->> 'email' = any(shared_with));
