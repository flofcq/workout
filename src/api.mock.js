// Client API simulé — sert uniquement à prévisualiser l'interface sans base
// de données. Activé par VITE_DEMO=1. Aucune donnée n'est persistée : les
// écritures renvoient une réponse plausible et sont oubliées au rechargement.

import { toISODate } from './date'

const today = new Date()
const daysAgo = (n) => toISODate(new Date(today.getTime() - n * 86400000))

// Séances passées, avec leur durée : 18 h 30 → 19 h 35 environ.
const withDuration = (date, minutes) => ({
  started_at: `${date}T18:30:00.000Z`,
  ended_at: `${date}T${String(18 + Math.floor((30 + minutes) / 60)).padStart(2, '0')}:${String((30 + minutes) % 60).padStart(2, '0')}:00.000Z`,
})

const workouts = [
  { id: 'w1', day_key: 'j1', date: daysAgo(21), ...withDuration(daysAgo(21), 71) },
  { id: 'w2', day_key: 'j1', date: daysAgo(14), ...withDuration(daysAgo(14), 66) },
  { id: 'w3', day_key: 'j1', date: daysAgo(7), ...withDuration(daysAgo(7), 63) },
  { id: 'w4', day_key: 'j4', date: daysAgo(4), ...withDuration(daysAgo(4), 58) },
]

const sets = [
  // Montées en charge de la dernière séance lourde : elles doivent apparaître
  // dans la séance sans polluer les courbes ni le tonnage.
  ...[[40, 8], [60, 5], [75, 3]].map(([kg, reps], i) => ({
    id: `w3-dc-w${i}`, workout_id: 'w3', exercise_key: 'dc_barre', set_index: i,
    weight: kg, reps, rpe: null, warmup: true, performed_at: daysAgo(7),
  })),
  ...[
    ['w1', 21, 82.5], ['w2', 14, 85], ['w3', 7, 87.5],
  ].flatMap(([w, d, kg]) =>
    [0, 1, 2, 3].map((i) => ({
      id: `${w}-dc-${i}`, workout_id: w, exercise_key: 'dc_barre', set_index: i,
      weight: kg, reps: 6 - (i > 1 ? 1 : 0), rpe: 8, performed_at: daysAgo(d),
    }))
  ),
  ...[
    ['w1', 21, 30], ['w2', 14, 30], ['w3', 7, 32.5],
  ].flatMap(([w, d, kg]) =>
    [0, 1, 2].map((i) => ({
      id: `${w}-di-${i}`, workout_id: w, exercise_key: 'di_halteres', set_index: i,
      weight: kg, reps: 10 - i, rpe: 8, performed_at: daysAgo(d),
    }))
  ),
  ...[0, 1, 2, 3].map((i) => ({
    id: `w4-dib-${i}`, workout_id: 'w4', exercise_key: 'di_barre', set_index: i,
    weight: 62.5, reps: 8 - (i > 1 ? 1 : 0), rpe: 8, performed_at: daysAgo(4),
  })),
  // Exercice ajouté en séance faute de machine : porte son libellé, puisque
  // program.js ne le connaît pas.
  ...[['w3', 7, 120], ['w4', 4, 130]].flatMap(([w, d, kg]) =>
    [0, 1, 2].map((i) => ({
      id: `${w}-libre-${i}`, workout_id: w, exercise_key: 'libre_presse_horizontale',
      exercise_name: 'Presse à cuisses horizontale', set_index: i,
      weight: kg, reps: 12 - i, rpe: 8, performed_at: daysAgo(d),
    }))
  ),
]

const measures = [24, 17, 10, 3].map((d, i) => ({
  id: `b${i}`, date: daysAgo(d),
  weight: [84.2, 83.4, 82.9, 82.1][i],
  chest: [104, 104, 103.5, 103.5][i],
  waist: [88, 87, 86.5, 85.5][i],
  arm: [38.5, 38.5, 38, 38][i],
  thigh: [60, 59.5, 59.5, 59][i],
}))

// Les pas arrivent chaque jour du raccourci iOS, indépendamment des pesées :
// certains jours n'ont donc que cette valeur-là.
const steps = [11240, 7980, 9310, 13470, 6120, 8850, 10730, 9040, 12360, 7410, 9880, 8210]
  .map((n, i) => ({ id: `s${i}`, date: daysAgo(12 - i), steps: n }))

const body = [...measures, ...steps]
  .reduce((acc, row) => {
    const same = acc.find((x) => x.date === row.date)
    if (same) Object.assign(same, row)
    else acc.push({ ...row })
    return acc
  }, [])
  .sort((a, b) => a.date.localeCompare(b.date))

const ok = (value) => Promise.resolve(value)

// Séances démarrées pendant la session de démo, oubliées au rechargement.
const started = {}

// Même tri que la vraie route /api/sets, dont la vue Séance dépend pour
// retrouver la dernière performance.
const sorted = (list) =>
  [...list].sort(
    (a, b) => b.performed_at.localeCompare(a.performed_at) || a.set_index - b.set_index
  )

export const mockApi = {
  auth: {
    me: () => ok({ id: 'demo', email: 'demo@exemple.com' }),
    login: () => ok({ id: 'demo', email: 'demo@exemple.com' }),
    signup: () => ok({ id: 'demo', email: 'demo@exemple.com' }),
    logout: () => ok({ ok: true }),
  },

  workouts: {
    list: () =>
      ok([...Object.values(started), ...workouts].sort((a, b) => b.date.localeCompare(a.date))),
    // Même sémantique que la vraie route : créer deux fois la séance du jour
    // renvoie la même, avec son heure de début inchangée.
    create: (dayKey, date) => {
      const k = `${dayKey}:${date}`
      started[k] ||= {
        id: `tmp-${k}`,
        day_key: dayKey,
        date,
        started_at: new Date().toISOString(),
        ended_at: null,
      }
      return ok({ ...started[k] })
    },
    // Renvoie la séance entière, comme le PATCH : un champ absent du corps
    // reste tel quel, il n'est pas effacé.
    update: (id, payload) => {
      const w = Object.values(started).find((x) => x.id === id)
      if (!w) return ok({ id, ...payload })
      for (const field of ['started_at', 'ended_at']) {
        if (payload[field] === undefined) continue
        w[field] = payload[field] === 'now' ? new Date().toISOString() : payload[field]
      }
      return ok({ ...w })
    },
    remove: () => ok({ ok: true }),
  },

  sets: {
    byExercises: (keys) => ok(sorted(sets.filter((s) => keys.includes(s.exercise_key)))),
    byWorkouts: (ids) => ok(sorted(sets.filter((s) => ids.includes(s.workout_id)))),
    // Les écritures ne sont pas persistées, mais on renvoie le nom pour que
    // l'exercice ajouté s'affiche correctement jusqu'au rechargement.
    create: (payload) => ok({ ...payload, id: `tmp-${Math.random().toString(36).slice(2)}` }),
    update: (id, payload) => ok({ ...payload, id }),
    remove: () => ok({ ok: true }),
  },

  // Une machine déjà utilisée hors programme, pour montrer qu'elle est
  // reproposée à l'ajout et suivie dans Progression.
  exercises: {
    custom: () =>
      ok([
        {
          exercise_key: 'libre_presse_horizontale',
          exercise_name: 'Presse à cuisses horizontale',
          sets_count: 6,
          last_performed_at: daysAgo(4),
        },
      ]),
  },

  body: {
    list: () => ok([...body].sort((a, b) => a.date.localeCompare(b.date))),
    save: (payload) => ok({ ...payload, id: `tmp-${payload.date}` }),
  },
}
