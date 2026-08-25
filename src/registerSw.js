// Enregistre le service worker seulement après un build : en dev, Vite
// sert des modules qui changent tout le temps, les mettre en cache
// casserait le rechargement à chaud.

export function registerServiceWorker() {
  if (!import.meta.env.PROD) return
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Pas de SW (aperçu file://, ou navigateur trop vieux) : l'app
      // reste utilisable en ligne, simplement pas hors ligne au vestiaire.
    })
  })
}
