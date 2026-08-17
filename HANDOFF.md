# État des lieux — reprise de travail

Note de passation. Dernière mise à jour : 17 août 2026.
Branche de travail : `claude/muscles-body-section-vyzatg`.

---

## 1. Le blocage en cours — à traiter en premier

Le propriétaire rejoue [`db/schema.sql`](db/schema.sql) dans le SQL Editor de Neon
pour appliquer les migrations. Deux erreurs successives :

1. `cannot insert multiple commands into a prepared statement` — **résolu**.
   L'éditeur envoie le fichier comme une requête préparée unique. Contournement
   documenté dans le README : emballer le contenu entre `do $mig$ begin` et
   `end $mig$;`, ou passer par `psql -f`. Testé sur un PostgreSQL 16 local, y
   compris l'idempotence et la préservation des données.

2. `foreign key constraint "workouts_user_id_fkey" cannot be implemented` —
   **non résolu, c'est là qu'il faut reprendre.**

### Ce que cette erreur nous apprend

Postgres lève ce message au moment du `create table`. Donc :

- `public.workouts` **n'existait pas** — sinon le `create table if not exists`
  se serait sauté sans rien tenter ;
- `public.sets` n'existe pas non plus, puisqu'elle référence `workouts` ;
- **il n'y a donc aucune donnée d'entraînement dans cette base** : ni séance, ni
  série. Cela explique rétroactivement le « Erreur serveur » que le propriétaire
  voyait dans l'onglet Séance de l'app déployée ;
