import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabase'
import { PROGRAM, getDay } from '../program'

const todayISO = () => new Date().toISOString().slice(0, 10)

// Le jour de la semaine suggère la séance, mais tu peux toujours en choisir une autre.
function suggestedDay() {
  const map = { 1: 'j1', 2: 'j2', 3: 'j3', 5: 'j4', 6: 'j5' }
  return map[new Date().getDay()] || 'j1'
}

export default function Seance({ onStartRest }) {
  const [dayKey, setDayKey] = useState(suggestedDay)
  const [workout, setWorkout] = useState(null)
  const [rows, setRows] = useState({}) // exKey -> [{ weight, reps, rpe, id }]
  const [last, setLast] = useState({}) // exKey -> { date, sets: [] }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const day = useMemo(() => getDay(dayKey), [dayKey])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const keys = day.exercises.map((e) => e.key)

      const [wRes, sRes] = await Promise.all([
        supabase
          .from('workouts')
          .select('*')
          .eq('day_key', dayKey)
          .eq('date', todayISO())
          .maybeSingle(),
        supabase
          .from('sets')
          .select('id, exercise_key, set_index, weight, reps, rpe, performed_at, workout_id')
          .in('exercise_key', keys)
          .order('performed_at', { ascending: false })
          .order('set_index', { ascending: true })
          .limit(600),
      ])

      if (wRes.error) throw wRes.error
      if (sRes.error) throw sRes.error

      const todaysWorkout = wRes.data
      setWorkout(todaysWorkout)

      const all = sRes.data || []

      // Séries déjà saisies aujourd'hui pour cette séance
      const current = {}
      if (todaysWorkout) {
        for (const s of all.filter((x) => x.workout_id === todaysWorkout.id)) {
          ;(current[s.exercise_key] ||= [])[s.set_index] = {
            id: s.id,
            weight: String(s.weight ?? ''),
            reps: String(s.reps ?? ''),
            rpe: s.rpe == null ? '' : String(s.rpe),
          }
        }
      }

      // Dernière performance : la séance la plus récente qui n'est pas celle d'aujourd'hui
      const prev = {}
      for (const s of all) {
        if (todaysWorkout && s.workout_id === todaysWorkout.id) continue
        const e = (prev[s.exercise_key] ||= { workoutId: s.workout_id, date: s.performed_at, sets: [] })
        if (e.workoutId === s.workout_id) e.sets.push(s)
      }

      setRows(current)
      setLast(prev)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [day, dayKey])

  useEffect(() => {
    load()
  }, [load])

  async function ensureWorkout() {
    if (workout) return workout
    const { data, error } = await supabase
      .from('workouts')
      .insert({ day_key: dayKey, date: todayISO() })
      .select()
      .single()
    if (error) throw error
    setWorkout(data)
    return data
  }

  function setField(exKey, idx, field, value) {
    setRows((r) => {
      const list = [...(r[exKey] || [])]
      list[idx] = { ...(list[idx] || {}), [field]: value }
      return { ...r, [exKey]: list }
    })
  }

  async function validateSet(ex, idx) {
    const row = rows[ex.key]?.[idx] || {}
    const weight = parseFloat(String(row.weight).replace(',', '.'))
    const reps = parseInt(row.reps, 10)
    if (Number.isNaN(weight) || Number.isNaN(reps)) return

    try {
      const w = await ensureWorkout()
      const payload = {
        workout_id: w.id,
        exercise_key: ex.key,
        set_index: idx,
        weight,
        reps,
        rpe: row.rpe ? parseFloat(String(row.rpe).replace(',', '.')) : null,
        performed_at: todayISO(),
      }

      if (row.id) {
        const { error } = await supabase.from('sets').update(payload).eq('id', row.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('sets').insert(payload).select().single()
        if (error) throw error
        setField(ex.key, idx, 'id', data.id)
        onStartRest(ex.rest, ex.name)
      }
    } catch (e) {
      setError(e.message)
    }
  }

  async function unvalidateSet(ex, idx) {
    const row = rows[ex.key]?.[idx]
    if (!row?.id) return
    const { error } = await supabase.from('sets').delete().eq('id', row.id)
    if (error) return setError(error.message)
    setField(ex.key, idx, 'id', undefined)
  }

  const doneCount = Object.values(rows).flat().filter((r) => r?.id).length
  const totalSets = day.exercises.reduce((n, e) => n + e.sets, 0)

  return (
    <>
      <h1>{day.title}</h1>
      <p className="sub" style={{ marginBottom: 14 }}>
        {day.day} · {day.focus} · {doneCount}/{totalSets} séries validées
      </p>

      <div className="chips" style={{ marginBottom: 16 }}>
        {PROGRAM.map((d) => (
          <button
            key={d.key}
            className={`chip${d.key === dayKey ? ' on' : ''}`}
            onClick={() => setDayKey(d.key)}
          >
            {d.key.toUpperCase()}
          </button>
        ))}
      </div>

      {error && <div className="banner">Erreur : {error}</div>}
      {day.note && <div className="banner">{day.note}</div>}

      {loading ? (
        <div className="spinner">Chargement…</div>
      ) : (
        <div className="card">
          {day.exercises.map((ex) => (
            <Exercice
              key={ex.key}
              ex={ex}
              rows={rows[ex.key] || []}
              last={last[ex.key]}
              onField={(idx, f, v) => setField(ex.key, idx, f, v)}
              onValidate={(idx) => validateSet(ex, idx)}
              onUnvalidate={(idx) => unvalidateSet(ex, idx)}
            />
          ))}
        </div>
      )}
    </>
  )
}

