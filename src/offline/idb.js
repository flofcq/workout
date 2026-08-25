// IndexedDB du téléphone. Même API que le store mémoire : wrap.js n'a pas à
// savoir lequel tourne. Si l'ouverture échoue (mode privé), on retombe sur
// la mémoire — la séance du jour survit au moins jusqu'à fermer l'app.

import { createMemoryStore } from './store.js'

const DB = 'suivi-salle'
const VERSION = 2

function openDb(name) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv')
      if (!db.objectStoreNames.contains('workouts')) db.createObjectStore('workouts', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('sets')) db.createObjectStore('sets', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('body')) db.createObjectStore('body', { keyPath: 'date' })
      // opId, pas id : id est déjà l'identifiant de la séance ou de la série.
      if (db.objectStoreNames.contains('outbox')) db.deleteObjectStore('outbox')
      db.createObjectStore('outbox', { keyPath: 'opId', autoIncrement: true })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error || new Error('transaction abortée'))
  })
}

function reqOf(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function createIdbStore(name = DB) {
  if (typeof indexedDB === 'undefined') return createMemoryStore()

  let db
  try {
    db = await openDb(name)
  } catch {
    return createMemoryStore()
  }

  const kvGet = async (key) => {
    const tx = db.transaction('kv', 'readonly')
    const value = await reqOf(tx.objectStore('kv').get(key))
    await txDone(tx)
    return value
  }
  const kvSet = async (key, value) => {
    const tx = db.transaction('kv', 'readwrite')
    if (value === undefined) tx.objectStore('kv').delete(key)
    else tx.objectStore('kv').put(value, key)
    await txDone(tx)
  }

  return {
    async getUser() {
      return (await kvGet('user')) || null
    },
    async setUser(user) {
      await kvSet('user', user || undefined)
    },
    async getIdMap() {
      return { ...((await kvGet('idMap')) || {}) }
    },
    async setIdMap(map) {
      await kvSet('idMap', map)
    },

    async listWorkouts() {
      const tx = db.transaction('workouts', 'readonly')
      const list = await reqOf(tx.objectStore('workouts').getAll())
      await txDone(tx)
      return list.sort((a, b) => b.date.localeCompare(a.date))
    },
    async getWorkout(id) {
      const tx = db.transaction('workouts', 'readonly')
      const w = await reqOf(tx.objectStore('workouts').get(id))
      await txDone(tx)
      return w || null
    },
    async findWorkout(dayKey, date) {
      const list = await this.listWorkouts()
      return list.find((w) => w.day_key === dayKey && w.date === date) || null
    },
    async putWorkout(w) {
      const tx = db.transaction('workouts', 'readwrite')
      tx.objectStore('workouts').put({ ...w })
      await txDone(tx)
    },
    async deleteWorkout(id) {
      const tx = db.transaction(['workouts', 'sets'], 'readwrite')
      tx.objectStore('workouts').delete(id)
      const all = await reqOf(tx.objectStore('sets').getAll())
      for (const s of all) {
        if (s.workout_id === id) tx.objectStore('sets').delete(s.id)
      }
      await txDone(tx)
    },
    async replaceWorkoutId(from, to, remoteWorkout) {
      const tx = db.transaction(['workouts', 'sets', 'outbox'], 'readwrite')
      const old = await reqOf(tx.objectStore('workouts').get(from))
      tx.objectStore('workouts').delete(from)
      tx.objectStore('workouts').put({ ...(remoteWorkout || old || {}), id: to })
      const allSets = await reqOf(tx.objectStore('sets').getAll())
      for (const s of allSets) {
        if (s.workout_id === from) tx.objectStore('sets').put({ ...s, workout_id: to })
      }
      const ops = await reqOf(tx.objectStore('outbox').getAll())
      for (const op of ops) {
        const next = rewriteOpIds(op, from, to)
        tx.objectStore('outbox').put(next)
      }
      await txDone(tx)
    },

    async listSets() {
      const tx = db.transaction('sets', 'readonly')
      const list = await reqOf(tx.objectStore('sets').getAll())
      await txDone(tx)
      return list.sort(
        (a, b) => b.performed_at.localeCompare(a.performed_at) || a.set_index - b.set_index
      )
    },
    async getSet(id) {
      const tx = db.transaction('sets', 'readonly')
      const s = await reqOf(tx.objectStore('sets').get(id))
      await txDone(tx)
      return s || null
    },
    async putSet(s) {
      const tx = db.transaction('sets', 'readwrite')
      tx.objectStore('sets').put({ ...s })
      await txDone(tx)
    },
    async deleteSet(id) {
      const tx = db.transaction('sets', 'readwrite')
      tx.objectStore('sets').delete(id)
      await txDone(tx)
    },
    async replaceSetId(from, to, remoteSet) {
      const tx = db.transaction(['sets', 'outbox'], 'readwrite')
      const old = await reqOf(tx.objectStore('sets').get(from))
      tx.objectStore('sets').delete(from)
      tx.objectStore('sets').put({ ...(remoteSet || old || {}), id: to })
      const ops = await reqOf(tx.objectStore('outbox').getAll())
      for (const op of ops) {
        tx.objectStore('outbox').put(rewriteOpIds(op, from, to))
      }
      await txDone(tx)
    },

    async getCustom() {
      return (await kvGet('custom')) || []
    },
    async setCustom(list) {
      await kvSet('custom', list)
    },
    async rememberCustom(exerciseKey, exerciseName) {
      if (!exerciseName) return
      const custom = (await kvGet('custom')) || []
      const prev = custom.find((e) => e.exercise_key === exerciseKey)
      const rest = custom.filter((e) => e.exercise_key !== exerciseKey)
      await kvSet('custom', [
        {
          exercise_key: exerciseKey,
          exercise_name: exerciseName,
          sets_count: (prev?.sets_count || 0) + 1,
          last_performed_at: null,
        },
        ...rest,
      ])
    },

    async listBody() {
      const tx = db.transaction('body', 'readonly')
      const list = await reqOf(tx.objectStore('body').getAll())
      await txDone(tx)
      return list.sort((a, b) => a.date.localeCompare(b.date))
    },
    async putBody(entry) {
      const tx = db.transaction('body', 'readwrite')
      tx.objectStore('body').put({ ...entry })
      await txDone(tx)
    },

    async enqueue(op) {
      const tx = db.transaction('outbox', 'readwrite')
      const opId = await reqOf(tx.objectStore('outbox').add({ ...op }))
      await txDone(tx)
      return { ...op, opId }
    },
    async listOutbox() {
      const tx = db.transaction('outbox', 'readonly')
      const list = await reqOf(tx.objectStore('outbox').getAll())
      await txDone(tx)
      return list.sort((a, b) => a.opId - b.opId)
    },
    async removeOutbox(opId) {
      const tx = db.transaction('outbox', 'readwrite')
      tx.objectStore('outbox').delete(opId)
      await txDone(tx)
    },
    async updateOutbox(opId, patch) {
      const tx = db.transaction('outbox', 'readwrite')
      const cur = await reqOf(tx.objectStore('outbox').get(opId))
      if (cur) tx.objectStore('outbox').put({ ...cur, ...patch, opId })
      await txDone(tx)
    },
    async dropOutboxMatching(pred) {
      const tx = db.transaction('outbox', 'readwrite')
      const list = await reqOf(tx.objectStore('outbox').getAll())
      for (const op of list) {
        if (pred(op)) tx.objectStore('outbox').delete(op.opId)
      }
      await txDone(tx)
    },

    async clear() {
      const tx = db.transaction(['kv', 'workouts', 'sets', 'body', 'outbox'], 'readwrite')
      tx.objectStore('kv').clear()
      tx.objectStore('workouts').clear()
      tx.objectStore('sets').clear()
      tx.objectStore('body').clear()
      tx.objectStore('outbox').clear()
      await txDone(tx)
    },
  }
}

function rewriteOpIds(op, from, to) {
  const next = { ...op }
  if (next.localId === from) next.localId = to
  if (next.id === from) next.id = to
  if (next.payload) {
    next.payload = { ...next.payload }
    if (next.payload.workout_id === from) next.payload.workout_id = to
  }
  return next
}
