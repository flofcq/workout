import { sql } from '../_lib/db.js'
import { requireUser } from '../_lib/auth.js'
import { handler, num } from '../_lib/http.js'

export default handler({
  async GET(req, res) {
    const user = await requireUser(req, res)
    if (!user) return

    const rows = await sql`
      select id, date::text as date, weight::float8 as weight, chest::float8 as chest,
             waist::float8 as waist, arm::float8 as arm, thigh::float8 as thigh,
             steps, notes
      from body_metrics
      where user_id = ${user.id}
      order by date asc
    `
    return res.status(200).json({ entries: rows })
  },

  /**
   * Une seule mesure par jour : ré-enregistrer la même date écrase la
   * précédente. `steps` est absente de la liste des colonnes mises à jour,
   * et c'est volontaire : les pas viennent du raccourci iOS (api/steps), une
   * saisie de poids ne doit pas les effacer.
   */
  async PUT(req, res) {
    const user = await requireUser(req, res)
    if (!user) return

    const b = req.body || {}
    if (!b.date) return res.status(400).json({ error: 'date requise' })

    const rows = await sql`
      insert into body_metrics (user_id, date, weight, chest, waist, arm, thigh)
      values (${user.id}, ${b.date}, ${num(b.weight)}, ${num(b.chest)},
              ${num(b.waist)}, ${num(b.arm)}, ${num(b.thigh)})
      on conflict (user_id, date)
        do update set weight = excluded.weight,
                      chest  = excluded.chest,
                      waist  = excluded.waist,
                      arm    = excluded.arm,
                      thigh  = excluded.thigh
      returning id, date::text as date, weight::float8 as weight, chest::float8 as chest,
             waist::float8 as waist, arm::float8 as arm, thigh::float8 as thigh,
             steps, notes
    `
    return res.status(200).json({ entry: rows[0] })
  },
})
