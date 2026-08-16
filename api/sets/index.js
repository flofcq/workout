import { sql } from '../_lib/db.js'
import { requireUser } from '../_lib/auth.js'
import { handler, num } from '../_lib/http.js'

const csv = (v) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean)

export default handler({
  /**
   * Filtres possibles (exclusifs) :
   *   ?exercises=dc_barre,di_halteres  — pour l'onglet Séance et Progression
   *   ?workouts=<uuid>,<uuid>          — pour l'onglet Historique
   *
   * Tri constant : performed_at décroissant puis set_index croissant. Les
   * trois vues qui consomment cette route s'en accommodent — Séance a besoin
   * du décroissant pour retrouver la dernière performance, les deux autres
   * retrient en JS.
   */
  async GET(req, res) {
    const user = await requireUser(req, res)
    if (!user) return

    const exercises = csv(req.query.exercises)
    const workouts = csv(req.query.workouts)

    if (!exercises.length && !workouts.length) {
      return res.status(400).json({ error: 'Filtre exercises ou workouts requis' })
    }

    const rows = exercises.length
      ? await sql`
          select id, workout_id, exercise_key, set_index,
                 weight::float8 as weight, reps, rpe::float8 as rpe,
                 performed_at::text as performed_at
          from salle.sets
          where user_id = ${user.id} and exercise_key = any(${exercises})
          order by performed_at desc, set_index asc
          limit 600
        `
      : await sql`
          select id, workout_id, exercise_key, set_index,
                 weight::float8 as weight, reps, rpe::float8 as rpe,
                 performed_at::text as performed_at
          from salle.sets
          where user_id = ${user.id} and workout_id = any(${workouts}::uuid[])
          order by performed_at desc, set_index asc
          limit 2000
        `

    return res.status(200).json({ sets: rows })
  },

  async POST(req, res) {
    const user = await requireUser(req, res)
    if (!user) return

    const b = req.body || {}
    if (!b.workout_id || !b.exercise_key || b.set_index == null) {
      return res
        .status(400)
        .json({ error: 'workout_id, exercise_key et set_index sont requis' })
    }

    // La séance doit appartenir à l'utilisateur, sinon on écrirait des séries
    // dans la séance de quelqu'un d'autre.
    const owner = await sql`
      select id from salle.workouts where id = ${b.workout_id} and user_id = ${user.id}
    `
    if (!owner.length) return res.status(404).json({ error: 'Séance introuvable' })

    const rows = await sql`
      insert into salle.sets
        (user_id, workout_id, exercise_key, set_index, weight, reps, rpe, performed_at)
      values
        (${user.id}, ${b.workout_id}, ${b.exercise_key}, ${Number(b.set_index)},
         ${num(b.weight)}, ${num(b.reps)}, ${num(b.rpe)}, ${b.performed_at})
      on conflict (workout_id, exercise_key, set_index)
        do update set weight = excluded.weight,
                      reps   = excluded.reps,
                      rpe    = excluded.rpe
      returning id, workout_id, exercise_key, set_index,
                 weight::float8 as weight, reps, rpe::float8 as rpe,
                 performed_at::text as performed_at
    `
    return res.status(201).json({ set: rows[0] })
  },
})
