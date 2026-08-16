# Suivi salle

Application web pour enregistrer tes séances et tes charges, avec le programme
« Priorité pectoraux » pré-chargé.

- **Séance** — saisie charge / reps / RPE jour par jour : tu navigues par date (flèches ou calendrier) et choisis la séance par son nom, ce qui permet de rattraper celle d'hier. Rappel de ta dernière performance sur chaque exercice, chrono de repos qui démarre tout seul quand tu valides une série.
- **Historique** — toutes tes séances passées, dépliables.
- **Progression** — courbes d'évolution par exercice (charge la plus lourde ou 1RM estimé).
- **Corps** — poids, mensurations et nombre de pas dans le temps.
- **Muscles** — fiche par muscle : où il est, ce qu'il fait, ses faisceaux, et les exercices du programme qui le travaillent.

Fonctionne sur téléphone, synchronisé entre appareils.

---

## Architecture

```
Navigateur (React + Vite)
        │  fetch('/api/…')  — cookie de session httpOnly
        ▼
Fonctions serverless Vercel  (dossier api/)
        │  SQL
        ▼
Neon (Postgres)
```

Le navigateur ne parle **jamais** à la base directement : il n'en connaît ni
l'adresse ni les identifiants. Toute requête passe par une fonction serverless
qui vérifie la session et filtre sur l'utilisateur connecté. C'est là qu'est
l'isolation entre comptes — pas dans des règles au niveau de la base.

---

## 1. Regarder l'app tout de suite (sans rien configurer)

```bash
npm install
npm run demo
```

Ouvre l'adresse affichée. L'app se lance avec des données factices, sans base ni
connexion. C'est le moyen le plus rapide de voir si l'interface te convient avant
d'investir 10 minutes dans la configuration.

---

## 2. Créer la base de données

