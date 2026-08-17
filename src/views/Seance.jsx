import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { PROGRAM, getDay, rampSets } from '../program'
import ExerciseLink from '../components/ExerciseLink'

const todayISO = () => new Date().toISOString().slice(0, 10)

// Les séries d'échauffement et de travail d'un même exercice se numérotent
// toutes les deux à partir de 0 : elles occupent donc deux emplacements
// distincts dans l'état, comme elles occupent deux clés distinctes en base.
const slot = (exKey, warmup) => (warmup ? `${exKey}:w` : exKey)

// Le jour de la semaine suggère la séance, mais tu peux toujours en choisir une autre.
function suggestedDay() {
  const map = { 1: 'j1', 2: 'j2', 3: 'j3', 5: 'j4', 6: 'j5' }
  return map[new Date().getDay()] || 'j1'
}

export default function Seance({ onStartRest }) {
  const [dayKey, setDayKey] = useState(suggestedDay)
  const [workout, setWorkout] = useState(null)
  const [rows, setRows] = useState({}) // slot -> [{ weight, reps, rpe, id }]
  const [last, setLast] = useState({}) // exKey -> { date, sets: [] }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const day = useMemo(() => getDay(dayKey), [dayKey])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const keys = day.exercises.map((e) => e.key)

      const [allWorkouts, all] = await Promise.all([
        api.workouts.list(),
        api.sets.byExercises(keys),
      ])

      const todaysWorkout =
        allWorkouts.find((w) => w.day_key === dayKey && w.date === todayISO()) || null
      setWorkout(todaysWorkout)

      // Séries déjà saisies aujourd'hui pour cette séance
      const current = {}
      if (todaysWorkout) {
        for (const s of all.filter((x) => x.workout_id === todaysWorkout.id)) {
          ;(current[slot(s.exercise_key, s.warmup)] ||= [])[s.set_index] = {
            id: s.id,
            weight: String(s.weight ?? ''),
            reps: String(s.reps ?? ''),
            rpe: s.rpe == null ? '' : String(s.rpe),
          }
        }
      }

      // Dernière performance : la séance la plus récente qui n'est pas celle
      // d'aujourd'hui. Les échauffements en sont exclus — ce ne sont pas des
      // performances, et ils fausseraient les montées en charge calculées.
      const prev = {}
      for (const s of all) {
        if (s.warmup) continue
        if (todaysWorkout && s.workout_id === todaysWorkout.id) continue
        const e = (prev[s.exercise_key] ||= {
          workoutId: s.workout_id,
          date: s.performed_at,
          sets: [],
        })
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
    const created = await api.workouts.create(dayKey, todayISO())
    setWorkout(created)
    return created
  }

  function setField(slotKey, idx, field, value) {
    setRows((r) => {
      const list = [...(r[slotKey] || [])]
      list[idx] = { ...(list[idx] || {}), [field]: value }
      return { ...r, [slotKey]: list }
    })
  }

  /**
   * `suggestion` sert aux montées en charge : leurs champs restent vides mais la
   * charge calculée s'affiche en indication, et valider sans rien taper
   * enregistre cette indication. Un échauffement se fait donc en un geste.
   */
  async function validateSet(ex, idx, { warmup = false, suggestion = null } = {}) {
    const key = slot(ex.key, warmup)
    const row = rows[key]?.[idx] || {}

    const typedWeight = parseFloat(String(row.weight ?? '').replace(',', '.'))
    const typedReps = parseInt(row.reps, 10)
    const weight = Number.isNaN(typedWeight) ? suggestion?.weight : typedWeight
    const reps = Number.isNaN(typedReps) ? suggestion?.reps : typedReps
    if (weight == null || reps == null) return

    try {
      const w = await ensureWorkout()
      const payload = {
        workout_id: w.id,
        exercise_key: ex.key,
        set_index: idx,
        weight,
        reps,
        rpe: row.rpe ? parseFloat(String(row.rpe).replace(',', '.')) : null,
        warmup,
        performed_at: todayISO(),
      }

      if (row.id) {
        await api.sets.update(row.id, payload)
      } else {
        const created = await api.sets.create(payload)
        setField(key, idx, 'id', created.id)
        // Une suggestion validée devient une valeur affichée, plus une indication.
        setField(key, idx, 'weight', String(weight))
        setField(key, idx, 'reps', String(reps))
        // Pas de chrono après une montée en charge : on enchaîne.
        if (!warmup) onStartRest(ex.rest, ex.name)
      }
    } catch (e) {
      setError(e.message)
    }
  }

  async function unvalidateSet(ex, idx, warmup = false) {
    const key = slot(ex.key, warmup)
    const row = rows[key]?.[idx]
    if (!row?.id) return
    try {
      await api.sets.remove(row.id)
      setField(key, idx, 'id', undefined)
    } catch (e) {
      setError(e.message)
    }
  }

  // Le compteur ne suit que les séries de travail : l'échauffement n'est pas
  // le travail de la séance.
  const doneCount = day.exercises.reduce(
    (n, ex) => n + (rows[ex.key] || []).filter((r) => r?.id).length,
    0
  )
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

      {day.warmup?.length > 0 && <Echauffement items={day.warmup} />}

      {loading ? (
        <div className="spinner">Chargement…</div>
      ) : (
        <div className="card">
          {day.exercises.map((ex) => (
            <Exercice
              key={ex.key}
              ex={ex}
              rows={rows[ex.key] || []}
              warmRows={rows[slot(ex.key, true)] || []}
              last={last[ex.key]}
              onField={(idx, f, v, warmup) => setField(slot(ex.key, warmup), idx, f, v)}
              onValidate={(idx, opts) => validateSet(ex, idx, opts)}
              onUnvalidate={(idx, warmup) => unvalidateSet(ex, idx, warmup)}
            />
          ))}
        </div>
      )}
    </>
  )
}

