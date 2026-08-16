# Suivi salle

Application web pour enregistrer tes séances et tes charges, avec le programme
« Priorité pectoraux » pré-chargé.

- **Séance** — les 5 séances du programme, saisie charge / reps / RPE, rappel de ta dernière performance sur chaque exercice, chrono de repos qui démarre tout seul quand tu valides une série.
- **Historique** — toutes tes séances passées, dépliables.
- **Progression** — courbes d'évolution par exercice (charge la plus lourde ou 1RM estimé).
- **Corps** — poids et mensurations dans le temps.

Fonctionne sur téléphone, synchronisé entre appareils via Supabase.

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

1. Va sur [supabase.com](https://supabase.com) et crée un projet gratuit.
2. Dans le menu de gauche, ouvre **SQL Editor** → **New query**.
3. Copie tout le contenu de [`supabase/schema.sql`](supabase/schema.sql), colle-le, clique **Run**.

Ça crée trois tables (`workouts`, `sets`, `body_metrics`) avec les politiques de
sécurité qui garantissent que tu es le seul à voir tes données.

### Autoriser la connexion par email

Dans **Authentication → Sign In / Providers**, vérifie que **Email** est activé.
L'app utilise les liens magiques : pas de mot de passe à retenir.

Dans **Authentication → URL Configuration**, ajoute l'URL de ton site déployé
dans **Redirect URLs** (par exemple `https://suivi-salle.vercel.app/**`), sinon
le lien reçu par mail ne te ramènera pas au bon endroit.

---

## 3. Brancher l'app sur ta base

Dans Supabase, va dans **Project Settings → Data API** et récupère l'URL du projet
et la clé publique `anon`.

```bash
cp .env.example .env
```

Puis remplis :

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

La clé `anon` est publique par nature — c'est normal qu'elle soit visible dans le
navigateur. Ce sont les politiques RLS du schéma qui protègent tes données. Ne
mets **jamais** la clé `service_role` dans ce fichier.

```bash
npm run dev
```

---

## 4. Déployer

### Vercel

```bash
npm i -g vercel
vercel
```

Puis, dans le dashboard Vercel → **Settings → Environment Variables**, ajoute
`VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`, et redéploie.

### Netlify

Build command `npm run build`, publish directory `dist`, et les deux mêmes
variables d'environnement.

Une fois déployé, ouvre le site sur ton téléphone et **ajoute-le à l'écran
d'accueil** : il s'ouvrira en plein écran comme une application.

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

## Notes techniques

- **Stack** : React 19 + Vite, Supabase (Postgres + Auth), Recharts.
- **Graphiques** : une seule série par graphique, jamais deux axes Y. La couleur
  de série (`--series-1`) est validée pour le contraste et la lisibilité en vision
  des couleurs déficiente, en mode clair comme en mode sombre.
- **Thème sombre** automatique selon le réglage du système.
- **1RM estimé** : formule d'Epley, ignorée au-delà de 12 répétitions où
  l'estimation devient trop imprécise.
- Le mode démo (`npm run demo`) n'écrit rien : les validations de séries ne sont
  pas persistées.
