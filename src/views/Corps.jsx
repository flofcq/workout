import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import LineChartCard from '../components/LineChartCard'

const FIELDS = [
  { key: 'weight', label: 'Poids', unit: 'kg', step: '0.1' },
  { key: 'chest', label: 'Poitrine', unit: 'cm', step: '0.5' },
  { key: 'waist', label: 'Taille', unit: 'cm', step: '0.5' },
  { key: 'arm', label: 'Bras', unit: 'cm', step: '0.5' },
  { key: 'thigh', label: 'Cuisse', unit: 'cm', step: '0.5' },
]

const todayISO = () => new Date().toISOString().slice(0, 10)

export default function Corps() {
  const [entries, setEntries] = useState([])
  const [form, setForm] = useState({ date: todayISO() })
  const [metric, setMetric] = useState('weight')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.body
      .list()
      .then(setEntries)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const payload = { date: form.date }
    for (const f of FIELDS) {
      const v = form[f.key]
      payload[f.key] = v === '' || v == null ? null : parseFloat(String(v).replace(',', '.'))
    }
    try {
      const saved = await api.body.save(payload)
      setEntries((list) => {
        const rest = list.filter((x) => x.date !== saved.date)
        return [...rest, saved].sort((a, b) => a.date.localeCompare(b.date))
      })
      setForm({ date: todayISO() })
    } catch (e2) {
      setError(e2.message)
    } finally {
      setSaving(false)
    }
  }

  const series = useMemo(
    () =>
      entries
        .filter((e) => e[metric] != null)
        .map((e) => ({
          label: new Date(e.date + 'T00:00:00').toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
          }),
          fullLabel: new Date(e.date + 'T00:00:00').toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          }),
          value: e[metric],
        })),
    [entries, metric]
  )

  const field = FIELDS.find((f) => f.key === metric)
  const first = series[0]?.value
  const last = series[series.length - 1]?.value
  const delta = first != null && last != null ? Math.round((last - first) * 10) / 10 : null

  // En sèche, une baisse de poids ou de tour de taille est la direction voulue.
  const lowerIsBetter = metric === 'weight' || metric === 'waist'

  return (
    <>
      <h1>Corps</h1>
      <p className="sub" style={{ marginBottom: 14 }}>
        La créatine ajoute 1 à 2 kg d'eau les premières semaines. Suis les mensurations en
        parallèle du poids, sinon tu vas mal lire ta progression.
      </p>

      {error && <div className="banner">Erreur : {error}</div>}

      <div className="chips" style={{ marginBottom: 12 }}>
        {FIELDS.map((f) => (
          <button
            key={f.key}
            className={`chip${metric === f.key ? ' on' : ''}`}
            onClick={() => setMetric(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="spinner">Chargement…</div>
      ) : (
        <>
          <div className="stats" style={{ marginBottom: 12 }}>
            <div className="stat">
              <div className="v">{last != null ? `${last} ${field.unit}` : '—'}</div>
              <div className="l">{field.label} — dernière mesure</div>
              {delta != null && delta !== 0 && (
                <div className={`d ${(delta < 0) === lowerIsBetter ? 'up' : 'down'}`}>
                  {delta > 0 ? '+' : ''}
                  {delta} {field.unit} depuis le début
                </div>
              )}
            </div>
            <div className="stat">
              <div className="v">{entries.length}</div>
              <div className="l">Mesures enregistrées</div>
            </div>
          </div>

          <div className="card">
            <div className="charthead">
              <h3>{field.label}</h3>
              <span className="tiny">{field.unit}</span>
            </div>
            <LineChartCard data={series} unit={field.unit} label={field.label} />
          </div>
        </>
      )}

      <h2>Nouvelle mesure</h2>
      <form className="card" onSubmit={save}>
        <div className="field">
          <label htmlFor="date">Date</label>
          <input
            id="date"
            type="date"
            required
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </div>
        <div className="row3">
          {FIELDS.map((f) => (
            <div className="field" key={f.key}>
              <label htmlFor={f.key}>
                {f.label} ({f.unit})
              </label>
              <input
                id={f.key}
                type="number"
                inputMode="decimal"
                step={f.step}
                placeholder="—"
                value={form[f.key] ?? ''}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              />
            </div>
          ))}
        </div>
        <button className="btn primary block" disabled={saving}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        <p className="tiny" style={{ marginTop: 10 }}>
          Laisse vide ce que tu ne mesures pas. Une saisie existante à la même date est remplacée.
        </p>
      </form>
    </>
  )
}
