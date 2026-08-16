import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabase'
import { EXERCISES, estimate1RM, getExercise } from '../program'
import LineChartCard from '../components/LineChartCard'

const STARRED = EXERCISES.filter((e) => e.star)

export default function Progression() {
  const [exKey, setExKey] = useState(STARRED[0]?.key || EXERCISES[0].key)
  const [sets, setSets] = useState([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('top') // 'top' = série la plus lourde · 'e1rm' = 1RM estimé
  const [showTable, setShowTable] = useState(false)

  const ex = getExercise(exKey)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    supabase
      .from('sets')
      .select('weight, reps, rpe, set_index, performed_at')
      .eq('exercise_key', exKey)
      .order('performed_at', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return
        if (!error) setSets(data || [])
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [exKey])

  // Une ligne par date : la série la plus lourde, et le meilleur 1RM estimé.
  const series = useMemo(() => {
    const byDate = new Map()
    for (const s of sets) {
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
                {ex?.name} — {mode === 'top' ? 'charge la plus lourde' : '1RM estimé'}
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
