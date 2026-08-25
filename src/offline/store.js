// Store mémoire — même forme que IndexedDB, pour les tests et si IDB refuse
// (navigation privée iOS). Tout tient dans un objet : kv, séances, séries, file.

const sortWorkouts = (list) => [...list].sort((a, b) => b.date.localeCompare(a.date))

const sortSets = (list) =>
  [...list].sort(
    (a, b) => b.performed_at.localeCompare(a.performed_at) || a.set_index - b.set_index
  )

export function createMemoryStore() {
  return createStoreState()
}

function createStoreState() {
  const kv = new Map()
  const workouts = new Map()
  const sets = new Map()
  const body = new Map()
  let custom = []
  let outbox = []
  let nextOutbox = 1

  return {
    async getUser() {
      return kv.get('user') || null
    },
    async setUser(user) {
      if (user) kv.set('user', user)
      else kv.delete('user')
    },

    async getIdMap() {
      return { ...(kv.get('idMap') || {}) }
    },
    async setIdMap(map) {
      kv.set('idMap', { ...map })
    },

    async listWorkouts() {
      return sortWorkouts([...workouts.values()])
    },
    async getWorkout(id) {
      return workouts.get(id) || null
    },
    async findWorkout(dayKey, date) {
      return [...workouts.values()].find((w) => w.day_key === dayKey && w.date === date) || null
    },
    async putWorkout(w) {
      workouts.set(w.id, { ...w })
    },
    async deleteWorkout(id) {
      workouts.delete(id)
      for (const s of [...sets.values()]) {
        if (s.workout_id === id) sets.delete(s.id)
      }
    },
    async replaceWorkoutId(from, to, remoteWorkout) {
      const old = workouts.get(from)
      workouts.delete(from)
      const next = { ...(remoteWorkout || old || {}), id: to }
      workouts.set(to, next)
      for (const s of [...sets.values()]) {
        if (s.workout_id === from) sets.set(s.id, { ...s, workout_id: to })
      }
      outbox = outbox.map((op) => rewriteOpIds(op, from, to))
    },

    async listSets() {
      return sortSets([...sets.values()])
    },
    async getSet(id) {
      return sets.get(id) || null
    },
    async putSet(s) {
      sets.set(s.id, { ...s })
    },
    async deleteSet(id) {
      sets.delete(id)
    },
    async replaceSetId(from, to, remoteSet) {
      const old = sets.get(from)
      sets.delete(from)
      sets.set(to, { ...(remoteSet || old || {}), id: to })
      outbox = outbox.map((op) => rewriteOpIds(op, from, to))
    },

    async getCustom() {
      return [...custom]
    },
    async setCustom(list) {
      custom = [...list]
    },
    async rememberCustom(exerciseKey, exerciseName) {
      if (!exerciseName) return
      const rest = custom.filter((e) => e.exercise_key !== exerciseKey)
      custom = [
        {
          exercise_key: exerciseKey,
          exercise_name: exerciseName,
          sets_count: (custom.find((e) => e.exercise_key === exerciseKey)?.sets_count || 0) + 1,
          last_performed_at: null,
        },
        ...rest,
      ]
    },

    async listBody() {
      return [...body.values()].sort((a, b) => a.date.localeCompare(b.date))
    },
    async putBody(entry) {
      body.set(entry.date, { ...entry })
    },

    async enqueue(op) {
      const row = { ...op, opId: nextOutbox++ }
      outbox.push(row)
      return row
    },
    async listOutbox() {
      return [...outbox]
    },
    async removeOutbox(opId) {
      outbox = outbox.filter((o) => o.opId !== opId)
    },
    async updateOutbox(opId, patch) {
      outbox = outbox.map((o) => (o.opId === opId ? { ...o, ...patch } : o))
    },
    async dropOutboxMatching(pred) {
      outbox = outbox.filter((o) => !pred(o))
    },

    async clear() {
      kv.clear()
      workouts.clear()
      sets.clear()
      body.clear()
      custom = []
      outbox = []
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

export { sortSets, sortWorkouts }
