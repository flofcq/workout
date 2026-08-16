import { useEffect, useState } from 'react'
import { supabase, isConfigured } from './supabase'
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
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('seance')
  const [timer, setTimer] = useState(null) // { seconds, label, id }

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  function startRest(seconds, label) {
    setTimer({ seconds, label, id: Date.now() })
  }

  if (!isConfigured) return <SetupNeeded />
  if (loading) return <div className="spinner">Chargement…</div>
  if (!session) return <Login />

  return (
    <>
      <div className="app">
        <div className="topbar">
          <div className="brand">
            Suivi <span>salle</span>
          </div>
          <button className="btn ghost sm" onClick={() => supabase.auth.signOut()}>
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

function Login() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    setBusy(false)
    if (error) setErr(error.message)
    else setSent(true)
  }

  return (
    <div className="app" style={{ maxWidth: 400, paddingTop: 60 }}>
      <h1>Suivi salle</h1>
      <p className="sub" style={{ marginBottom: 22 }}>
        Connecte-toi pour retrouver tes séances sur tous tes appareils.
      </p>

      {sent ? (
        <div className="card">
          <h3>Regarde tes mails</h3>
          <p className="tiny" style={{ marginTop: 6 }}>
            Un lien de connexion a été envoyé à <b>{email}</b>. Ouvre-le sur l'appareil que tu
            veux utiliser en salle — pas besoin de mot de passe.
          </p>
        </div>
      ) : (
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
          {err && <p className="tiny" style={{ color: 'var(--danger)' }}>{err}</p>}
          <button className="btn primary block" disabled={busy}>
            {busy ? 'Envoi…' : 'Recevoir un lien de connexion'}
          </button>
        </form>
      )}
    </div>
  )
}

function SetupNeeded() {
  return (
    <div className="app" style={{ maxWidth: 520, paddingTop: 50 }}>
      <h1>Configuration requise</h1>
      <p className="sub" style={{ marginBottom: 18 }}>
        L'application n'est pas encore reliée à ta base Supabase.
      </p>
      <div className="card">
        <h3>Ce qu'il te reste à faire</h3>
        <ol className="tiny" style={{ paddingLeft: 18, marginTop: 10, lineHeight: 1.7 }}>
          <li>Crée un projet gratuit sur supabase.com</li>
          <li>
            Colle le contenu de <code>supabase/schema.sql</code> dans le SQL Editor et exécute-le
          </li>
          <li>
            Copie <code>.env.example</code> vers <code>.env</code> et renseigne{' '}
            <code>VITE_SUPABASE_URL</code> et <code>VITE_SUPABASE_ANON_KEY</code>
          </li>
          <li>Relance le serveur de dev</li>
        </ol>
        <p className="tiny" style={{ marginTop: 12 }}>
          Les étapes détaillées sont dans le README.
        </p>
      </div>
    </div>
  )
}
