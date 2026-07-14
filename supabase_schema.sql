-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Table: students
create table if not exists public.students (
    id uuid primary key default uuid_generate_v4(),
    course text not null,
    name text not null,
    image_file text,
    present boolean default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: history
create table if not exists public.history (
    id uuid primary key default uuid_generate_v4(),
    student_id uuid references public.students(id) on delete cascade,
    cycle_number integer not null,
    selected_at timestamp with time zone default timezone('utc'::text, now()) not null,
    course text not null,
    student_name text not null
);

-- Table: app_state
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

-- Enable Row Level Security (RLS)
alter table public.students enable row level security;
alter table public.history enable row level security;
alter table public.app_state enable row level security;

-- Policies for students
create policy "Allow all actions for authenticated users on students"
    on public.students for all
    to authenticated
    using (true)
    with check (true);

-- Policies for history
create policy "Allow all actions for authenticated users on history"
    on public.history for all
    to authenticated
    using (true)
    with check (true);

-- Policies for app_state
create policy "Allow all actions for authenticated users on app_state"
    on public.app_state for all
    to authenticated
    using (true)
    with check (true);
