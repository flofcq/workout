import { useCallback, useEffect, useState } from 'react'
import { api, ApiError } from './api'
import Seance from './views/Seance'
import Historique from './views/Historique'
import Progression from './views/Progression'
import Corps from './views/Corps'
import RestTimer from './components/RestTimer'

const TABS = [
  { key: 'seance', label: 'Séance', ico: '🏋️' },
  { key: 'historique', label: 'Historique', ico: '📋' },
  { key: 'progression', label: 'Progression', ico: '📈' },
  { key: 'corps', label: 'Corps', ico: '⚖️' },
]

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [serverDown, setServerDown] = useState(false)
  const [tab, setTab] = useState('seance')
  const [timer, setTimer] = useState(null) // { seconds, label, id }

  useEffect(() => {
    api.auth
      .me()
      .then(setUser)
      // Une 500 ici veut presque toujours dire que DATABASE_URL ou AUTH_SECRET
      // manque : l'API ne démarre pas. On le distingue d'un simple « pas connecté ».
      .catch(() => setServerDown(true))
      .finally(() => setLoading(false))
  }, [])

  const startRest = useCallback((seconds, label) => {
    setTimer({ seconds, label, id: Date.now() })
  }, [])

  async function logout() {
    await api.auth.logout()
    setUser(null)
  }

  if (loading) return <div className="spinner">Chargement…</div>
  if (serverDown) return <SetupNeeded />
  if (!user) return <Login onAuth={setUser} />

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

        {tab === 'seance' && <Seance onStartRest={startRest} />}
        {tab === 'historique' && <Historique />}
        {tab === 'progression' && <Progression />}
        {tab === 'corps' && <Corps />}
      </div>

      {timer && (
        <RestTimer
          key={timer.id}
          seconds={timer.seconds}
          label={timer.label}
          onDismiss={() => setTimer(null)}
        />
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
          : 'Connecte-toi pour retrouver tes séances sur tous tes appareils.'}
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
