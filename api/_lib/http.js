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
      console.error(`${req.method} ${req.url} —`, err)
      if (res.headersSent) return
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }
}

/** Lit un champ numérique optionnel : '' et null deviennent null. */
export function num(value) {
  if (value === '' || value == null) return null
  const n = Number(String(value).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
