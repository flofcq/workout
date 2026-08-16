/**
 * Définit le mot de passe d'un compte, sans toucher à ses données.
 *
 * L'app n'a pas de « mot de passe oublié » — ça demanderait un service
 * d'envoi d'emails. Ce script est le remplacement : il écrase le hash
 * directement en base. Il crée le compte s'il n'existe pas encore.
 *
 * Usage :
 *   node --env-file=.env scripts/set-password.mjs <email> <mot-de-passe>
 *
 * Contrairement à une suppression / recréation du compte, les séances
 * restent en place : elles sont liées au user_id, qui ne change pas.
 */
import bcrypt from 'bcryptjs'
import { neon } from '@neondatabase/serverless'

const [email, password] = process.argv.slice(2)

if (!email || !password) {
  console.error('Usage : node --env-file=.env scripts/set-password.mjs <email> <mot-de-passe>')
  process.exit(1)
}
if (password.length < 8) {
  console.error('Le mot de passe doit faire 8 caractères minimum.')
  process.exit(1)
}

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL
if (!connectionString) {
  console.error(
    'DATABASE_URL introuvable. Lance le script avec --env-file=.env, ou récupère\n' +
      'la connection string depuis Vercel :  vercel env pull .env'
  )
  process.exit(1)
}

const sql = neon(connectionString)
const normalized = email.trim().toLowerCase()
const hash = await bcrypt.hash(password, 10)

const updated = await sql`
  update salle.users set password_hash = ${hash} where email = ${normalized} returning id
`

if (updated.length) {
  const [{ count }] = await sql`
    select count(*)::int as count from salle.workouts where user_id = ${updated[0].id}
  `
  console.log(`✓ Mot de passe redéfini pour ${normalized}`)
  console.log(`  ${count} séance(s) conservée(s).`)
} else {
  await sql`insert into salle.users (email, password_hash) values (${normalized}, ${hash})`
  console.log(`✓ Compte créé pour ${normalized} (il n'existait pas encore).`)
}

console.log('\nTu peux maintenant te connecter avec ce mot de passe.')
