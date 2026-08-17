import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { EXERCISES, estimate1RM, getExercise } from '../program'
import LineChartCard from '../components/LineChartCard'
import ExerciseLink from '../components/ExerciseLink'

const STARRED = EXERCISES.filter((e) => e.star)

export default function Progression() {
  const [exKey, setExKey] = useState(STARRED[0]?.key || EXERCISES[0].key)
  const [sets, setSets] = useState([])
  // Exercices ajoutés en séance hors programme : ils n'existent pas dans
  // program.js, sans cette liste ils seraient enregistrés mais introuvables ici.
  const [custom, setCustom] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mode, setMode] = useState('top') // 'top' = série la plus lourde · 'e1rm' = 1RM estimé
  const [showTable, setShowTable] = useState(false)

  const ex =
    getExercise(exKey) ||
    (() => {
      const c = custom.find((x) => x.exercise_key === exKey)
      return c ? { key: c.exercise_key, name: c.exercise_name } : null
    })()

  useEffect(() => {
    api.exercises
      .custom()
      .then(setCustom)
      .catch(() => setCustom([]))
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    api.sets
      .byExercises([exKey])
      .then((data) => {
        if (!cancelled) setSets(data)
      })
      .catch((e) => {
        if (!cancelled) setError(e.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [exKey])

  // Une ligne par date : la série la plus lourde, et le meilleur 1RM estimé.
  const series = useMemo(() => {
    const byDate = new Map()
    for (const s of sets) {
      // Une montée en charge n'est pas une performance : elle ne doit pas
      // entrer dans les courbes, ni dans le volume, ni dans le compte de séries.
      if (s.warmup) continue
      const cur = byDate.get(s.performed_at) || { top: 0, e1rm: 0, volume: 0, count: 0, best: null }
      if (s.weight > cur.top) {
        cur.top = s.weight
        cur.best = s
      }
      const e = estimate1RM(s.weight, s.reps)
      if (e && e > cur.e1rm) cur.e1rm = e
      cur.volume += (s.weight || 0) * (s.reps || 0)
      cur.count += 1
      byDate.set(s.performed_at, cur)
    }
    return [...byDate.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, v]) => ({
        date,
        label: new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'short',
        }),
        fullLabel: new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        }),
        top: v.top,
        e1rm: v.e1rm || null,
        volume: Math.round(v.volume),
        sets: v.count,
        bestReps: v.best?.reps,
      }))
  }, [sets])

  const first = series[0]
  const latest = series[series.length - 1]
  const key = mode === 'top' ? 'top' : 'e1rm'
  const delta = first && latest && first[key] && latest[key] ? latest[key] - first[key] : null

  return (
    <>
      <h1>Progression</h1>
      <p className="sub" style={{ marginBottom: 14 }}>
        En déficit calorique, maintenir tes charges est déjà un succès. Une courbe plate n'est pas
        un échec.
      </p>

      {error && <div className="banner">Erreur : {error}</div>}

      <div className="field">
        <label htmlFor="exo">Exercice</label>
        <select id="exo" value={exKey} onChange={(e) => setExKey(e.target.value)}>
          <optgroup label="Prioritaires pectoraux">
            {STARRED.map((e) => (
              <option key={e.key} value={e.key}>
                {e.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="Tous les exercices">
            {EXERCISES.filter((e) => !e.star).map((e) => (
              <option key={e.key} value={e.key}>
                {e.name}
              </option>
            ))}
          </optgroup>
          {custom.length > 0 && (
            <optgroup label="Hors programme">
              {custom.map((e) => (
                <option key={e.exercise_key} value={e.exercise_key}>
                  {e.exercise_name}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      <div className="chips" style={{ marginBottom: 14 }}>
        <button className={`chip${mode === 'top' ? ' on' : ''}`} onClick={() => setMode('top')}>
          Série la plus lourde
        </button>
        <button className={`chip${mode === 'e1rm' ? ' on' : ''}`} onClick={() => setMode('e1rm')}>
          1RM estimé
        </button>
      </div>

      {loading ? (
        <div className="spinner">Chargement…</div>
      ) : (
        <>
          <div className="stats" style={{ marginBottom: 12 }}>
            <div className="stat">
              <div className="v">{latest?.[key] ? `${latest[key]} kg` : '—'}</div>
              <div className="l">Dernière séance</div>
              {delta != null && delta !== 0 && (
                <div className={`d ${delta > 0 ? 'up' : 'down'}`}>
                  {delta > 0 ? '↑' : '↓'} {Math.abs(Math.round(delta * 10) / 10)} kg depuis le début
                </div>
              )}
            </div>
            <div className="stat">
              <div className="v">{series.length}</div>
              <div className="l">Séances enregistrées</div>
            </div>
            <div className="stat">
              <div className="v">{latest?.volume ? `${latest.volume} kg` : '—'}</div>
              <div className="l">Tonnage de la dernière séance</div>
            </div>
          </div>

          <div className="card">
            <div className="charthead">
              <h3>
                <ExerciseLink ex={ex} /> —{' '}
                {mode === 'top' ? 'charge la plus lourde' : '1RM estimé'}
              </h3>
              <button className="btn ghost sm" onClick={() => setShowTable((v) => !v)}>
                {showTable ? 'Graphique' : 'Tableau'}
              </button>
            </div>

            {showTable ? (
              <table className="data">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Top</th>
                    <th>1RM est.</th>
                    <th>Tonnage</th>
                  </tr>
                </thead>
                <tbody>
                  {series
                    .slice()
                    .reverse()
                    .map((r) => (
                      <tr key={r.date}>
                        <td>{r.label}</td>
                        <td>{r.top} kg</td>
                        <td>{r.e1rm ? `${r.e1rm} kg` : '—'}</td>
                        <td>{r.volume} kg</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            ) : (
              <LineChartCard
                data={series.filter((d) => d[key] != null)}
                dataKey={key}
                unit="kg"
                label={ex?.name}
                meta={(p) => `${p.sets} série${p.sets > 1 ? 's' : ''} · tonnage ${p.volume} kg`}
              />
            )}

            {mode === 'e1rm' && (
              <p className="tiny" style={{ marginTop: 10 }}>
                1RM estimé via la formule d'Epley. Ignoré au-delà de 12 répétitions, où l'estimation
                devient trop imprécise pour être utile.
              </p>
            )}
          </div>
        </>
      )}
    </>
  )
}