/** Échauffement général de la séance : des consignes, rien à enregistrer. */
function Echauffement({ items }) {
  const [open, setOpen] = useState(true)

  return (
    <div className="card tight">
      <button
        className="btn ghost sm"
        style={{ padding: 0, width: '100%', textAlign: 'left' }}
        onClick={() => setOpen(!open)}
      >
        <span style={{ color: 'var(--ink)', fontWeight: 650 }}>
          {open ? '−' : '+'} Échauffement
        </span>
        <span className="tiny"> · avant la première série</span>
      </button>
      {open && (
        <ul className="warmlist">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Exercice({ ex, rows, warmRows, last, onField, onValidate, onUnvalidate }) {
  const [open, setOpen] = useState(false)

  // Charge de référence pour les montées en charge : la plus lourde de la
  // dernière séance sur cet exercice.
  const working = last?.sets?.length ? Math.max(...last.sets.map((s) => s.weight || 0)) : null
  const ramp = useMemo(() => rampSets(ex, working || null), [ex, working])

  return (
    <div className="exo">
      <div className="exo-head">
        <div style={{ minWidth: 0 }}>
          <div className="exo-name">
            <ExerciseLink ex={ex} /> {ex.star && <span className="star">★</span>}
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

      {ramp.length > 0 && (
        <>
          <div className="warm-title">
            Échauffement{' '}
            <span>{working ? 'montées en charge' : 'aucun historique, à toi de juger'}</span>
          </div>
          <div className="sets">
            {ramp.map((r, i) => (
              <SetRow
                key={i}
                ex={ex}
                idx={i}
                warmup
                row={warmRows[i] || {}}
                label={`É${i + 1}`}
                placeholders={{
                  weight: r.weight == null ? `≈${r.pct} %` : String(r.weight),
                  reps: String(r.reps),
                  rpe: '—',
                }}
                onField={(f, v) => onField(i, f, v, true)}
                onValidate={() => onValidate(i, { warmup: true, suggestion: r })}
                onUnvalidate={() => onUnvalidate(i, true)}
              />
            ))}
          </div>
        </>
      )}

      <div className="setlabels" aria-hidden="true">
        <span>#</span>
        <span>kg</span>
        <span>reps</span>
        <span>RPE</span>
        <span />
      </div>

      <div className="sets">
        {Array.from({ length: ex.sets }, (_, i) => (
          <SetRow
            key={i}
            ex={ex}
            idx={i}
            row={rows[i] || {}}
            label={String(i + 1)}
            placeholders={{ weight: '—', reps: ex.reps, rpe: ex.rpe }}
            onField={(f, v) => onField(i, f, v, false)}
            onValidate={() => onValidate(i, {})}
            onUnvalidate={() => onUnvalidate(i, false)}
          />
        ))}
      </div>
    </div>
  )
}

function SetRow({
  ex,
  idx,
  row,
  label,
  placeholders,
  warmup = false,
  onField,
  onValidate,
  onUnvalidate,
}) {
  const done = Boolean(row.id)
  const quoi = warmup ? `échauffement ${idx + 1}` : `série ${idx + 1}`

  return (
    <div className={`setrow${done ? ' done' : ''}${warmup ? ' warm' : ''}`}>
      <div className="idx">{label}</div>
      <input
        type="number"
        inputMode="decimal"
        step="0.5"
        placeholder={placeholders.weight}
        aria-label={`${ex.name} ${quoi}, charge en kg`}
        value={row.weight ?? ''}
        onChange={(e) => onField('weight', e.target.value)}
      />
      <input
        type="number"
        inputMode="numeric"
        placeholder={placeholders.reps}
        aria-label={`${ex.name} ${quoi}, répétitions`}
        value={row.reps ?? ''}
        onChange={(e) => onField('reps', e.target.value)}
      />
      <input
        type="number"
        inputMode="decimal"
        step="0.5"
        placeholder={placeholders.rpe}
        aria-label={`${ex.name} ${quoi}, RPE`}
        value={row.rpe ?? ''}
        onChange={(e) => onField('rpe', e.target.value)}
      />
      <button
        className={`ok${done ? ' done' : ''}`}
        onClick={() => (done ? onUnvalidate() : onValidate())}
        aria-label={done ? 'Annuler la validation' : 'Valider'}
        title={
          done ? 'Annuler' : warmup ? 'Valider la montée en charge' : 'Valider et démarrer le repos'
        }
      >
        ✓
      </button>
    </div>
  )
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
