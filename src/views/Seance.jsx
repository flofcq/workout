import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import {
  EXERCISES,
  PROGRAM,
  customExercise,
  customKey,
  getDay,
  getExercise,
} from '../program'
import { parseDate, shiftDate, todayISO } from '../date'

// Le programme est ancré sur les jours de la semaine. On s'en sert pour
// pré-sélectionner la séance, sans jamais l'imposer : jeudi et dimanche n'ont
// rien de prévu, et une séance peut toujours être décalée d'un jour.
const WEEKDAY_TO_DAY = { 1: 'j1', 2: 'j2', 3: 'j3', 5: 'j4', 6: 'j5' }

function suggestedDayFor(iso) {
  return WEEKDAY_TO_DAY[parseDate(iso).getDay()] || null
}

const weekdayOf = (iso) => parseDate(iso).toLocaleDateString('fr-FR', { weekday: 'long' })

function formatLong(iso) {
  return parseDate(iso).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export default function Seance({ onStartRest }) {
  const [date, setDate] = useState(todayISO)
  // Choix manuel de séance, mémorisé avec la date à laquelle il s'applique.
  // Changer de date l'invalide donc tout seul, et la suggestion du jour
  // reprend la main — sans effet de bord ni chargement en double.
  const [override, setOverride] = useState(null) // { date, dayKey }
  const [workout, setWorkout] = useState(null)
  const [rows, setRows] = useState({}) // exKey -> [{ weight, reps, rpe, id }]
  const [last, setLast] = useState({}) // exKey -> { date, sets: [] }
  // Exercices ajoutés en cours de séance, absents du plan du jour.
  const [extras, setExtras] = useState([])
  // Exercices hors programme déjà utilisés par le compte, pour les reproposer.
  const [knownCustom, setKnownCustom] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const dayKey =
    (override?.date === date ? override.dayKey : null) ||
    suggestedDayFor(date) ||
    PROGRAM[0].key

  const day = useMemo(() => getDay(dayKey), [dayKey])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const planned = day.exercises.map((e) => e.key)

      const allWorkouts = await api.workouts.list()
      const openWorkout =
        allWorkouts.find((w) => w.day_key === dayKey && w.date === date) || null

      // Deux requêtes distinctes, et c'est nécessaire : la première ne ramène
      // que les exercices du plan, elle ne peut donc pas voir ceux ajoutés à la
      // volée. La seconde ramène tout le contenu réel de la séance ouverte.
      const [plannedSets, sessionSets] = await Promise.all([
        api.sets.byExercises(planned),
        openWorkout ? api.sets.byWorkouts([openWorkout.id]) : Promise.resolve([]),
      ])

      // Exercices hors plan retrouvés dans la séance : on les réaffiche pour
      // que rouvrir la séance ne les fasse pas disparaître.
      const found = new Map()
      for (const s of sessionSets) {
        if (planned.includes(s.exercise_key) || found.has(s.exercise_key)) continue
        found.set(
          s.exercise_key,
          getExercise(s.exercise_key) ||
            customExercise(s.exercise_key, s.exercise_name || s.exercise_key)
        )
      }
      const extraList = [...found.values()]

      // Leur historique n'est pas dans plannedSets : sans ça, pas de rappel
      // « dernière fois » sur un exercice ajouté.
      const extraHistory = extraList.length
        ? await api.sets.byExercises(extraList.map((e) => e.key))
        : []

      const all = [...plannedSets, ...extraHistory]

      setWorkout(openWorkout)
      setExtras(extraList)

      // Séries déjà saisies pour la séance affichée
      const current = {}
      for (const s of sessionSets) {
        ;(current[s.exercise_key] ||= [])[s.set_index] = {
          id: s.id,
          weight: String(s.weight ?? ''),
          reps: String(s.reps ?? ''),
          rpe: s.rpe == null ? '' : String(s.rpe),
        }
      }

      // Dernière performance : la séance la plus récente *avant* la date affichée.
      // Comparer aux dates et pas au workout_id est indispensable depuis qu'on
      // peut remonter dans le passé — sinon, en saisissant une séance d'il y a
      // deux semaines, on verrait comme « dernière fois » une séance postérieure.
      // `all` est trié par performed_at décroissant : le premier trouvé est le bon.
      const prev = {}
      for (const s of all) {
        if (s.performed_at >= date) continue
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
  }, [day, dayKey, date])

  useEffect(() => {
    load()
  }, [load])

  // Chargé une fois : sert à reproposer une machine déjà utilisée un autre jour
  // plutôt que d'en ressaisir le nom, ce qui créerait une clé différente.
  useEffect(() => {
    api.exercises
      .custom()
      .then(setKnownCustom)
      .catch(() => setKnownCustom([])) // simple confort : ne doit rien bloquer
  }, [])

  function addExercise(ex) {
    setExtras((list) => (list.some((e) => e.key === ex.key) ? list : [...list, ex]))
  }

  // Retirable tant qu'aucune série n'y est validée : au-delà, il faut dévalider
  // les séries, pour ne pas effacer des données d'un simple clic.
  function removeExtra(key) {
    setExtras((list) => list.filter((e) => e.key !== key))
  }

  // Forme fonctionnelle obligatoire : sans elle, tapoter la flèche plusieurs
  // fois de suite ne recule que d'un jour, chaque clic repartant de la date
  // figée dans son rendu.
  const shiftBy = (days) => setDate((current) => shiftDate(current, days))

  async function ensureWorkout() {
    if (workout) return workout
    const created = await api.workouts.create(dayKey, date)
    setWorkout(created)
    return created
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
        performed_at: date,
        // Seuls les exercices hors programme portent leur libellé : ceux du
        // programme tirent le leur de src/program.js.
        ...(ex.custom ? { exercise_name: ex.name } : null),
      }

      if (row.id) {
        await api.sets.update(row.id, payload)
      } else {
        const created = await api.sets.create(payload)
        setField(ex.key, idx, 'id', created.id)
        onStartRest(ex.rest, ex.name)
      }
    } catch (e) {
      setError(e.message)
    }
  }

  async function unvalidateSet(ex, idx) {
    const row = rows[ex.key]?.[idx]
    if (!row?.id) return
    try {
      await api.sets.remove(row.id)
      setField(ex.key, idx, 'id', undefined)
    } catch (e) {
      setError(e.message)
    }
  }

  const doneCount = Object.values(rows).flat().filter((r) => r?.id).length
  const totalSets = day.exercises.reduce((n, e) => n + e.sets, 0)

  return (
    <>
      <div className="datenav">
        <button className="btn sm" onClick={() => shiftBy(-1)} aria-label="Jour précédent">
          ◀
        </button>
        <input
          type="date"
          value={date}
          max={todayISO()}
          aria-label="Date de la séance"
          onChange={(e) => e.target.value && setDate(e.target.value)}
        />
        <button
          className="btn sm"
          onClick={() => shiftBy(1)}
          disabled={date >= todayISO()}
          aria-label="Jour suivant"
        >
          ▶
        </button>
      </div>

      <p className="sub datenav-day">
        <span className="datenav-date">{formatLong(date)}</span>
        {date !== todayISO() && (
          <button className="btn ghost sm" onClick={() => setDate(todayISO())}>
            Revenir à aujourd'hui
          </button>
        )}
      </p>

      <h1>{day.title}</h1>
      <p className="sub" style={{ marginBottom: 14 }}>
        {day.focus} · {doneCount}/{totalSets} séries validées
      </p>

      <div className="field">
        <label htmlFor="seance">Séance</label>
        <select
          id="seance"
          value={dayKey}
          onChange={(e) => setOverride({ date, dayKey: e.target.value })}
        >
          {PROGRAM.map((d) => (
            <option key={d.key} value={d.key}>
              {d.title}
            </option>
          ))}
        </select>
        <p className="tiny" style={{ marginTop: 6 }}>
          {suggestedDayFor(date) === dayKey
            ? `C'est la séance prévue ${weekdayOf(date)}.`
            : suggestedDayFor(date)
              ? `Séance décalée : ${getDay(suggestedDayFor(date)).title} était prévue ce jour-là.`
              : `Aucune séance n'est prévue ${weekdayOf(date)} — choisis celle que tu as faite.`}
        </p>
      </div>

      {error && <div className="banner">Erreur : {error}</div>}
      {day.note && <div className="banner">{day.note}</div>}

      {loading ? (
        <div className="spinner">Chargement…</div>
      ) : (
        <>
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

          {extras.length > 0 && (
            <>
              <h2>Ajoutés à la séance</h2>
              <div className="card">
                {extras.map((ex) => (
                  <Exercice
                    key={ex.key}
                    ex={ex}
                    rows={rows[ex.key] || []}
                    last={last[ex.key]}
                    onField={(idx, f, v) => setField(ex.key, idx, f, v)}
                    onValidate={(idx) => validateSet(ex, idx)}
                    onUnvalidate={(idx) => unvalidateSet(ex, idx)}
                    onRemove={
                      (rows[ex.key] || []).some((r) => r?.id)
                        ? null
                        : () => removeExtra(ex.key)
                    }
                  />
                ))}
              </div>
            </>
          )}

          <AjoutExercice
            day={day}
            extras={extras}
            knownCustom={knownCustom}
            onAdd={addExercise}
          />
        </>
      )}
    </>
  )
}

