-- ============================================================
--  Suivi salle — schéma Neon (Postgres)
--  À coller dans le SQL Editor de ton projet Neon, puis "Run".
--  Rejouable sans risque : tout est en "if not exists".
--
--  Note : pas de Row Level Security ici, contrairement à la version
--  Supabase. Le navigateur ne parle jamais à la base directement — il
--  passe par les fonctions serverless de `api/`, qui filtrent toutes
--  sur l'utilisateur de la session. C'est là qu'est l'isolation.
-- ============================================================

-- ---------- Utilisateurs ----------
-- L'email est stocké en minuscules (normalisé côté API) pour que
-- l'unicité soit insensible à la casse sans dépendre de l'extension citext.
create table if not exists public.users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  password_hash text not null,
  created_at    timestamptz not null default now()
);

-- ---------- Séances ----------
create table if not exists public.workouts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  day_key    text not null,                 -- 'j1' … 'j5'
  date       date not null default current_date,
  notes      text,
  created_at timestamptz not null default now(),
  unique (user_id, day_key, date)
);

-- ---------- Séries ----------
-- `warmup` distingue les montées en charge des séries de travail. Les deux
-- numérotent leurs séries à partir de 0, l'unicité porte donc sur les quatre
-- colonnes — elle est créée plus bas, sous un nom stable.
create table if not exists public.sets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  workout_id   uuid not null references public.workouts(id) on delete cascade,
  exercise_key text not null,
  set_index    int  not null,               -- 0 = première série
  weight       numeric(6,2),
  reps         int,
  rpe          numeric(3,1),
  warmup       boolean not null default false,
  performed_at date not null default current_date,
  created_at   timestamptz not null default now()
);

-- Arrivé après coup, comme la colonne `steps` : ces trois lignes mettent à jour
-- les bases créées avant l'échauffement et ne font rien sur les autres.
alter table public.sets add column if not exists warmup boolean not null default false;
-- L'ancienne unicité à trois colonnes interdisait qu'un échauffement et une
-- série de travail partagent un numéro. Elle est remplacée par la version à
-- quatre colonnes ci-dessous. Le nom est celui que Postgres génère pour
-- `unique (workout_id, exercise_key, set_index)`.
alter table public.sets drop constraint if exists sets_workout_id_exercise_key_set_index_key;
create unique index if not exists sets_slot_uniq
  on public.sets (workout_id, exercise_key, set_index, warmup);

-- ---------- Poids de corps & mensurations ----------
create table if not exists public.body_metrics (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  date       date not null default current_date,
  weight     numeric(5,2),   -- kg
  chest      numeric(5,1),   -- cm
  waist      numeric(5,1),
  arm        numeric(5,1),
  thigh      numeric(5,1),
  steps      int,            -- pas du jour, envoyés par le raccourci iOS
  notes      text,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

-- La colonne `steps` est arrivée après coup : cette ligne la rajoute aux bases
-- créées avant, et ne fait rien sur les autres.
alter table public.body_metrics add column if not exists steps int;

-- ---------- Index ----------
create index if not exists sets_user_exercise_idx  on public.sets (user_id, exercise_key, performed_at);
create index if not exists sets_workout_idx        on public.sets (workout_id);
create index if not exists workouts_user_date_idx  on public.workouts (user_id, date desc);
create index if not exists body_user_date_idx      on public.body_metrics (user_id, date);
