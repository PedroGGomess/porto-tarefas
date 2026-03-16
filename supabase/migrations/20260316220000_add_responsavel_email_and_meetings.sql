-- Add responsavel_email to tasks
alter table tasks add column if not exists responsavel_email text;

-- Create task_meetings table
create table if not exists task_meetings (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade,
  user_id uuid references auth.users,
  title text not null,
  meeting_date date,
  meeting_time time,
  duration_minutes int,
  location text,
  participants text[],
  notes text,
  created_at timestamptz default now()
);
