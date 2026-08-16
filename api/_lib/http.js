/**
 * Toutes ces erreurs sont des problèmes d'installation, pas des bugs. Les
 * nommer fait gagner un aller-retour dans les logs, et ne divulgue rien :
 * on renvoie une consigne, jamais le message Postgres brut (qui contient
 * des noms de tables et de colonnes).
 */
const SETUP_ERRORS = {
  // relation inexistante — le schéma n'a jamais été appliqué, ou l'a été sur
  // une autre branche Neon que celle pointée par DATABASE_URL.
  '42P01': "La base ne contient pas les tables de l'application. Exécute db/schema.sql dans le SQL Editor de Neon, sur la branche pointée par DATABASE_URL.",
  // colonne inexistante — schéma partiel ou d'une version antérieure.
  '42703': 'Le schéma de la base est incomplet. Rejoue db/schema.sql : il est écrit en « if not exists » et ne supprime rien.',
  '3D000': "La base nommée dans DATABASE_URL n'existe pas.",
  '28P01': 'Identifiants refusés par la base : DATABASE_URL est erronée ou expirée.',
  '28000': 'Connexion refusée par la base : vérifie DATABASE_URL.',
}

/**
 * Aiguille une requête vers le handler correspondant à sa méthode, et
 * transforme toute exception en 500 JSON — sans laisser fuiter le détail
 * de l'erreur Postgres vers le navigateur.
 *
 *   export default handler({ GET: ..., POST: ... })
 */
export function handler(routes) {
  const allowed = Object.keys(routes)

  return async function (req, res) {
    const route = routes[req.method]
    if (!route) {
      res.setHeader('Allow', allowed.join(', '))
      return res.status(405).json({ error: `Méthode ${req.method} non autorisée` })
    }
    try {
      return await route(req, res)
    } catch (err) {
      // La stack complète va dans les logs Vercel ; seul un message sûr sort.
      console.error(`${req.method} ${req.url} —`, err)
      if (res.headersSent) return

      const setup = SETUP_ERRORS[err?.code]
      if (setup) return res.status(500).json({ error: setup, code: err.code })

      // Échec réseau vers Neon : pas de code SQLSTATE, la requête n'a jamais
      // atteint la base.
      if (err?.name === 'NeonDbError' && !err.code) {
        return res.status(500).json({ error: 'La base est injoignable. Vérifie DATABASE_URL et que le projet Neon est actif.' })
      }

      // Le code SQLSTATE seul (5 caractères) ne divulgue rien, et suffit à
      // identifier la panne sans avoir à ouvrir les logs.
      return res.status(500).json({ error: 'Erreur serveur', code: err?.code })
    }
  }
}

/** Lit un champ numérique optionnel : '' et null deviennent null. */
export function num(value) {
  if (value === '' || value == null) return null
  const n = Number(String(value).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
