-- Create meal_logs table
create table meal_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  recipe_id uuid not null references recipes(id) on delete cascade,
  session_id text references cooking_sessions(id) on delete set null,
  cooked_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create index idx_meal_logs_user_id on meal_logs(user_id);
create index idx_meal_logs_recipe_id on meal_logs(recipe_id);

-- Row Level Security
alter table meal_logs enable row level security;

create policy "Users can read own meal logs"
  on meal_logs for select using (auth.uid() = user_id);

create policy "Users can insert own meal logs"
  on meal_logs for insert with check (auth.uid() = user_id);

-- Create nutrition table
create table nutrition (
  id uuid primary key default uuid_generate_v4(),
  meal_log_id uuid not null references meal_logs(id) on delete cascade,
  calories integer,
  protein_g numeric(7,2),
  carbs_g numeric(7,2),
  fats_g numeric(7,2),
  created_at timestamptz not null default now()
);

-- Row Level Security
alter table nutrition enable row level security;

create policy "Users can read own nutrition"
  on nutrition for select
  using (exists (
    select 1 from meal_logs where meal_logs.id = nutrition.meal_log_id
      and meal_logs.user_id = auth.uid()
  ));

create policy "Users can insert own nutrition"
  on nutrition for insert
  with check (exists (
    select 1 from meal_logs where meal_logs.id = nutrition.meal_log_id
      and meal_logs.user_id = auth.uid()
  ));
