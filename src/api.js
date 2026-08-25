import { mockApi } from './api.mock'
import { ApiError } from './apiError'
import { wrapOffline } from './offline/wrap'

export { ApiError }

// Mode démo : interface remplie avec des données factices, aucune base requise.
// Active-le avec VITE_DEMO=1 (voir README) pour regarder l'app avant de créer
// ta base Neon.
export const isDemo = import.meta.env.VITE_DEMO === '1'

async function request(path, { method = 'GET', body } = {}) {
  let res
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      // Le cookie de session est httpOnly : il faut demander explicitement
      // à fetch de le joindre.
      credentials: 'same-origin',
    })
  } catch {
    throw new ApiError('Impossible de joindre le serveur', 0)
  }

  // 204 et réponses vides : rien à parser.
  const text = await res.text()
  let data = {}
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      // Réponse non-JSON : page d'erreur de la plateforme, ou /api non servi
      // (c'est ce qui arrive avec `vite` seul, sans `vercel dev`).
      throw new ApiError(`Réponse inattendue du serveur (${res.status})`, res.status)
    }
  }

  if (!res.ok) {
    const suffix = data.code ? ` (${data.code})` : ''
    throw new ApiError((data.error || `Erreur ${res.status}`) + suffix, res.status, data.code)
  }
  return data
}

const qs = (params) =>
  '?' +
  Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&')

const realApi = {
  auth: {
    me: () => request('/auth/me').then((d) => d.user),
    login: (email, password) =>
      request('/auth/login', { method: 'POST', body: { email, password } }).then((d) => d.user),
    signup: (email, password) =>
      request('/auth/signup', { method: 'POST', body: { email, password } }).then((d) => d.user),
    logout: () => request('/auth/logout', { method: 'POST' }),
  },

  workouts: {
    list: () => request('/workouts').then((d) => d.workouts),
    create: (dayKey, date) =>
      request('/workouts', { method: 'POST', body: { day_key: dayKey, date } }).then(
        (d) => d.workout
      ),
    // 'now' pour horodater côté serveur, null pour effacer.
    update: (id, payload) =>
      request(`/workouts/${id}`, { method: 'PATCH', body: payload }).then((d) => d.workout),
    remove: (id) => request(`/workouts/${id}`, { method: 'DELETE' }),
  },

  sets: {
    byExercises: (keys) =>
      keys.length
        ? request('/sets' + qs({ exercises: keys.join(',') })).then((d) => d.sets)
        : Promise.resolve([]),
    byWorkouts: (ids) =>
      ids.length
        ? request('/sets' + qs({ workouts: ids.join(',') })).then((d) => d.sets)
        : Promise.resolve([]),
    create: (payload) =>
      request('/sets', { method: 'POST', body: payload }).then((d) => d.set),
    update: (id, payload) =>
      request(`/sets/${id}`, { method: 'PATCH', body: payload }).then((d) => d.set),
    remove: (id) => request(`/sets/${id}`, { method: 'DELETE' }),
  },

  /** Exercices hors programme déjà utilisés par le compte. */
  exercises: {
    custom: () => request('/exercises').then((d) => d.exercises),
  },

  body: {
    list: () => request('/body-metrics').then((d) => d.entries),
    save: (payload) =>
      request('/body-metrics', { method: 'PUT', body: payload }).then((d) => d.entry),
  },
}

function createApi() {
  // Démo comprise : hors ligne (DevTools ou vestiaire), on sert le cache
  // plutôt que l'API simulée, qui ne passe pas par fetch.
  return wrapOffline(isDemo ? mockApi : realApi, lazyStore())
}

function lazyStore() {
  let impl = null
  let pending = null
  const load = () => {
    if (impl) return impl
    if (!pending) {
      pending = import('./offline/idb')
        .then((m) => m.createIdbStore(isDemo ? 'suivi-salle-demo' : 'suivi-salle'))
        .then((s) => {
        impl = s
        return s
      })
    }
    return pending
  }
  return new Proxy(
    {},
    {
      get(_t, prop) {
        return async (...args) => {
          const s = await load()
          return s[prop](...args)
        }
      },
    }
  )
}

export const api = createApi()
