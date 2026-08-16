// Client Supabase simulé — sert uniquement à prévisualiser l'interface
// sans base de données. Activé par VITE_DEMO=1. Aucune donnée n'est persistée.

const today = new Date()
const iso = (d) => d.toISOString().slice(0, 10)
const daysAgo = (n) => iso(new Date(today.getTime() - n * 86400000))

const workouts = [
  { id: 'w1', day_key: 'j1', date: daysAgo(21) },
  { id: 'w2', day_key: 'j1', date: daysAgo(14) },
  { id: 'w3', day_key: 'j1', date: daysAgo(7) },
  { id: 'w4', day_key: 'j4', date: daysAgo(4) },
]

const sets = [
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
]

const body = [24, 17, 10, 3].map((d, i) => ({
  id: `b${i}`, date: daysAgo(d),
  weight: [84.2, 83.4, 82.9, 82.1][i],
  chest: [104, 104, 103.5, 103.5][i],
  waist: [88, 87, 86.5, 85.5][i],
  arm: [38.5, 38.5, 38, 38][i],
  thigh: [60, 59.5, 59.5, 59][i],
}))

const TABLES = { workouts, sets, body_metrics: body }

function builder(table) {
  let rows = [...(TABLES[table] || [])]
  const api = {
    select: () => api,
    eq: (k, v) => { rows = rows.filter((r) => String(r[k]) === String(v)); return api },
    in: (k, vs) => { rows = rows.filter((r) => vs.includes(r[k])); return api },
    order: (k, o) => {
      rows.sort((a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0))
      if (o && o.ascending === false) rows.reverse()
      return api
    },
    limit: () => api,
    maybeSingle: () => Promise.resolve({ data: rows[0] || null, error: null }),
    single: () => Promise.resolve({ data: rows[0] || null, error: null }),
    insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: `tmp-${Math.random()}` }, error: null }) }) }),
    upsert: () => ({ select: () => ({ single: () => Promise.resolve({ data: body[body.length - 1], error: null }) }) }),
    update: () => Promise.resolve({ error: null }),
    delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
    then: (res) => Promise.resolve({ data: rows, error: null }).then(res),
  }
  return api
}

export const mockSupabase = {
  from: builder,
  auth: {
    getSession: () => Promise.resolve({ data: { session: { user: { id: 'demo', email: 'demo@exemple.com' } } } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signOut: () => Promise.resolve({}),
    signInWithOtp: () => Promise.resolve({ error: null }),
  },
}