1. Crée un projet gratuit sur [neon.com](https://neon.com). Depuis Vercel, tu peux
   aussi passer par l'onglet **Storage → Create Database → Neon** : les variables
   d'environnement sont alors branchées automatiquement sur le projet.
2. Ouvre le **SQL Editor** de ton projet Neon.
3. Copie tout le contenu de [`db/schema.sql`](db/schema.sql), colle-le, exécute.

Ça crée un schéma `salle` contenant quatre tables : `salle.users`,
`salle.workouts`, `salle.sets`, `salle.body_metrics`. Le fichier est rejouable
autant de fois que tu veux : tout est en `if not exists`, rien n'est supprimé.

> **Un schéma dédié, pas `public`.** Une base Neon peut héberger plusieurs de
> tes applications. Une table `users` dans `public` entre alors en collision
> avec celle d'un autre projet : au mieux la création échoue sur une clé
> étrangère (`foreign key constraint … cannot be implemented`, quand les `id`
> ne sont pas du même type), au pire les comptes se mélangent. Ranger cette app
> dans `salle` la rend inoffensive pour ses voisines — et réciproquement.
> Toutes les requêtes de `api/` qualifient leurs tables en conséquence.

> **Un bloc `DO $$ … $$`, pas une suite d'instructions.** Le SQL Editor de Neon
> envoie l'onglet comme une requête préparée, et Postgres rejette alors
> plusieurs commandes séparées par `;` — « cannot insert multiple commands into
> a prepared statement ». Le bloc n'en envoie qu'une seule. Ça ne change rien
> pour `psql`, qui exécute le fichier tel quel.

---

## 3. Brancher l'app sur ta base

```bash
cp .env.example .env
```

Puis remplis les deux variables :

| Variable | Où la trouver |
|---|---|
| `DATABASE_URL` | Neon → ton projet → **Connection string**, version *pooled* |
| `AUTH_SECRET` | à générer toi-même : `openssl rand -base64 32` |

Ces deux variables n'ont **pas** le préfixe `VITE_`, et il ne faut pas l'ajouter :
c'est précisément ce préfixe qui ferait embarquer leur valeur dans le JavaScript
envoyé au navigateur. Elles doivent rester côté serveur.

### Lancer en local

```bash
npm run dev
```

Ce script utilise `vercel dev`, qui sert à la fois le front Vite et les fonctions
du dossier `api/` — un simple `vite` ne servirait que le front, et tous les
appels `/api/…` renverraient 404. La première exécution demande de lier le
dossier à un projet Vercel.

`npm run dev:ui` lance Vite seul, utile pour travailler sur du CSS sans base.

---

## 4. Déployer

```bash
npm i -g vercel
vercel
```

Puis, dans le dashboard Vercel → **Settings → Environment Variables**, ajoute
`DATABASE_URL` et `AUTH_SECRET` (si tu as créé la base depuis l'onglet Storage,
`DATABASE_URL` y est déjà), et redéploie.

Une fois déployé, ouvre le site sur ton téléphone et **ajoute-le à l'écran
d'accueil** : il s'ouvrira en plein écran comme une application.

### Créer ton compte

À la première visite, clique sur **Créer un compte**. Il n'y a pas de validation
par email : le compte est actif immédiatement. Si l'app est publique, n'importe
qui peut donc en créer un — les données de chacun restent cloisonnées, mais si tu
veux rester seul utilisateur, supprime la route [`api/auth/signup.js`](api/auth/signup.js)
une fois ton compte créé.

### Mot de passe oublié

Il n'y a pas de procédure de réinitialisation par email, et les mots de passe ne
sont pas récupérables : la base ne contient que des hashs bcrypt, qui sont à sens
unique. Trois façons de s'en sortir, de la plus simple à la plus prudente.

**Si le compte est vide** — supprime-le depuis le SQL Editor de Neon, puis refais
« Créer un compte » sur le site :

```sql
delete from salle.users where email = 'toi@exemple.com';
```

⚠️ À ne pas faire si tu as des séances : `salle.workouts.user_id` est en
`on delete cascade`, tout l'historique partirait avec.

**Si tu as des séances** — réécris seulement le hash, toujours depuis le SQL
Editor. Postgres sait générer un hash bcrypt, que l'app vérifie sans souci :

```sql
create extension if not exists pgcrypto;
update salle.users set password_hash = crypt('nouveau-mot-de-passe', gen_salt('bf', 10))
where email = 'toi@exemple.com';
```

**Si tu préfères que le mot de passe ne transite pas par l'éditeur SQL** (où il
peut rester dans l'historique des requêtes), le même résultat depuis ta machine :

```bash
vercel env pull .env                                        # récupère DATABASE_URL
node --env-file=.env scripts/set-password.mjs toi@exemple.com nouveau-mot-de-passe
```

Les deux dernières méthodes conservent tes séances : c'est le `user_id` qui les
relie au compte, et il ne change pas.

---

## L'API

Toutes les routes exigent une session valide, sauf `signup` et `login`.

| Route | Méthodes | Rôle |
|---|---|---|
| `/api/auth/signup` | `POST` | Crée un compte et ouvre la session |
| `/api/auth/login` | `POST` | Ouvre la session |
| `/api/auth/logout` | `POST` | Ferme la session |
| `/api/auth/me` | `GET` | Utilisateur courant, ou `null` |
| `/api/workouts` | `GET` `POST` | Liste (60 dernières) · crée la séance du jour |
| `/api/workouts/:id` | `DELETE` | Supprime une séance et ses séries |
| `/api/sets` | `GET` `POST` | Filtre `?exercises=` ou `?workouts=` · enregistre une série |
| `/api/sets/:id` | `PATCH` `DELETE` | Modifie · supprime une série |
| `/api/body-metrics` | `GET` `PUT` | Liste · enregistre une mesure (une par jour) |
| `/api/steps` | `POST` | Enregistre les pas du jour — jeton, pas de session (voir ci-dessous) |

---

## Récupérer tes pas depuis l'iPhone

Apple Santé n'expose rien au web : aucun site, même ajouté à l'écran d'accueil,
ne peut lire tes pas. On inverse donc le sens — c'est le téléphone qui les
envoie, une fois par jour, via l'app **Raccourcis** (préinstallée).

### Côté serveur

Ajoute deux variables d'environnement, en local dans `.env` et sur Vercel dans
**Settings → Environment Variables** :

| Variable | Valeur |
|---|---|
| `STEPS_TOKEN` | un secret que tu génères : `openssl rand -base64 24` |
| `STEPS_EMAIL` | l'email de ton compte, celui que les pas doivent alimenter |

Puis redéploie. Tant que ces variables sont absentes, `/api/steps` refuse toute
écriture (503) et le reste de l'app n'est pas affecté.

Si ta base date d'avant cette fonctionnalité, rejoue [`db/schema.sql`](db/schema.sql)
dans le SQL Editor de Neon : il ajoute la colonne `steps` sans toucher à tes
données.

### Côté iPhone

Dans **Raccourcis → Automatisation → + → Heure du jour**, règle 23 h 50, tous les
jours, et décoche « Demander avant d'exécuter ». Puis trois actions :

1. **Rechercher les échantillons de santé** — Type : `Pas`, Période : `Aujourd'hui`,
   Calculer : `Somme`
2. **Format de date** (sur la Date du jour) — format personnalisé `yyyy-MM-dd`
3. **Obtenir le contenu de l'URL** — `https://TON-SITE.vercel.app/api/steps`
   - Méthode : `POST`
   - En-têtes : `Authorization` = `Bearer TON_STEPS_TOKEN`
   - Corps de la requête : `JSON`, avec deux champs :
     - `steps` (nombre) → le résultat de l'étape 1
     - `date` (texte) → le résultat de l'étape 2

La date est facultative — sans elle, le serveur retient son jour courant en UTC,
ce qui décale l'enregistrement si tu déclenches le raccourci tard le soir. Autant
l'envoyer.

Pour vérifier sans attendre 23 h 50, exécute le raccourci à la main : l'onglet
**Corps → Pas** doit afficher la valeur du jour. En ligne de commande :

```bash
curl -X POST https://TON-SITE.vercel.app/api/steps \
  -H "Authorization: Bearer TON_STEPS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"steps": 9411, "date": "2026-08-16"}'
```

Le jeton ne donne accès qu'à l'écriture des pas du compte `STEPS_EMAIL` : il ne
permet ni de lire tes séances, ni de modifier ton poids ou tes mensurations. Les
gardes de la route se testent sans base avec `npm run test:steps`.

Les pas ne sont pas saisissables à la main dans l'app : ils n'apparaissent donc
pas dans le formulaire « Nouvelle mesure », et enregistrer un poids ne les efface
jamais — les deux routes écrivent des colonnes distinctes de la même ligne.

---

## Adapter le programme

Tout est dans [`src/program.js`](src/program.js) : séances, exercices, séries,
fourchettes de reps, RPE, temps de repos, muscles ciblés et consignes techniques.

⚠️ **Ne renomme pas les clés `key` des exercices.** Elles relient tes données
historiques aux exercices ; les changer coupe tes courbes de progression. Le
libellé `name` en revanche peut être modifié librement.

Pour ajouter un exercice, copie un bloc existant et donne-lui une clé inédite :

```js
{
  key: 'nouvel_exo',           // unique et définitif
  name: 'Nom affiché',
  sets: 3, reps: '8-10', rpe: '8', rest: 120,   // rest en secondes
  muscles: 'Primaire · secondaires',
  cue: 'La consigne technique.',
  star: true,                  // marque les exercices prioritaires
}
```

## Adapter les fiches muscles

Les fiches de l'onglet **Muscles** sont dans [`src/muscles.js`](src/muscles.js), séparées
du programme. Chaque fiche liste des clés d'exercices dans son champ `exercises` :
c'est ce qui affiche « Dans ton programme » sous la fiche.

```js
{
  key: 'grand_pectoral',
  region: 'poitrine',          // une des clés de REGIONS, sert aux filtres
  name: 'Grand pectoral',
  aka: 'les « pecs »',         // facultatif
  where: 'Où il se situe.',
  action: 'Ce qu\'il fait bouger.',
  parts: [                     // facultatif — faisceaux ou chefs, repliés par défaut
    { name: 'Faisceau claviculaire (haut)', text: '…' },
  ],
  tip: 'La remarque pratique.',
  exercises: ['dc_barre', 'dips'],   // clés de src/program.js
}
```

Si tu retires un exercice du programme, sa clé est simplement ignorée ici : la fiche
continue de s'afficher sans lui.

## Notes techniques

- **Stack** : React 19 + Vite, fonctions serverless Vercel, Neon (Postgres), Recharts.
- **Sessions** : JWT signé (HS256) dans un cookie `httpOnly` `SameSite=Lax`, valable
  60 jours. Invisible au JavaScript de la page, donc inexploitable par une injection
  de script.
- **Mots de passe** : hachés avec bcrypt (coût 10). Une tentative de connexion sur un
  email inconnu compare quand même un hash factice, pour que le temps de réponse ne
  révèle pas quels comptes existent.
- **Types SQL** : les colonnes `numeric` et `date` sont castées en `float8` / `text`
  dans les requêtes. Sans ça, Postgres renvoie les charges en chaînes de caractères
  et les comparaisons de progression (`s.weight > cur.top`) deviennent lexicographiques.
- **Graphiques** : une seule série par graphique, jamais deux axes Y. La couleur
  de série (`--series-1`) est validée pour le contraste et la lisibilité en vision
  des couleurs déficiente, en mode clair comme en mode sombre.
- **Mise à jour automatique** : une app ajoutée à l'écran d'accueil iOS ne se recharge
  pas toute seule — Safari restaure la page telle quelle, parfois pendant des jours.
  [`src/useAppUpdate.js`](src/useAppUpdate.js) compare le bundle qui tourne à celui
  qu'annonce le `index.html` déployé (Vite renomme le fichier à chaque build). Au
  démarrage, ou au retour au premier plan après plus de 30 minutes, la page se
  recharge sans rien demander. Pendant une séance, elle propose seulement — un
  rechargement effacerait les charges tapées mais pas encore validées.
- **Thème sombre** automatique selon le réglage du système.
- **1RM estimé** : formule d'Epley, ignorée au-delà de 12 répétitions où
  l'estimation devient trop imprécise.
- Le mode démo (`npm run demo`) n'écrit rien : les validations de séries ne sont
  pas persistées.
