import { useCallback, useEffect, useState } from 'react'
import { api, ApiError } from './api'
import Seance from './views/Seance'
import Historique from './views/Historique'
import Progression from './views/Progression'
import Corps from './views/Corps'
import Muscles from './views/Muscles'
import RestTimer from './components/RestTimer'
import useAppUpdate from './useAppUpdate'
import useOfflineStatus from './useOfflineStatus'
import { warmCache } from './offline/wrap'

const TABS = [
  { key: 'seance', label: 'Séance', ico: '🏋️' },
  { key: 'historique', label: 'Historique', ico: '📋' },
  { key: 'progression', label: 'Progression', ico: '📈' },
  { key: 'corps', label: 'Corps', ico: '⚖️' },
  { key: 'muscles', label: 'Muscles', ico: '💪' },
]

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [serverDown, setServerDown] = useState(false)
  const [needNetwork, setNeedNetwork] = useState(false)
  const [tab, setTab] = useState('seance')
  const [timer, setTimer] = useState(null) // { seconds, label, id }
  // Fiche muscle visée depuis une séance. Vidée dès que l'onglet Muscles l'a
  // consommée, sinon revenir sur l'onglet re-défilerait vers l'ancienne cible.
  const [muscleTarget, setMuscleTarget] = useState(null)
  const update = useAppUpdate()
  const offline = useOfflineStatus()

  useEffect(() => {
    api.auth
      .me()
      .then((u) => {
        setUser(u)
        if (u) warmCache(api)
      })
      // Une 500 ici veut presque toujours dire que DATABASE_URL ou AUTH_SECRET
      // manque : l'API ne démarre pas. On le distingue d'un simple « pas connecté ».
      // Un status 0, c'est le réseau : si aucune session n'a jamais été
      // mémorisée, on ne peut rien afficher hors ligne.
      .catch((e) => {
        if (e instanceof ApiError && e.status === 0) setNeedNetwork(true)
        else setServerDown(true)
      })
      .finally(() => setLoading(false))
  }, [])

  const startRest = useCallback((seconds, label) => {
    setTimer({ seconds, label, id: Date.now() })
  }, [])

  const openMuscle = useCallback((key) => {
    setMuscleTarget(key)
    setTab('muscles')
  }, [])

  // useCallback obligatoire : cette fonction est une dépendance d'effet dans
  // Muscles, une identité neuve à chaque rendu le relancerait en boucle.
  const clearMuscleTarget = useCallback(() => setMuscleTarget(null), [])

  async function logout() {
    await api.auth.logout()
    setUser(null)
  }

  function onAuthed(u) {
    setUser(u)
    warmCache(api)
  }

  if (loading) return <div className="spinner">Chargement…</div>
  if (needNetwork) return <NeedNetwork />
  if (serverDown) return <SetupNeeded />
  if (!user) return <Login onAuth={onAuthed} />

  return (
    <>
      <div className="app">
        <div className="topbar">
          <div className="brand">
            Suivi <span>salle</span>
          </div>
          <button className="btn ghost sm" onClick={logout}>
            Déconnexion
          </button>
        </div>

        <OfflineBar status={offline} />

        {tab === 'seance' && <Seance onStartRest={startRest} onOpenMuscle={openMuscle} />}
        {tab === 'historique' && <Historique />}
        {tab === 'progression' && <Progression />}
        {tab === 'corps' && <Corps />}
        {tab === 'muscles' && (
          <Muscles target={muscleTarget} onTargetHandled={clearMuscleTarget} />
        )}
      </div>

      {/* Les deux occupent la même place au-dessus de la navigation ; le repos
          est prioritaire, la mise à jour peut attendre la fin de la série. */}
      {timer ? (
        <RestTimer
          key={timer.id}
          seconds={timer.seconds}
          label={timer.label}
          onDismiss={() => setTimer(null)}
        />
      ) : (
        update.available && (
          <div className="updatebar">
            <span>Nouvelle version disponible</span>
            <button onClick={update.reload}>Recharger</button>
          </div>
        )
      )}

      <nav className="nav">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={tab === t.key ? 'on' : ''}
            onClick={() => setTab(t.key)}
            aria-current={tab === t.key ? 'page' : undefined}
          >
            <span className="ico" aria-hidden="true">{t.ico}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </>
  )
}

