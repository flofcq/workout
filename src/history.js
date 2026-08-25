// Regroupe des séries par séance. Les trois vues (Séance, Progression,
// Historique) ont besoin de la même découpe : une ligne par workout, les
// montées en charge à part — elles ne sont pas une performance.

export function groupSessions(sets, { before } = {}) {
  const order = []
  const byId = new Map()

  for (const s of sets) {
    if (before && s.performed_at >= before) continue
    const id = s.workout_id || s.performed_at
    let sess = byId.get(id)
    if (!sess) {
      sess = { id, date: s.performed_at, working: [], warmups: [] }
      byId.set(id, sess)
      order.push(sess)
    }
    ;(s.warmup ? sess.warmups : sess.working).push(s)
  }

  for (const sess of order) {
    sess.working.sort((a, b) => a.set_index - b.set_index)
    sess.warmups.sort((a, b) => a.set_index - b.set_index)
  }

  // La plus récente en tête : c'est l'ordre de lecture naturel, et celui
  // dont la séance se sert pour le rappel « dernière fois ».
  order.sort((a, b) => b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id)))
  return order
}

export function fmtSetsLine(sets) {
  return sets.map((s) => `${s.weight}×${s.reps}`).join('  ·  ')
}

export function sessionTonnage(sets) {
  return Math.round(sets.reduce((n, s) => n + (s.weight || 0) * (s.reps || 0), 0))
}
