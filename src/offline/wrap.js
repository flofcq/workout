import { ApiError } from '../apiError.js'
import { isLocalId, isOfflineError, newLocalId } from './ids.js'
import { sortSets } from './store.js'
import { bindOnlineListeners, patchOfflineStatus } from './status.js'

async function callRemote(fn) {
  // DevTools « offline » pose navigator.onLine à false sans même tenter
  // le réseau — utile aussi en démo, où l'API simulée n'appelle pas fetch.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new ApiError('Impossible de joindre le serveur', 0)
  }
  return fn()
}

function stampNow(workout, payload) {
  const next = { ...workout }
  if (payload.started_at === 'now') next.started_at = new Date().toISOString()
  else if (payload.started_at === null) next.started_at = null
  if (payload.ended_at === 'now') next.ended_at = new Date().toISOString()
  else if (payload.ended_at === null) next.ended_at = null
  return next
}

async function refreshPending(store) {
  const ops = await store.listOutbox()
  patchOfflineStatus({ pending: ops.length })
}

/**
 * Enveloppe l'API réseau : lectures servies du cache si le téléphone est
 * coupé, écritures empilées puis rejouées. Les horodatages envoyés restent
 * `'now'` — c'est le serveur qui pose l'heure au moment de l'envoi, pas
 * l'horloge du téléphone.
 */
