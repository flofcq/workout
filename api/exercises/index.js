import { sql } from '../_lib/db.js'
import { requireUser } from '../_lib/auth.js'
import { handler } from '../_lib/http.js'

export default handler({
  /**
   * Les exercices hors programme déjà enregistrés par ce compte — ceux saisis
   * quand une machine était occupée. Le front en a besoin pour les proposer à
   * nouveau (onglet Séance) et pour tracer leur progression, deux endroits où
   * src/program.js ne peut rien dire puisqu'il ne les connaît pas.
   *
   * `max(exercise_name)` plutôt que `distinct` sur les deux colonnes : si le
   * libellé a varié entre deux séances (accent, majuscule), la clé reste la
   * même et on ne veut qu'une entrée par clé.
   */
  async GET(req, res) {
    const user = await requireUser(req, res)
    if (!user) return

    const rows = await sql`
      select exercise_key,
             max(exercise_name)     as exercise_name,
             count(*)::int          as sets_count,
             max(performed_at)::text as last_performed_at
      from salle.sets
      where user_id = ${user.id} and exercise_name is not null
      group by exercise_key
      order by max(performed_at) desc
    `
    return res.status(200).json({ exercises: rows })
  },
})
