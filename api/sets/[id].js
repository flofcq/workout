import { sql } from '../_lib/db.js'
import { requireUser } from '../_lib/auth.js'
import { handler, num } from '../_lib/http.js'

export default handler({
  async PATCH(req, res) {
    const user = await requireUser(req, res)
    if (!user) return

    const b = req.body || {}
    const rows = await sql`
      update salle.sets
      set weight = ${num(b.weight)},
          reps   = ${num(b.reps)},
          rpe    = ${num(b.rpe)}
      where id = ${req.query.id} and user_id = ${user.id}
      returning id, workout_id, exercise_key, set_index,
                 weight::float8 as weight, reps, rpe::float8 as rpe,
                 performed_at::text as performed_at
    `
    if (!rows.length) return res.status(404).json({ error: 'Série introuvable' })
    return res.status(200).json({ set: rows[0] })
  },

  async DELETE(req, res) {
    const user = await requireUser(req, res)
    if (!user) return

    const rows = await sql`
      delete from salle.sets
      where id = ${req.query.id} and user_id = ${user.id}
      returning id
    `
    if (!rows.length) return res.status(404).json({ error: 'Série introuvable' })
    return res.status(200).json({ ok: true })
  },
})
