-- Create recipes table
create table recipes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  recipe_name text not null,
  ingredients text[] not null default '{}',
  instructions text[] not null default '{}',
  source_mode text check (source_mode in ('suggestion', 'import', 'ingredients')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_recipes_user_id on recipes(user_id);

-- Row Level Security
alter table recipes enable row level security;

create policy "Users can read own recipes"
  on recipes for select using (auth.uid() = user_id);

create policy "Users can insert own recipes"
  on recipes for insert with check (auth.uid() = user_id);

create policy "Users can update own recipes"
  on recipes for update using (auth.uid() = user_id);

create policy "Users can delete own recipes"
  on recipes for delete using (auth.uid() = user_id);
