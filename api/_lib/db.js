import { neon } from '@neondatabase/serverless'

// L'intégration Neon de Vercel pose DATABASE_URL ; le connecteur Postgres
// du Marketplace pose POSTGRES_URL. On accepte les deux pour que ça marche
// quelle que soit la façon dont la base a été branchée au projet.
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL

if (!connectionString) {
  throw new Error(
    "DATABASE_URL manquante. Ajoute la variable d'environnement dans Vercel " +
      '(Settings → Environment Variables) ou dans ton .env local.'
  )
}

// Driver HTTP : une requête = un appel HTTPS, sans pool à maintenir.
// C'est le mode adapté aux fonctions serverless, qui sont éphémères.
export const sql = neon(connectionString)
