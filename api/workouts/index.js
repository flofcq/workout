import { sql } from '../_lib/db.js'
import { requireUser } from '../_lib/auth.js'
import { handler } from '../_lib/http.js'

export default handler({
  async GET(req, res) {
    const user = await requireUser(req, res)
    if (!user) return

    const rows = await sql`
      select id, day_key, date::text as date, notes
      from workouts
      where user_id = ${user.id}
      order by date desc
      limit 60
    `
    return res.status(200).json({ workouts: rows })
  },

  async POST(req, res) {
    const user = await requireUser(req, res)
    if (!user) return

    const dayKey = String(req.body?.day_key || '')
    const date = String(req.body?.date || '')
    if (!dayKey || !date) {
      return res.status(400).json({ error: 'day_key et date sont requis' })
    }

    // La séance du jour peut déjà exister (deux onglets ouverts, double clic).
    // L'upsert renvoie la ligne existante au lieu d'échouer sur la contrainte.
    const rows = await sql`
      insert into workouts (user_id, day_key, date)
      values (${user.id}, ${dayKey}, ${date})
      on conflict (user_id, day_key, date)
        do update set day_key = excluded.day_key
      returning id, day_key, date::text as date, notes
    `
    return res.status(200).json({ workout: rows[0] })
  },
})
