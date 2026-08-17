import { sql } from '../_lib/db.js'
import { requireUser } from '../_lib/auth.js'
import { handler } from '../_lib/http.js'

export default handler({
  /**
   * Début et fin de séance. Chaque champ accepte trois valeurs :
   *   'now'  → horodatage serveur
   *   null   → effacé (reprendre une séance terminée)
   *   absent → inchangé
   *
   * L'horodatage vient du serveur et jamais du navigateur : une horloge de
   * téléphone déréglée donnerait des durées fantaisistes.
   */
  async PATCH(req, res) {
    const user = await requireUser(req, res)
    if (!user) return

    const b = req.body || {}
    const stamp = (v) => (v === 'now' ? new Date().toISOString() : v === null ? null : undefined)
    const started = stamp(b.started_at)
    const ended = stamp(b.ended_at)

    if (started === undefined && ended === undefined) {
      return res.status(400).json({ error: 'started_at ou ended_at requis' })
    }

    // Un `case when` par colonne : le driver ne compose pas les requêtes, mais
    // un booléen en paramètre suffit à décider si la colonne est réécrite ou
    // laissée telle quelle.
    const rows = await sql`
      update salle.workouts
      set started_at = case when ${started !== undefined}
                            then ${started ?? null}::timestamptz else started_at end,
          ended_at   = case when ${ended !== undefined}
                            then ${ended ?? null}::timestamptz else ended_at end
      where id = ${req.query.id} and user_id = ${user.id}
      returning id, day_key, date::text as date, notes, started_at, ended_at
    `
    if (!rows.length) return res.status(404).json({ error: 'Séance introuvable' })
    return res.status(200).json({ workout: rows[0] })
  },

  async DELETE(req, res) {
    const user = await requireUser(req, res)
    if (!user) return

    // Le `and user_id` n'est pas décoratif : sans lui, n'importe quel compte
    // connecté pourrait supprimer la séance d'un autre en devinant son id.
    // Les séries associées partent avec, via le on delete cascade.
    const rows = await sql`
      delete from salle.workouts
      where id = ${req.query.id} and user_id = ${user.id}
      returning id
    `
    if (!rows.length) return res.status(404).json({ error: 'Séance introuvable' })
    return res.status(200).json({ ok: true })
  },
})
