-- Standalone meetings table (not tied to a task)
create table if not exists meetings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete set null,
  title text not null,
  meeting_date date not null,
  meeting_time time not null,
  duration_minutes int not null default 30,
  location text,
  notes text,
  created_at timestamptz default now()
);

-- Row-level security
alter table meetings enable row level security;

create policy "Users can view their own meetings"
  on meetings for select
  using (auth.uid() = user_id);

create policy "Users can insert their own meetings"
  on meetings for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own meetings"
  on meetings for update
  using (auth.uid() = user_id);

create policy "Users can delete their own meetings"
  on meetings for delete
  using (auth.uid() = user_id);

-- Enable realtime
alter publication supabase_realtime add table meetings;
