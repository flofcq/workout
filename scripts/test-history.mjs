// Vérifie le regroupement des séries par séance, sans base ni navigateur.
//
//   node scripts/test-history.mjs

import { groupSessions, fmtSetsLine, sessionTonnage } from '../src/history.js'

let echecs = 0
function check(nom, cond) {
  if (!cond) echecs++
  console.log(`${cond ? '✓' : '✗'} ${nom}`)
}

const sets = [
  { workout_id: 'w2', performed_at: '2026-08-18', set_index: 1, weight: 87.5, reps: 5, warmup: false },
  { workout_id: 'w2', performed_at: '2026-08-18', set_index: 0, weight: 87.5, reps: 6, warmup: false },
  { workout_id: 'w2', performed_at: '2026-08-18', set_index: 0, weight: 50, reps: 8, warmup: true },
  { workout_id: 'w1', performed_at: '2026-08-11', set_index: 0, weight: 85, reps: 6, warmup: false },
  { workout_id: 'w3', performed_at: '2026-08-25', set_index: 0, weight: 90, reps: 5, warmup: false },
]

{
  const sessions = groupSessions(sets)
  check('trois séances', sessions.length === 3)
  check('plus récente en tête', sessions[0].date === '2026-08-25')
  check('plus ancienne en queue', sessions[2].date === '2026-08-11')
  check('séries de travail triées', fmtSetsLine(sessions[1].working) === '87.5×6  ·  87.5×5')
  check('échauffement à part', sessions[1].warmups.length === 1 && sessions[1].working.length === 2)
  check('tonnage hors échauffement', sessionTonnage(sessions[1].working) === Math.round(87.5 * 6 + 87.5 * 5))
}

{
  const sessions = groupSessions(sets, { before: '2026-08-25' })
  check('filtre before exclut le jour affiché', sessions.length === 2 && sessions[0].date === '2026-08-18')
}

{
  const vide = groupSessions([{ workout_id: 'w', performed_at: '2026-08-01', set_index: 0, weight: 40, reps: 8, warmup: true }])
  check('séance d’échauffement seul conservée', vide.length === 1 && vide[0].working.length === 0)
}

console.log(echecs ? `\n${echecs} échec(s)` : '\nTout est vert.')
process.exit(echecs ? 1 : 0)
