// État réseau / file d'envoi, pour la barre sous le chrono. Pas de React ici :
// wrap.js notifie, App s'abonne.

let status = {
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  pending: 0,
  syncing: false,
  error: null,
}

const listeners = new Set()

export function getOfflineStatus() {
  return status
}

export function subscribeOfflineStatus(fn) {
  listeners.add(fn)
  fn(status)
  return () => listeners.delete(fn)
}

export function patchOfflineStatus(partial) {
  status = { ...status, ...partial }
  for (const fn of listeners) fn(status)
}

export function bindOnlineListeners(onOnline) {
  if (typeof window === 'undefined') return () => {}
  const up = () => {
    patchOfflineStatus({ online: true })
    onOnline?.()
  }
  const down = () => patchOfflineStatus({ online: false })
  window.addEventListener('online', up)
  window.addEventListener('offline', down)
  return () => {
    window.removeEventListener('online', up)
    window.removeEventListener('offline', down)
  }
}
