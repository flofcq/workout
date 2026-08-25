import { useCallback, useEffect, useRef, useState } from 'react'

// Détection d'une nouvelle version déployée.
//
// Le problème qu'on résout : une app ajoutée à l'écran d'accueil iOS ne se
// recharge pas quand on la rouvre. Safari restaure la page telle quelle,
// parfois pendant des jours, et il n'y a ni barre d'adresse ni bouton
// recharger en mode plein écran.
//
// Vite renomme le bundle à chaque build (index-a1b2c3.js). L'URL du script
// d'entrée identifie donc la version : il suffit de comparer celle qui tourne
// à celle qu'annonce le index.html actuellement déployé.

// [src] est indispensable : en dev, Vite injecte d'abord un module inline (le
// préambule react-refresh) qui n'a pas de src et serait sélectionné à sa place.
const RUNNING = document.querySelector('script[type="module"][src]')?.getAttribute('src') ?? null

// En dev et en démo, ce chemin vaut /src/main.jsx et ne change jamais : la
// comparaison est toujours vraie et le mécanisme reste donc inerte.

// Au-delà de cette durée passée en arrière-plan, on recharge sans rien
// demander : personne n'est en train de saisir une série après une demi-heure
// d'absence. En deçà, on se contente de proposer — un rechargement effacerait
// les charges tapées mais pas encore validées.
const SILENT_RELOAD_AFTER = 30 * 60 * 1000

// Une version pour laquelle on a déjà rechargé sans succès : on ne retente pas,
// mieux vaut une app en retard qu'une app qui se recharge en boucle.
const TRIED_KEY = 'suivi-salle:update-tried'

function remember(version) {
  try {
    sessionStorage.setItem(TRIED_KEY, version)
  } catch {
    // Mode privé : tant pis pour le garde-fou, on ne bloque pas la mise à jour.
  }
}

function alreadyTried(version) {
  try {
    return sessionStorage.getItem(TRIED_KEY) === version
  } catch {
    return false
  }
}

async function fetchDeployedVersion() {
  // La query casse les caches intermédiaires ; le rewrite SPA renvoie
  // index.html quelle que soit l'URL hors /api.
  const res = await fetch(`/?v=${Date.now()}`, { cache: 'no-store' })
  if (!res.ok) return null
  const html = await res.text()
  return html.match(/<script[^>]*type="module"[^>]*src="([^"]+)"/)?.[1] ?? null
}

export default function useAppUpdate() {
  const [available, setAvailable] = useState(false)
  const hiddenSince = useRef(null)
  const busy = useRef(false)

  const reload = useCallback(() => {
    window.location.reload()
  }, [])

  useEffect(() => {
    if (!RUNNING) return
    let cancelled = false

    async function check(silent) {
      if (busy.current) return
      busy.current = true
      let deployed = null
      try {
        deployed = await fetchDeployedVersion()
      } catch {
        return // Hors ligne : on retentera au prochain passage au premier plan.
        // Le SW est network-first sur index.html, donc en ligne on compare
        // au déploiement actuel, pas à la copie gardée pour le vestiaire.
      } finally {
        busy.current = false
      }
      if (cancelled || !deployed || deployed === RUNNING) return

      if (silent && !alreadyTried(deployed)) {
        remember(deployed)
        window.location.reload()
        return
      }
      setAvailable(true)
    }

    // Au démarrage, rien n'est saisi et la page vient peut-être du cache de
    // Safari : on peut recharger sans prévenir. C'est ce qui fait qu'ouvrir
    // l'app le lendemain suffit à la mettre à jour.
    check(true)

    function onForeground() {
      if (document.hidden) {
        hiddenSince.current = Date.now()
        return
      }
      const hiddenFor = hiddenSince.current ? Date.now() - hiddenSince.current : 0
      hiddenSince.current = null
      check(hiddenFor > SILENT_RELOAD_AFTER)
    }

    // iOS restaure parfois la page depuis le cache mémoire sans repasser par
    // visibilitychange : pageshow couvre ce cas.
    function onPageShow(e) {
      if (e.persisted) onForeground()
    }

    document.addEventListener('visibilitychange', onForeground)
    window.addEventListener('pageshow', onPageShow)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onForeground)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [])

  return { available, reload }
}