function Exercice({ ex, rows, last, onField, onValidate, onUnvalidate }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="exo">
      <div className="exo-head">
        <div style={{ minWidth: 0 }}>
          <div className="exo-name">
            {ex.name} {ex.star && <span className="star">★</span>}
          </div>
          <div className="exo-mus">{ex.muscles}</div>
        </div>
        <div className="exo-spec">
          {ex.sets} × {ex.reps}
          <br />
          RPE {ex.rpe}
        </div>
      </div>

      <button className="btn ghost sm" style={{ padding: '4px 0', marginTop: 6 }} onClick={() => setOpen(!open)}>
        {open ? '− Masquer la consigne' : '+ Consigne technique'}
      </button>
      {open && <div className="exo-cue">{ex.cue}</div>}

      {last && (
        <div className="exo-last">
          Dernière fois ({formatDate(last.date)}) :{' '}
          <b>
            {last.sets
              .slice()
              .sort((a, b) => a.set_index - b.set_index)
              .map((s) => `${s.weight}kg × ${s.reps}`)
              .join(' · ')}
          </b>
        </div>
      )}

      <div className="setlabels" aria-hidden="true">
        <span>#</span>
        <span>kg</span>
        <span>reps</span>
        <span>RPE</span>
        <span />
      </div>

      <div className="sets">
        {Array.from({ length: ex.sets }, (_, i) => {
          const row = rows[i] || {}
          const done = Boolean(row.id)
          return (
            <div className={`setrow${done ? ' done' : ''}`} key={i}>
              <div className="idx">{i + 1}</div>
              <input
                type="number"
                inputMode="decimal"
                step="0.5"
                placeholder="—"
                aria-label={`${ex.name} série ${i + 1}, charge en kg`}
                value={row.weight ?? ''}
                onChange={(e) => onField(i, 'weight', e.target.value)}
              />
              <input
                type="number"
                inputMode="numeric"
                placeholder={ex.reps}
                aria-label={`${ex.name} série ${i + 1}, répétitions`}
                value={row.reps ?? ''}
                onChange={(e) => onField(i, 'reps', e.target.value)}
              />
              <input
                type="number"
                inputMode="decimal"
                step="0.5"
                placeholder={ex.rpe}
                aria-label={`${ex.name} série ${i + 1}, RPE`}
                value={row.rpe ?? ''}
                onChange={(e) => onField(i, 'rpe', e.target.value)}
              />
              <button
                className={`ok${done ? ' done' : ''}`}
                onClick={() => (done ? onUnvalidate(i) : onValidate(i))}
                aria-label={done ? 'Annuler la validation' : 'Valider la série'}
                title={done ? 'Annuler' : 'Valider et démarrer le repos'}
              >
                ✓
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
