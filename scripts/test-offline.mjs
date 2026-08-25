// Vérifie la file hors ligne sans IndexedDB ni navigateur : store mémoire
// et API factice qui peut « tomber ».
//
//   node scripts/test-offline.mjs

import { ApiError } from '../src/apiError.js'
import { isLocalId } from '../src/offline/ids.js'
import { createMemoryStore } from '../src/offline/store.js'
import { wrapOffline } from '../src/offline/wrap.js'

const offlineErr = () => {
  throw new ApiError('Impossible de joindre le serveur', 0)
}

function fakeRemote({ online = true } = {}) {
  const dbWorkouts = []
  const dbSets = []
  let wid = 1
  let sid = 1
  const go = (fn) => {
    if (!online) offlineErr()
    return fn()
  }
  return {
    setOnline(v) {
      online = v
    },
    dbWorkouts,
    dbSets,
    auth: {
      me: () => go(() => ({ id: 'u1', email: 'toi@exemple.com' })),
      login: () => go(() => ({ id: 'u1', email: 'toi@exemple.com' })),
      signup: () => go(() => ({ id: 'u1', email: 'toi@exemple.com' })),
      logout: () => go(() => ({ ok: true })),
    },
    workouts: {
      list: () => go(() => [...dbWorkouts].sort((a, b) => b.date.localeCompare(a.date))),
      create: (dayKey, date) =>
        go(() => {
          const found = dbWorkouts.find((w) => w.day_key === dayKey && w.date === date)
          if (found) return { ...found }
          const w = {
            id: `w${wid++}`,
            day_key: dayKey,
            date,
            notes: null,
            started_at: '2026-08-25T07:00:00.000Z',
            ended_at: null,
          }
          dbWorkouts.push(w)
          return { ...w }
        }),
      update: (id, payload) =>
        go(() => {
          const w = dbWorkouts.find((x) => x.id === id)
          if (!w) throw new ApiError('Séance introuvable', 404)
          if (payload.started_at === 'now') w.started_at = '2026-08-25T07:01:00.000Z'
          if (payload.ended_at === 'now') w.ended_at = '2026-08-25T08:00:00.000Z'
          if (payload.ended_at === null) w.ended_at = null
          return { ...w }
        }),
      remove: (id) =>
        go(() => {
          const i = dbWorkouts.findIndex((w) => w.id === id)
          if (i >= 0) dbWorkouts.splice(i, 1)
        }),
    },
    sets: {
      byExercises: (keys) => go(() => dbSets.filter((s) => keys.includes(s.exercise_key))),
      byWorkouts: (ids) => go(() => dbSets.filter((s) => ids.includes(s.workout_id))),
      create: (payload) =>
        go(() => {
          const s = { ...payload, id: `s${sid++}`, warmup: payload.warmup === true }
          dbSets.push(s)
          return { ...s }
        }),
      update: (id, payload) =>
        go(() => {
          const s = dbSets.find((x) => x.id === id)
          if (!s) throw new ApiError('Série introuvable', 404)
          Object.assign(s, payload)
          return { ...s }
        }),
      remove: (id) =>
        go(() => {
          const i = dbSets.findIndex((s) => s.id === id)
          if (i >= 0) dbSets.splice(i, 1)
        }),
    },
    exercises: { custom: () => go(() => []) },
    body: {
      list: () => go(() => []),
      save: (payload) => go(() => ({ ...payload, id: 'b1', steps: null })),
    },
  }
}

let echecs = 0
function check(nom, cond) {
  if (!cond) echecs++
  console.log(`${cond ? '✓' : '✗'} ${nom}`)
}

{
  const store = createMemoryStore()
  const remote = fakeRemote({ online: false })
  const api = wrapOffline(remote, store)
  let threw = false
  try {
    await api.auth.me()
  } catch (e) {
    threw = e.status === 0
  }
  check('première visite hors ligne sans cache', threw)

  await store.setUser({ id: 'u1', email: 'toi@exemple.com' })
  const user = await api.auth.me()
  check('session mémorisée réouverte hors ligne', user?.email === 'toi@exemple.com')
}