/**
 * Ajout d'un exercice absent du plan du jour — machine occupée, remplacement
 * improvisé. Deux sources : le reste du programme (clés déjà connues, donc
 * progression continue), ou un nom libre pour une machine que le programme
 * ignore.
 */
function AjoutExercice({ day, extras, knownCustom, onAdd }) {
  const [open, setOpen] = useState(false)
  const [nom, setNom] = useState('')

  const pris = new Set([...day.exercises.map((e) => e.key), ...extras.map((e) => e.key)])

  const duProgramme = EXERCISES.filter((e) => !pris.has(e.key))
  const dejaUtilises = knownCustom.filter((e) => !pris.has(e.exercise_key))

  function ajouterLibre(e) {
    e.preventDefault()
    const key = customKey(nom)
    if (!key) return
    onAdd(customExercise(key, nom.trim()))
    setNom('')
    setOpen(false)
  }

  if (!open) {
    return (
      <button className="btn block" style={{ marginTop: 4 }} onClick={() => setOpen(true)}>
        + Ajouter un exercice
      </button>
    )
  }

  return (
    <div className="card">
      <h3>Ajouter un exercice</h3>
      <p className="tiny" style={{ marginTop: 4, marginBottom: 12 }}>
        Machine occupée, matériel manquant : enregistre ce que tu as fait à la place. Ça ne
        change rien au programme, seulement à cette séance.
      </p>

      <div className="field">
        <label htmlFor="ajout-exo">Depuis ton programme ou tes habitudes</label>
        <select
          id="ajout-exo"
          value=""
          onChange={(e) => {
            const [source, key] = e.target.value.split(':')
            if (!key) return
            if (source === 'prog') onAdd(getExercise(key))
            else {
              const c = knownCustom.find((x) => x.exercise_key === key)
              onAdd(customExercise(key, c?.exercise_name || key))
            }
            setOpen(false)
          }}
        >
          <option value="">Choisir…</option>
          {dejaUtilises.length > 0 && (
            <optgroup label="Déjà fait hors programme">
              {dejaUtilises.map((e) => (
                <option key={e.exercise_key} value={`libre:${e.exercise_key}`}>
                  {e.exercise_name}
                </option>
              ))}
            </optgroup>
          )}
          {PROGRAM.map((d) => {
            const dispo = duProgramme.filter((e) => e.dayKey === d.key)
            if (!dispo.length) return null
            return (
              <optgroup key={d.key} label={d.title}>
                {dispo.map((e) => (
                  <option key={e.key} value={`prog:${e.key}`}>
                    {e.name}
                  </option>
                ))}
              </optgroup>
            )
          })}
        </select>
      </div>

      <form className="field" onSubmit={ajouterLibre}>
        <label htmlFor="ajout-nom">Ou une machine absente du programme</label>
        <input
          id="ajout-nom"
          type="text"
          maxLength={80}
          placeholder="Presse à cuisses horizontale"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
        />
        <p className="tiny" style={{ marginTop: 6 }}>
          Réutilise le même nom d'une fois sur l'autre : c'est lui qui relie les séances et
          fait apparaître la courbe dans l'onglet Progression.
        </p>
        <button className="btn primary block" style={{ marginTop: 10 }} disabled={!customKey(nom)}>
          Ajouter
        </button>
      </form>

      <button className="btn ghost sm block" onClick={() => setOpen(false)}>
        Annuler
      </button>
    </div>
  )
}

function Exercice({ ex, rows, last, onField, onValidate, onUnvalidate, onRemove }) {
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

      {/* En fin de bloc, à l'écart du bouton de consigne : c'est une action
          destructive. Absent dès qu'une série est validée — il faut alors
          dévalider explicitement, plutôt que perdre la saisie d'un clic. */}
      {onRemove && (
        <button
          className="btn ghost sm danger"
          style={{ paddingLeft: 0, marginTop: 10 }}
          onClick={onRemove}
        >
          Retirer de la séance
        </button>
      )}
    </div>
  )
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
