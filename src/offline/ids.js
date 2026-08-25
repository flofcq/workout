/** Les identifiants locaux n'existent que sur le téléphone, avant l'envoi. */
export const LOCAL_PREFIX = 'local:'

export const isLocalId = (id) => typeof id === 'string' && id.startsWith(LOCAL_PREFIX)

export function newLocalId() {
  const n = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return LOCAL_PREFIX + n
}

export const isOfflineError = (e) => e?.status === 0