{
  const remote = fakeRemote({ online: true })
  const store = createMemoryStore()
  const api = wrapOffline(remote, store)
  await api.auth.me()
  await api.workouts.list()
  remote.setOnline(false)

  const w = await api.workouts.create('j1', '2026-08-25')
  check('séance locale', isLocalId(w.id) && Boolean(w.started_at))
  const s = await api.sets.create({
    workout_id: w.id,
    exercise_key: 'dc_barre',
    set_index: 0,
    weight: 80,
    reps: 6,
    rpe: 8,
    warmup: false,
    performed_at: '2026-08-25',
  })
  check('série locale', isLocalId(s.id))
  const listed = await api.workouts.list()
  check('liste hors ligne contient la séance', listed.some((x) => x.id === w.id))
  const ofDay = await api.sets.byWorkouts([w.id])
  check('série visible dans la séance', ofDay.some((x) => x.id === s.id && x.weight === 80))

  remote.setOnline(true)
  await api._flush()
  check('file vide après envoi', (await store.listOutbox()).length === 0)
  check('séance créée côté serveur', remote.dbWorkouts.length === 1)
  check('série créée côté serveur', remote.dbSets.length === 1)
  check('série reliée à l’id serveur', remote.dbSets[0].workout_id === remote.dbWorkouts[0].id)
  check('plus d’id local en cache', !(await store.listWorkouts()).some((x) => isLocalId(x.id)))
}

{
  const remote = fakeRemote({ online: false })
  const store = createMemoryStore()
  await store.setUser({ id: 'u1', email: 'toi@exemple.com' })
  const api = wrapOffline(remote, store)
  const w = await api.workouts.create('j1', '2026-08-25')
  const s = await api.sets.create({
    workout_id: w.id,
    exercise_key: 'dc_barre',
    set_index: 0,
    weight: 80,
    reps: 6,
    warmup: false,
    performed_at: '2026-08-25',
  })
  await api.sets.remove(s.id)
  remote.setOnline(true)
  await api._flush()
  check('série annulée jamais envoyée', remote.dbSets.length === 0)
}

{
  const remote = fakeRemote({ online: false })
  const store = createMemoryStore()
  await store.setUser({ id: 'u1', email: 'toi@exemple.com' })
  const api = wrapOffline(remote, store)
  const w = await api.workouts.create('j1', '2026-08-25')
  await api.workouts.update(w.id, { ended_at: 'now' })
  const ops = await store.listOutbox()
  const end = ops.find((o) => o.type === 'workout.update')
  check('file conserve now', end?.payload?.ended_at === 'now')
  remote.setOnline(true)
  await api._flush()
  check('fin horodatée par le serveur', remote.dbWorkouts[0].ended_at === '2026-08-25T08:00:00.000Z')
}

{
  const remote = fakeRemote({ online: true })
  let sawLocal = false
  const orig = remote.sets.byWorkouts
  remote.sets.byWorkouts = (ids) => {
    if (ids.some(isLocalId)) sawLocal = true
    return orig(ids)
  }
  const store = createMemoryStore()
  await store.setUser({ id: 'u1', email: 'toi@exemple.com' })
  const api = wrapOffline(remote, store)
  await store.putWorkout({
    id: 'local:abc',
    day_key: 'j1',
    date: '2026-08-25',
    started_at: 'x',
    ended_at: null,
  })
  await api.sets.byWorkouts(['local:abc', 'w-serveur'])
  check('GET sans id local', !sawLocal)
}

{
  const remote = fakeRemote({ online: false })
  const store = createMemoryStore()
  await store.setUser({ id: 'u1', email: 'toi@exemple.com' })
  const api = wrapOffline(remote, store)
  const w = await api.workouts.create('j1', '2026-08-25')
  await api.sets.create({
    workout_id: w.id,
    exercise_key: 'dc_barre',
    set_index: 0,
    weight: 40,
    reps: 8,
    warmup: true,
    performed_at: '2026-08-25',
  })
  const list = await api.sets.byWorkouts([w.id])
  check('échauffement encore là hors ligne', list[0]?.warmup === true)
}

console.log(echecs ? `\n${echecs} échec(s)` : '\nTout est vert.')
process.exit(echecs ? 1 : 0)
