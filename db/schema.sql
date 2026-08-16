-- ============================================================
--  Suivi salle — schéma Neon (Postgres)
--  À coller dans le SQL Editor de ton projet Neon, puis "Run".
--  Rejouable sans risque : tout est en "if not exists".
--
--  Pourquoi le schéma « salle » et pas « public » ?
--  Une base Neon peut héberger plusieurs applications. Dans « public »,
--  une table `users` générique entre en collision avec celle d'un autre
--  projet — au mieux la création échoue, au pire les comptes se mélangent.
--  Tout est donc rangé dans un schéma dédié : cette app ne voit que le
--  sien, et ne peut rien casser à côté.
--
--  Pourquoi un bloc DO ?
--  Le SQL Editor de Neon envoie l'onglet comme une requête préparée, et
--  Postgres refuse alors plusieurs commandes séparées par ';' (« cannot
--  insert multiple commands into a prepared statement »). Le bloc n'en
--  envoie qu'une. psql exécute ce fichier tel quel, sans changement.
--
--  Note : pas de Row Level Security. Le navigateur ne parle jamais à la
--  base directement — il passe par les fonctions serverless de `api/`,
--  qui filtrent toutes sur l'utilisateur de la session.
-- ============================================================

DO $$
BEGIN

create schema if not exists salle;

-- ---------- Utilisateurs ----------
-- L'email est stocké en minuscules (normalisé côté API) pour que
-- l'unicité soit insensible à la casse sans dépendre de l'extension citext.
create table if not exists salle.users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  password_hash text not null,
  created_at    timestamptz not null default now()
);

-- ---------- Séances ----------
create table if not exists salle.workouts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references salle.users(id) on delete cascade,
  day_key    text not null,                 -- 'j1' … 'j5'
  date       date not null default current_date,
  notes      text,
  created_at timestamptz not null default now(),
  unique (user_id, day_key, date)
);

-- ---------- Séries ----------
create table if not exists salle.sets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references salle.users(id) on delete cascade,
  workout_id   uuid not null references salle.workouts(id) on delete cascade,
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
create table if not exists salle.body_metrics (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references salle.users(id) on delete cascade,
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
alter table salle.body_metrics add column if not exists steps int;

-- Exercices hors programme (machine occupée, remplacement improvisé). La clé
-- reste dans exercise_key, comme pour les autres, pour que la progression se
-- suive d'une séance à l'autre ; seul le libellé saisi est stocké ici, faute
-- de pouvoir le retrouver dans src/program.js. Reste NULL pour les exercices
-- du programme, dont le nom vient du code.
alter table salle.sets add column if not exists exercise_name text;

-- ---------- Index ----------
create index if not exists sets_user_exercise_idx  on salle.sets (user_id, exercise_key, performed_at);
create index if not exists sets_workout_idx        on salle.sets (workout_id);
create index if not exists workouts_user_date_idx  on salle.workouts (user_id, date desc);
create index if not exists body_user_date_idx      on salle.body_metrics (user_id, date);

END $$;