export function wrapOffline(remote, store) {
  let flushing = false
  let flushAgain = false

  async function noteOnline() {
    patchOfflineStatus({ online: true, error: null })
    await flush()
  }

  async function noteOffline() {
    patchOfflineStatus({ online: false })
  }

  bindOnlineListeners(() => {
    flush()
  })

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) flush()
    })
  }

  async function mergeSets(list) {
    for (const s of list) await store.putSet(s)
  }

  async function mergeWorkouts(list) {
    const locals = (await store.listWorkouts()).filter((w) => isLocalId(w.id))
    for (const w of list) await store.putWorkout(w)
    const map = await store.getIdMap()
    for (const w of locals) {
      const clash = list.find((r) => r.day_key === w.day_key && r.date === w.date)
      if (clash) {
        await rememberMap(map, w.id, clash.id)
        await store.replaceWorkoutId(w.id, clash.id, clash)
      } else {
        await store.putWorkout(w)
      }
    }
  }

  async function cachedSetsByExercises(keys) {
    const all = await store.listSets()
    return sortSets(all.filter((s) => keys.includes(s.exercise_key)))
  }

  async function cachedSetsByWorkouts(ids) {
    const all = await store.listSets()
    return sortSets(all.filter((s) => ids.includes(s.workout_id)))
  }

  async function flush() {
    if (flushing) {
      flushAgain = true
      return
    }
    flushing = true
    patchOfflineStatus({ syncing: true })
    try {
      do {
        flushAgain = false
        const map = await store.getIdMap()
        const ops = await store.listOutbox()
        for (const op of ops) {
          await replay(op, map)
          await store.removeOutbox(op.opId)
          await refreshPending(store)
        }
      } while (flushAgain)
      patchOfflineStatus({ syncing: false, error: null, online: true })
    } catch (e) {
      if (isOfflineError(e)) noteOffline()
      else patchOfflineStatus({ error: e.message })
      patchOfflineStatus({ syncing: false })
    } finally {
      flushing = false
    }
  }

  function resolve(map, id) {
    return (id && map[id]) || id
  }

  async function rememberMap(map, localId, remoteId) {
    map[localId] = remoteId
    await store.setIdMap(map)
  }

  async function replay(op, map) {
    switch (op.type) {
      case 'workout.create': {
        if (map[op.localId]) return
        const remoteW = await callRemote(() => remote.workouts.create(op.dayKey, op.date))
        await rememberMap(map, op.localId, remoteW.id)
        await store.replaceWorkoutId(op.localId, remoteW.id, remoteW)
        return
      }
      case 'workout.update': {
        const id = resolve(map, op.id)
        if (isLocalId(id)) throw new ApiError('Séance pas encore envoyée', 0)
        const w = await callRemote(() => remote.workouts.update(id, op.payload))
        await store.putWorkout(w)
        return
      }
      case 'workout.remove': {
        const id = resolve(map, op.id)
        if (isLocalId(id)) return
        await callRemote(() => remote.workouts.remove(id))
        return
      }
      case 'set.create': {
        if (map[op.localId]) return
        const payload = {
          ...op.payload,
          workout_id: resolve(map, op.payload.workout_id),
        }
        if (isLocalId(payload.workout_id)) throw new ApiError('Séance pas encore envoyée', 0)
        const remoteS = await callRemote(() => remote.sets.create(payload))
        await rememberMap(map, op.localId, remoteS.id)
        await store.replaceSetId(op.localId, remoteS.id, remoteS)
        return
      }
      case 'set.update': {
        const id = resolve(map, op.id)
        if (isLocalId(id)) throw new ApiError('Série pas encore envoyée', 0)
        const payload = {
          ...op.payload,
          workout_id: resolve(map, op.payload.workout_id),
        }
        const s = await callRemote(() => remote.sets.update(id, payload))
        await store.putSet(s)
        return
      }
      case 'set.remove': {
        const id = resolve(map, op.id)
        if (isLocalId(id)) return
        await callRemote(() => remote.sets.remove(id))
        return
      }
      case 'body.save': {
        const entry = await callRemote(() => remote.body.save(op.payload))
        await store.putBody(entry)
        return
      }
      default:
        return
    }
  }

  const api = {
    auth: {
      me: async () => {
        try {
          const user = await callRemote(() => remote.auth.me())
          await noteOnline()
          if (user) await store.setUser(user)
          return user
        } catch (e) {
          if (isOfflineError(e)) {
            await noteOffline()
            const cached = await store.getUser()
            if (cached) return cached
          }
          throw e
        }
      },
      login: async (email, password) => {
        const user = await callRemote(() => remote.auth.login(email, password))
        const prev = await store.getUser()
        if (prev && prev.id !== user.id) await store.clear()
        await store.setUser(user)
        await noteOnline()
        return user
      },
      signup: async (email, password) => {
        const user = await callRemote(() => remote.auth.signup(email, password))
        await store.clear()
        await store.setUser(user)
        await noteOnline()
        return user
      },
      logout: async () => {
        try {
          await callRemote(() => remote.auth.logout())
        } catch (e) {
          if (!isOfflineError(e)) throw e
        }
        await store.clear()
        await refreshPending(store)
      },
    },

    workouts: {
      list: async () => {
        try {
          const list = await callRemote(() => remote.workouts.list())
          await noteOnline()
          await mergeWorkouts(list)
          return await store.listWorkouts()
        } catch (e) {
          if (!isOfflineError(e)) throw e
          await noteOffline()
          return store.listWorkouts()
        }
      },
      create: async (dayKey, date) => {
        const existing = await store.findWorkout(dayKey, date)
        try {
          const w = await callRemote(() => remote.workouts.create(dayKey, date))
          await noteOnline()
          if (existing && isLocalId(existing.id) && existing.id !== w.id) {
            const map = await store.getIdMap()
            await rememberMap(map, existing.id, w.id)
            await store.replaceWorkoutId(existing.id, w.id, w)
          } else {
            await store.putWorkout(w)
          }
          await flush()
          return w
        } catch (e) {
          if (!isOfflineError(e)) throw e
          await noteOffline()
          if (existing) return existing
          const w = {
            id: newLocalId(),
            day_key: dayKey,
            date,
            notes: null,
            started_at: new Date().toISOString(),
            ended_at: null,
          }
          await store.putWorkout(w)
          await store.enqueue({ type: 'workout.create', localId: w.id, dayKey, date })
          await refreshPending(store)
          return w
        }
      },
      update: async (id, payload) => {
        const cur = (await store.getWorkout(id)) || { id }
        try {
          if (isLocalId(id)) throw new ApiError('Impossible de joindre le serveur', 0)
          const w = await callRemote(() => remote.workouts.update(id, payload))
          await noteOnline()
          await store.putWorkout(w)
          return w
        } catch (e) {
          if (!isOfflineError(e)) throw e
          await noteOffline()
          const w = stampNow(cur, payload)
          await store.putWorkout(w)
          await store.enqueue({ type: 'workout.update', id, payload })
          await refreshPending(store)
          return w
        }
      },
      remove: async (id) => {
        try {
          if (isLocalId(id)) throw new ApiError('Impossible de joindre le serveur', 0)
          await callRemote(() => remote.workouts.remove(id))
          await noteOnline()
          await store.deleteWorkout(id)
        } catch (e) {
          if (!isOfflineError(e)) throw e
          await noteOffline()
          if (isLocalId(id)) {
            await store.dropOutboxMatching(
              (op) =>
                op.localId === id ||
                op.id === id ||
                op.payload?.workout_id === id
            )
          } else {
            await store.enqueue({ type: 'workout.remove', id })
          }
          await store.deleteWorkout(id)
          await refreshPending(store)
        }
      },
    },

    sets: {
      byExercises: async (keys) => {
        if (!keys.length) return []
        try {
          const list = await callRemote(() => remote.sets.byExercises(keys))
          await noteOnline()
          await mergeSets(list)
          return await cachedSetsByExercises(keys)
        } catch (e) {
          if (!isOfflineError(e)) throw e
          await noteOffline()
          return cachedSetsByExercises(keys)
        }
      },
      byWorkouts: async (ids) => {
        if (!ids.length) return []
        const remoteIds = ids.filter((id) => !isLocalId(id))
        const localIds = ids.filter(isLocalId)
        try {
          const list = remoteIds.length
            ? await callRemote(() => remote.sets.byWorkouts(remoteIds))
            : []
          await noteOnline()
          await mergeSets(list)
          const local = localIds.length ? await cachedSetsByWorkouts(localIds) : []
          return sortSets([...list, ...local])
        } catch (e) {
          if (!isOfflineError(e)) throw e
          await noteOffline()
          return cachedSetsByWorkouts(ids)
        }
      },
      create: async (payload) => {
        try {
          if (isLocalId(payload.workout_id)) throw new ApiError('Impossible de joindre le serveur', 0)
          const s = await callRemote(() => remote.sets.create(payload))
          await noteOnline()
          await store.putSet(s)
          if (s.exercise_name) await store.rememberCustom(s.exercise_key, s.exercise_name)
          await flush()
          return s
        } catch (e) {
          if (!isOfflineError(e)) throw e
          await noteOffline()
          const s = { ...payload, id: newLocalId(), warmup: payload.warmup === true }
          await store.putSet(s)
          if (s.exercise_name) await store.rememberCustom(s.exercise_key, s.exercise_name)
          await store.enqueue({ type: 'set.create', localId: s.id, payload })
          await refreshPending(store)
          return s
        }
      },
      update: async (id, payload) => {
        try {
          if (isLocalId(id)) throw new ApiError('Impossible de joindre le serveur', 0)
          const s = await callRemote(() => remote.sets.update(id, payload))
          await noteOnline()
          await store.putSet(s)
          return s
        } catch (e) {
          if (!isOfflineError(e)) throw e
          await noteOffline()
          const cur = (await store.getSet(id)) || { id }
          const s = { ...cur, ...payload, id }
          await store.putSet(s)
          if (isLocalId(id)) {
            const ops = await store.listOutbox()
            const create = ops.find((op) => op.type === 'set.create' && op.localId === id)
            if (create) await store.updateOutbox(create.opId, { payload })
          } else {
            await store.enqueue({ type: 'set.update', id, payload })
          }
          await refreshPending(store)
          return s
        }
      },
      remove: async (id) => {
        try {
          if (isLocalId(id)) throw new ApiError('Impossible de joindre le serveur', 0)
          await callRemote(() => remote.sets.remove(id))
          await noteOnline()
          await store.deleteSet(id)
        } catch (e) {
          if (!isOfflineError(e)) throw e
          await noteOffline()
          if (isLocalId(id)) {
            await store.dropOutboxMatching((op) => op.localId === id || op.id === id)
          } else {
            await store.enqueue({ type: 'set.remove', id })
          }
          await store.deleteSet(id)
          await refreshPending(store)
        }
      },
    },

    exercises: {
      custom: async () => {
        try {
          const list = await callRemote(() => remote.exercises.custom())
          await noteOnline()
          await store.setCustom(list)
          return list
        } catch (e) {
          if (!isOfflineError(e)) throw e
          await noteOffline()
          return store.getCustom()
        }
      },
    },

    body: {
      list: async () => {
        try {
          const list = await callRemote(() => remote.body.list())
          await noteOnline()
          for (const e of list) await store.putBody(e)
          return list
        } catch (e) {
          if (!isOfflineError(e)) throw e
          await noteOffline()
          return store.listBody()
        }
      },
      save: async (payload) => {
        try {
          const entry = await callRemote(() => remote.body.save(payload))
          await noteOnline()
          await store.putBody(entry)
          return entry
        } catch (e) {
          if (!isOfflineError(e)) throw e
          await noteOffline()
          const prev = (await store.listBody()).find((x) => x.date === payload.date) || {}
          const entry = { ...prev, ...payload, id: prev.id || newLocalId() }
          await store.putBody(entry)
          await store.enqueue({ type: 'body.save', payload })
          await refreshPending(store)
          return entry
        }
      },
    },

    _flush: flush,
    _store: store,
  }

  refreshPending(store)
  return api
}

/** Télécharge l'historique dès qu'on a du réseau, pour qu'il survive au vestiaire. */
export async function warmCache(api) {
  try {
    const ws = await api.workouts.list()
    const ids = ws.map((w) => w.id).filter((id) => !isLocalId(id))
    if (ids.length) await api.sets.byWorkouts(ids)
    await Promise.all([api.exercises.custom(), api.body.list()])
  } catch {
    // Hors ligne ou cache encore vide : on réessaiera à la prochaine ouverture.
  }
}
