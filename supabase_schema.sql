-- ============================================================
-- FULL SUPABASE SCHEMA 
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. Table: students
-- ============================================================
create table if not exists public.students (
    id uuid primary key default uuid_generate_v4(),
    course text not null,
    name text not null,
    gender text,
    image_file text,
    present boolean default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ============================================================
-- 2. Table: history
-- ============================================================
create table if not exists public.history (
    id uuid primary key default uuid_generate_v4(),
    student_id uuid references public.students(id) on delete cascade,
    cycle_number integer not null,
    selected_at timestamp with time zone default timezone('utc'::text, now()) not null,
    course text not null,
    student_name text not null
);

-- ============================================================
-- 3. Table: app_state
-- ============================================================
create table if not exists public.app_state (
    id uuid primary key default uuid_generate_v4(),
    current_cycle integer default 1,
    current_index integer default 0,
    queue jsonb default '[]'::jsonb,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insert a single row for app_state if it doesn't exist
insert into public.app_state (id, current_cycle, current_index, queue)
select uuid_generate_v4(), 1, 0, '[]'::jsonb
where not exists (select 1 from public.app_state);

-- ============================================================
-- 4. Table: games
-- ============================================================
CREATE TABLE IF NOT EXISTS public.games (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text NOT NULL,
  description text,
  created_at  timestamptz DEFAULT now()
);

-- ============================================================
-- 5. Table: game_students (Join Table)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.game_students (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id    uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'primary', -- 'primary' | 'substitute'
  position   integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(game_id, student_id)
);


-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
alter table public.students enable row level security;
alter table public.history enable row level security;
alter table public.app_state enable row level security;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_students ENABLE ROW LEVEL SECURITY;

-- Policies for students
DROP POLICY IF EXISTS "Allow all actions for authenticated users on students" ON public.students;
create policy "Allow all actions for authenticated users on students"
    on public.students for all
    to authenticated
    using (true)
    with check (true);

-- Policies for history
DROP POLICY IF EXISTS "Allow all actions for authenticated users on history" ON public.history;
create policy "Allow all actions for authenticated users on history"
    on public.history for all
    to authenticated
    using (true)
    with check (true);

-- Policies for app_state
DROP POLICY IF EXISTS "Allow all actions for authenticated users on app_state" ON public.app_state;
create policy "Allow all actions for authenticated users on app_state"
    on public.app_state for all
    to authenticated
    using (true)
    with check (true);

-- Policies for games
DROP POLICY IF EXISTS "Authenticated full access on games" ON public.games;
CREATE POLICY "Authenticated full access on games"
  ON public.games FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Policies for game_students
DROP POLICY IF EXISTS "Authenticated full access on game_students" ON public.game_students;
CREATE POLICY "Authenticated full access on game_students"
  ON public.game_students FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
