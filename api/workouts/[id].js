import { sql } from '../_lib/db.js'
import { requireUser } from '../_lib/auth.js'
import { handler } from '../_lib/http.js'

export default handler({
  async DELETE(req, res) {
    const user = await requireUser(req, res)
    if (!user) return

    // Le `and user_id` n'est pas décoratif : sans lui, n'importe quel compte
    // connecté pourrait supprimer la séance d'un autre en devinant son id.
    // Les séries associées partent avec, via le on delete cascade.
    const rows = await sql`
      delete from workouts
      where id = ${req.query.id} and user_id = ${user.id}
      returning id
    `
    if (!rows.length) return res.status(404).json({ error: 'Séance introuvable' })
    return res.status(200).json({ ok: true })
  },
})
