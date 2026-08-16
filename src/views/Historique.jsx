import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { getDay, getExercise } from '../program'

export default function Historique() {
  const [workouts, setWorkouts] = useState([])
  const [setsByWorkout, setSetsByWorkout] = useState({})
  const [openId, setOpenId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: ws } = await supabase
        .from('workouts')
        .select('*')
        .order('date', { ascending: false })
        .limit(60)

      const ids = (ws || []).map((w) => w.id)
      let grouped = {}
      if (ids.length) {
        const { data: ss } = await supabase
          .from('sets')
          .select('*')
          .in('workout_id', ids)
          .order('set_index', { ascending: true })
        for (const s of ss || []) (grouped[s.workout_id] ||= []).push(s)
      }

      setWorkouts(ws || [])
      setSetsByWorkout(grouped)
      setLoading(false)
    }
    load()
  }, [])

  async function remove(id) {
    await supabase.from('workouts').delete().eq('id', id)
    setWorkouts((w) => w.filter((x) => x.id !== id))
  }

  if (loading) return <div className="spinner">Chargement…</div>

  return (
    <>
      <h1>Historique</h1>
      <p className="sub" style={{ marginBottom: 14 }}>
        {workouts.length} séance{workouts.length > 1 ? 's' : ''} enregistrée
        {workouts.length > 1 ? 's' : ''}.
      </p>

      {workouts.length === 0 && (
        <div className="empty">
          Aucune séance pour l'instant. Va dans l'onglet Séance et valide ta première série.
        </div>
      )}

      {workouts.map((w) => {
        const day = getDay(w.day_key)
        const sets = setsByWorkout[w.id] || []
        const tonnage = sets.reduce((n, s) => n + (s.weight || 0) * (s.reps || 0), 0)
        const open = openId === w.id

        const byEx = {}
        for (const s of sets) (byEx[s.exercise_key] ||= []).push(s)

        return (
          <div className="card tight" key={w.id}>
            <button
              className="btn ghost"
              style={{ width: '100%', textAlign: 'left', padding: 0 }}
              onClick={() => setOpenId(open ? null : w.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 650, color: 'var(--ink)' }}>
                    {day?.title || w.day_key}
                  </div>
                  <div className="tiny" style={{ marginTop: 2 }}>
                    {formatLong(w.date)} · {sets.length} séries · {Math.round(tonnage)} kg de tonnage
                  </div>
                </div>
                <span className="tag grey">{w.day_key.toUpperCase()}</span>
              </div>
            </button>

            {open && (
              <div style={{ marginTop: 12 }}>
                <table className="data">
                  <thead>
                    <tr>
                      <th>Exercice</th>
                      <th>Séries</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(byEx).map(([k, list]) => (
                      <tr key={k}>
                        <td style={{ fontVariantNumeric: 'normal' }}>
                          {getExercise(k)?.name || k}
                        </td>
                        <td>
                          {list
                            .sort((a, b) => a.set_index - b.set_index)
                            .map((s) => `${s.weight}×${s.reps}`)
                            .join('  ·  ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button
                  className="btn ghost sm danger"
                  style={{ marginTop: 10, paddingLeft: 0 }}
                  onClick={() => remove(w.id)}
                >
                  Supprimer cette séance
                </button>
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}

function formatLong(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  })
}
