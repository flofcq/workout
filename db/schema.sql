-- ============================================================
--  Suivi salle — schéma Neon (Postgres)
--  À coller dans le SQL Editor de ton projet Neon, puis "Run".
--  Rejouable sans risque : tout est en "if not exists".
--
--  Pourquoi un bloc DO ?
--  Le SQL Editor de Neon envoie le contenu de l'onglet comme une requête
--  préparée, et Postgres refuse alors plusieurs commandes séparées par ';'
--  (« cannot insert multiple commands into a prepared statement »). Emballer
--  le tout dans un bloc DO n'envoie qu'une seule commande, et lève la
--  limitation. psql exécute ce fichier tel quel, sans changement.
--
--  Note : pas de Row Level Security ici, contrairement à la version
--  Supabase. Le navigateur ne parle jamais à la base directement — il
--  passe par les fonctions serverless de `api/`, qui filtrent toutes
--  sur l'utilisateur de la session. C'est là qu'est l'isolation.
-- ============================================================

DO $$
BEGIN

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
create table if not exists public.sets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
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
  user_id    uuid not null references public.users(id) on delete cascade,
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

END $$;
