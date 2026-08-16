-- ============================================================
--  Suivi salle — schéma Supabase
--  À coller dans le SQL Editor de ton projet Supabase, puis "Run".
--  Rejouable sans risque : tout est en "if not exists" / "drop if exists".
-- ============================================================

-- ---------- Séances ----------
create table if not exists public.workouts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade default auth.uid(),
  day_key    text not null,                 -- 'j1' … 'j5'
  date       date not null default current_date,
  notes      text,
  created_at timestamptz not null default now(),
  unique (user_id, day_key, date)
);

-- ---------- Séries ----------
create table if not exists public.sets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade default auth.uid(),
  workout_id   uuid not null references public.workouts(id) on delete cascade,
  exercise_key text not null,
  set_index    int  not null,               -- 0 = première série
  weight       numeric(6,2),
  reps         int,
  rpe          numeric(3,1),
  performed_at date not null default current_date,
  created_at   timestamptz not null default now(),
  unique (workout_id, exercise_key, set_index)
);

-- ---------- Poids de corps & mensurations ----------
create table if not exists public.body_metrics (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade default auth.uid(),
  date       date not null default current_date,
  weight     numeric(5,2),   -- kg
  chest      numeric(5,1),   -- cm
  waist      numeric(5,1),
  arm        numeric(5,1),
  thigh      numeric(5,1),
  notes      text,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

-- ---------- Index ----------
create index if not exists sets_user_exercise_idx  on public.sets (user_id, exercise_key, performed_at);
create index if not exists sets_workout_idx        on public.sets (workout_id);
create index if not exists workouts_user_date_idx  on public.workouts (user_id, date desc);
create index if not exists body_user_date_idx      on public.body_metrics (user_id, date);

-- ============================================================
--  Row Level Security — chaque utilisateur ne voit que ses données
-- ============================================================

alter table public.workouts     enable row level security;
alter table public.sets         enable row level security;
alter table public.body_metrics enable row level security;

drop policy if exists "workouts owner" on public.workouts;
create policy "workouts owner" on public.workouts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "sets owner" on public.sets;
create policy "sets owner" on public.sets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "body owner" on public.body_metrics;
create policy "body owner" on public.body_metrics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
