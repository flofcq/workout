import { timingSafeEqual } from 'node:crypto'
import { sql } from '../_lib/db.js'
import { handler } from '../_lib/http.js'

// Réception du nombre de pas envoyé par l'app Raccourcis de l'iPhone.
//
// Apple Santé n'expose rien au web : c'est donc le téléphone qui pousse la
// donnée, et pas l'app qui va la chercher. Raccourcis ne sait pas gérer un
// cookie de session httpOnly, cette route s'authentifie donc par un jeton
// porté dans l'en-tête Authorization.
//
// Le jeton n'ouvre l'accès qu'au compte désigné par STEPS_EMAIL, et cette
// route n'écrit que la colonne `steps` : elle ne peut ni lire tes séances,
// ni toucher à ton poids ou à tes mensurations.

const TOKEN = process.env.STEPS_TOKEN
const EMAIL = process.env.STEPS_EMAIL?.trim().toLowerCase()

const MAX_STEPS = 200000 // Le record du monde sur 24 h est très en dessous.

function tokenMatches(given) {
  if (!given || !TOKEN) return false
  const a = Buffer.from(given)
  const b = Buffer.from(TOKEN)
  // timingSafeEqual exige des tampons de même taille. Comparer les longueurs
  // d'abord ne révèle rien d'utile : seul le contenu est secret.
  return a.length === b.length && timingSafeEqual(a, b)
}

function bearerToken(req) {
  const header = req.headers.authorization || ''
  return header.startsWith('Bearer ') ? header.slice(7).trim() : null
}

/** Raccourcis n'envoie pas toujours un Content-Type que la plateforme parse. */
function readBody(req) {
  if (typeof req.body === 'string') return JSON.parse(req.body)
  return req.body || {}
}

export default handler({
  async POST(req, res) {
    if (!TOKEN || !EMAIL) {
      return res
        .status(503)
        .json({ error: 'Ingestion des pas non configurée (STEPS_TOKEN, STEPS_EMAIL)' })
    }
    if (!tokenMatches(bearerToken(req))) {
      return res.status(401).json({ error: 'Jeton invalide' })
    }

    let body
    try {
      body = readBody(req)
    } catch {
      return res.status(400).json({ error: 'Corps de requête JSON invalide' })
    }

    // Raccourcis renvoie parfois un nombre à virgule pour une somme d'échantillons.
    const steps = Math.round(Number(body.steps))
    if (!Number.isFinite(steps) || steps < 0 || steps > MAX_STEPS) {
      return res.status(400).json({ error: `steps doit être un nombre entre 0 et ${MAX_STEPS}` })
    }

    // Date facultative : sans elle, c'est le jour courant côté base. Le
    // raccourci a intérêt à l'envoyer, sa notion de « aujourd'hui » étant
    // celle de ton fuseau, pas celle du serveur.
    const date = typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date)
      ? body.date
      : null

    const owner = await sql`select id from salle.users where email = ${EMAIL}`
    if (!owner.length) return res.status(404).json({ error: 'Compte introuvable' })

    // On n'écrit que `steps` : le poids et les mensurations du même jour,
    // saisis dans l'app, ne sont pas touchés.
    const rows = await sql`
      insert into salle.body_metrics (user_id, date, steps)
      values (${owner[0].id}, coalesce(${date}::date, current_date), ${steps})
      on conflict (user_id, date)
        do update set steps = excluded.steps
      returning date::text as date, steps
    `
    return res.status(200).json(rows[0])
  },
})