function OfflineBar({ status }) {
  if (status.online && status.pending === 0 && !status.error) return null

  let text
  if (!status.online) {
    text =
      status.pending > 0
        ? `Hors ligne — ${status.pending} modification${status.pending > 1 ? 's' : ''} sur le téléphone, envoyée${status.pending > 1 ? 's' : ''} au retour du réseau.`
        : 'Hors ligne — tu peux saisir ta séance, elle partira toute seule au retour du réseau.'
  } else if (status.error) {
    text = `Envoi impossible : ${status.error}`
  } else if (status.syncing) {
    text = 'Envoi de tes séries…'
  } else {
    text = `${status.pending} modification${status.pending > 1 ? 's' : ''} en attente d'envoi.`
  }

  return (
    <div className={`offlinebar${status.online ? '' : ' off'}`} role="status">
      {text}
    </div>
  )
}

function NeedNetwork() {
  return (
    <div className="app" style={{ maxWidth: 400, paddingTop: 60 }}>
      <h1>Hors ligne</h1>
      <p className="sub" style={{ marginBottom: 18 }}>
        Ouvre l'app une fois avec du réseau pour emporter tes séances. Ensuite, le vestiaire
        n'a plus besoin de 4G.
      </p>
      <div className="card">
        <p className="tiny">
          Si tu viens de l'ajouter à l'écran d'accueil, relance-la en Wi-Fi ou en 4G : le
          téléphone mémorise alors le programme et tes dernières séances.
        </p>
        <button className="btn primary block" style={{ marginTop: 14 }} onClick={() => window.location.reload()}>
          Réessayer
        </button>
      </div>
    </div>
  )
}

function Login({ onAuth }) {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)

  const signup = mode === 'signup'

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      const u = signup ? await api.auth.signup(email, password) : await api.auth.login(email, password)
      onAuth(u)
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'Une erreur est survenue')
      setBusy(false)
    }
  }

  return (
    <div className="app" style={{ maxWidth: 400, paddingTop: 60 }}>
      <h1>Suivi salle</h1>
      <p className="sub" style={{ marginBottom: 22 }}>
        {signup
          ? 'Crée ton compte pour enregistrer tes séances.'
          : 'Connecte-toi pour retrouver tes séances sur tous tes appareils, et les emporter hors ligne.'}
      </p>

      <form className="card" onSubmit={submit}>
        <div className="field">
          <label htmlFor="email">Adresse email</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="toi@exemple.com"
          />
        </div>

        <div className="field">
          <label htmlFor="password">Mot de passe</label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete={signup ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={signup ? '8 caractères minimum' : '••••••••'}
          />
        </div>

        {err && <p className="tiny" style={{ color: 'var(--danger)' }}>{err}</p>}

        <button className="btn primary block" disabled={busy}>
          {busy ? 'Un instant…' : signup ? 'Créer mon compte' : 'Se connecter'}
        </button>

        <button
          type="button"
          className="btn ghost sm"
          style={{ marginTop: 10 }}
          onClick={() => {
            setMode(signup ? 'login' : 'signup')
            setErr(null)
          }}
        >
          {signup ? "J'ai déjà un compte" : 'Créer un compte'}
        </button>
      </form>
    </div>
  )
}

function SetupNeeded() {
  return (
    <div className="app" style={{ maxWidth: 520, paddingTop: 50 }}>
      <h1>Configuration requise</h1>
      <p className="sub" style={{ marginBottom: 18 }}>
        L'API ne répond pas. Il lui manque probablement sa base ou sa clé de session.
      </p>
      <div className="card">
        <h3>Ce qu'il te reste à faire</h3>
        <ol className="tiny" style={{ paddingLeft: 18, marginTop: 10, lineHeight: 1.7 }}>
          <li>Crée une base gratuite sur neon.com (ou via l'onglet Storage de Vercel)</li>
          <li>
            Colle le contenu de <code>db/schema.sql</code> dans le SQL Editor et exécute-le
          </li>
          <li>
            Renseigne <code>DATABASE_URL</code> et <code>AUTH_SECRET</code> dans les variables
            d'environnement de Vercel
          </li>
          <li>Redéploie</li>
        </ol>
        <p className="tiny" style={{ marginTop: 12 }}>
          Les étapes détaillées sont dans le README.
        </p>
      </div>
    </div>
  )
}