- `public.users` existe (il est connecté, et l'inscription a fonctionné), et son
  `id` a un type **incompatible avec `uuid`** ;
- cette table `users` ne vient pas de ce projet : le schéma de l'ère Supabase
  (`supabase/schema.sql`, commit `d1410e1`) référençait `auth.users`, pas
  `public.users`. Son origine reste inconnue.

### L'information qui manque

Le type réel de `public.users.id`. À faire exécuter dans le SQL Editor de Neon :

```sql
select table_name from information_schema.tables
where table_schema = 'public' order by 1;

select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'users'
order by ordinal_position;

select count(*) from public.users;
```

Le message d'erreur complet contient aussi une ligne `DETAIL:` qui nomme les deux
types en cause — la demander, elle tranche immédiatement.

### Correctifs candidats — NON VALIDÉS

J'ai été interrompu pendant leur test sur un PostgreSQL local, ces deux pistes
n'ont donc **pas** été vérifiées. Les tester avant de les proposer.

- **Si `id` est `text` contenant des UUID** — conversion en place, sans perte :
  ```sql
  alter table public.users alter column id type uuid using id::uuid;
  ```
  puis rejouer le schéma.

- **Si `id` est `integer` / `bigint`** — pas de conversion possible vers `uuid`.
  Recréer la table en conservant les identifiants de connexion :
  ```sql
  create table users_sauvegarde as select email, password_hash from public.users;
  drop table public.users;
  -- rejouer db/schema.sql, puis :
  insert into public.users (email, password_hash)
  select email, password_hash from users_sauvegarde;
  drop table users_sauvegarde;
  ```
  Le mot de passe est préservé (le hash bcrypt est recopié tel quel). Seul l'`id`
  change, ce qui est sans conséquence puisqu'aucune séance n'y est rattachée.

⚠️ Vérifier d'abord qu'aucune autre clé étrangère ne dépend de `public.users`, et
**faire confirmer par le propriétaire** avant tout `drop`. Neon permet aussi de
créer une branche de la base à un instant antérieur, en filet de sécurité.

---

## 2. Où en est le code

Cinq commits sur la branche, pas encore fusionnés sur `main` :

| Commit | Contenu |
|---|---|
| `f90d89c` | Réception des pas depuis le raccourci iOS (`POST /api/steps`, colonne `body_metrics.steps`) |
| `649bf78` | Nom des exercices cliquable vers une vidéo de démonstration |
| `7ecc2d1` | Échauffement : bloc de consignes par séance + montées en charge calculées (colonne `sets.warmup`) |
| `3614c13` | Début/fin de séance chronométrés, temps de repos affiché, bilan de fin (`workouts.started_at`, `ended_at`) |
| `51357f3` | Documentation du contournement multi-commandes |

Deux commits antérieurs (onglet Muscles, rechargement automatique de l'app) sont
**déjà fusionnés** sur `main`.

`npm run lint`, `npm run build` et `npm run test:steps` passent. Le propriétaire
n'a pas encore autorisé la fusion sur `main` : il voulait la migration appliquée
d'abord.

---

## 3. Déploiement — trois pièges déjà rencontrés

1. **Le projet Vercel ne semble pas lié à GitHub.** Les push ne déclenchent aucun
   déploiement. À confirmer dans Deployments ; le déblocage durable est
   Settings → Git → Connect Git Repository.

2. **L'icône de l'écran d'accueil du propriétaire pointait sur une URL de
   déploiement figée** (`workout-7mvul4qja-florent-perso.vercel.app`, avec un
   hash de build au milieu). Ce genre d'URL ne se met jamais à jour, quoi qu'on
   déploie. Il faut l'URL de production (sans hash), puis supprimer et rajouter
   l'icône. Statut inconnu, à vérifier avec lui.

3. **Ordre obligatoire : migration d'abord, déploiement ensuite.** Le code
   s'appuie sur l'index unique à quatre colonnes `sets_slot_uniq` que seule la
   migration crée. Déployer avant ferait échouer toute validation de série.

Variables d'environnement à ajouter pour les pas, sur les trois environnements
(Production, Preview, Development) : `STEPS_TOKEN`, `STEPS_EMAIL`. Sans elles,
`/api/steps` refuse les écritures en 503 et le reste de l'app est intact.

---

## 4. Décisions en attente du propriétaire

- **Calories dépensées par séance.** Question posée, non tranchée. Deux options
  présentées : (A) estimation calculée dans le bilan par la formule MET
  (`kcal/min = MET × 3,5 × poids / 200`), en affichant une fourchette car
  l'incertitude est de ±25-30 % ; (B) importer l'énergie active depuis Apple
  Santé par le même raccourci que les pas, nettement plus juste mais qui suppose
  une Apple Watch. Recommandation faite : B s'il porte une montre, A sinon. Le
  tonnage est une fausse piste — il n'explique qu'environ 1 % de la dépense
  réelle.
- **Vidéos des exercices.** Les liens sont des recherches YouTube sur le nom de
  l'exercice, volontairement : je n'ai pas d'accès réseau pour vérifier des
  identifiants de vidéos, et un lien codé en dur non vérifié serait un lien mort
  ou trompeur. Le champ `video` d'un exercice permet d'épingler une URL précise
  si le propriétaire en fournit.
- **Échauffement « entre chaque rep ».** Sa formulation était ambiguë, j'ai
  compris « entre chaque série ». S'il voulait un tempo d'exécution, c'est un
  autre champ à ajouter.

---

## 5. Conventions à respecter

- **Langue** : tout en français, tutoiement, y compris les commentaires et les
  messages de commit. Les commentaires expliquent le *pourquoi*, pas le *quoi*.
- **Ne jamais renommer les clés `key` des exercices** dans `src/program.js` :
  elles relient l'historique en base, les changer coupe les courbes.
- **L'échauffement ne compte nulle part** où il fausserait la lecture : courbes
  de progression, tonnage, compteur de séries, rappel « dernière fois ».
- **Les horodatages viennent du serveur**, jamais du navigateur.
- **`db/schema.sql` est le seul mécanisme de migration** : entièrement rejouable,
  chaque colonne ajoutée après coup a son `alter table ... if not exists`.
- **Aucune variable d'environnement serveur ne prend le préfixe `VITE_`** — ce
  préfixe embarquerait sa valeur dans le bundle envoyé au navigateur.

### Comment vérifier une modification dans le vrai rendu

Il n'y a pas de suite de tests front. La méthode utilisée jusqu'ici, sans base de
données :

```bash
npx vite build --mode demo        # bundle de production avec l'API simulée
node serve.mjs                    # un serveur statique sur dist/ (à écrire)
# puis piloter avec playwright-core et le Chromium préinstallé :
#   chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
```

Attention : un `npm run build` sans `--mode demo` écrase `dist/` par la version
qui appelle la vraie API, et l'app affiche alors « Configuration requise ».
