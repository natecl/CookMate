-- Create cooking_sessions table
create table cooking_sessions (
  id text primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  recipe_id uuid not null references recipes(id) on delete cascade,
  current_step_index integer not null default 0,
  step_completion boolean[] not null default '{}',
  status text not null default 'idle'
    check (status in ('idle', 'active', 'paused', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_cooking_sessions_user_id on cooking_sessions(user_id);
create index idx_cooking_sessions_recipe_id on cooking_sessions(recipe_id);

-- Row Level Security
alter table cooking_sessions enable row level security;

create policy "Users can read own sessions"
  on cooking_sessions for select using (auth.uid() = user_id);

create policy "Users can insert own sessions"
  on cooking_sessions for insert with check (auth.uid() = user_id);

create policy "Users can update own sessions"
  on cooking_sessions for update using (auth.uid() = user_id);
