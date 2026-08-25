import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import {
  EXERCISES,
  PROGRAM,
  customExercise,
  customKey,
  getDay,
  getExercise,
  rampSets,
} from '../program'
import { splitMuscleText } from '../muscles'
import { parseDate, shiftDate, todayISO } from '../date'
import { fmtDuration, fmtRest } from '../format'
import { groupSessions } from '../history'
import ExerciseLink from '../components/ExerciseLink'
import HistoriqueExercice from '../components/HistoriqueExercice'

// Le programme est ancré sur les jours de la semaine. On s'en sert pour
// pré-sélectionner la séance, sans jamais l'imposer : jeudi et dimanche n'ont
// rien de prévu, et une séance peut toujours être décalée d'un jour.
const WEEKDAY_TO_DAY = { 1: 'j1', 2: 'j2', 3: 'j3', 5: 'j4', 6: 'j5' }

// Les séries d'échauffement et de travail d'un même exercice se numérotent
// toutes les deux à partir de 0 : elles occupent donc deux emplacements
// distincts dans l'état, comme elles occupent deux clés distinctes en base.
const slot = (exKey, warmup) => (warmup ? `${exKey}:w` : exKey)

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

export default function Seance({ onStartRest, onOpenMuscle, onOpenHistory }) {
  const [date, setDate] = useState(todayISO)
  // Choix manuel de séance, mémorisé avec la date à laquelle il s'applique.
  // Changer de date l'invalide donc tout seul, et la suggestion du jour
  // reprend la main — sans effet de bord ni chargement en double.
  const [override, setOverride] = useState(null) // { date, dayKey }
  const [workout, setWorkout] = useState(null)
  const [rows, setRows] = useState({}) // slot -> [{ weight, reps, rpe, id }]
  const [last, setLast] = useState({}) // exKey -> { date, sets: [] }
  // Toutes les séances antérieures à la date affichée, par exercice : le
  // rappel « dernière fois » n'en montre qu'une, l'historique déplié les a
  // toutes. Même source que `last`, pour ne pas diverger.
  const [history, setHistory] = useState({})
  // Exercices ajoutés en cours de séance, absents du plan du jour.
  const [extras, setExtras] = useState([])
  // Exercices hors programme déjà utilisés par le compte, pour les reproposer.
  const [knownCustom, setKnownCustom] = useState([])
  const [best, setBest] = useState({}) // exKey -> charge la plus lourde avant aujourd'hui
  const [pending, setPending] = useState(false)
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
        ;(current[slot(s.exercise_key, s.warmup)] ||= [])[s.set_index] = {
          id: s.id,
          weight: String(s.weight ?? ''),
          reps: String(s.reps ?? ''),
          rpe: s.rpe == null ? '' : String(s.rpe),
        }
      }

      // Dernière performance : la séance la plus récente *avant* la date
      // affichée. Comparer aux dates et pas au workout_id est indispensable
      // depuis qu'on peut remonter dans le passé — sinon, en saisissant une
      // séance d'il y a deux semaines, on verrait comme « dernière fois » une
      // séance postérieure. Les échauffements sont exclus : ce ne sont pas des
      // performances, et ils fausseraient les montées en charge calculées.
      // `all` est trié par performed_at décroissant : le premier trouvé est le bon.
      const prev = {}
      const hist = {}
      const keys = new Set(all.map((s) => s.exercise_key))
      for (const k of keys) {
        const sessions = groupSessions(all.filter((s) => s.exercise_key === k), { before: date })
        hist[k] = sessions
        const newest = sessions.find((s) => s.working.length > 0)
        if (newest) prev[k] = { workoutId: newest.id, date: newest.date, sets: newest.working }
      }

      // Meilleure charge par exercice avant la date affichée : la référence qui
      // permet d'annoncer un record dans le bilan. Même filtre par date que
      // `prev`, sinon ouvrir une séance ancienne la comparerait à des séances
      // postérieures et n'annoncerait jamais de record.
      const tops = {}
      for (const s2 of all) {
        if (s2.warmup) continue
        if (s2.performed_at >= date) continue
        if (!(tops[s2.exercise_key] >= s2.weight)) tops[s2.exercise_key] = s2.weight
      }

      setRows(current)
      setLast(prev)
      setHistory(hist)
      setBest(tops)
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

  // Démarrer / terminer / reprendre. L'horodatage est toujours celui du
  // serveur : voir api/workouts/[id].js.
  async function stamp(patch) {
    setPending(true)
    setError(null)
    try {
      const w = await ensureWorkout()
      const updated = await api.workouts.update(w.id, patch)
      setWorkout((cur) => ({ ...cur, ...updated }))
    } catch (e) {
      setError(e.message)
    } finally {
      setPending(false)
    }
  }

  async function startSession() {
    // Créer la séance suffit : la route pose started_at à l'insertion. Le PATCH
    // ne sert qu'aux séances déjà créées sans heure de début.
    if (!workout) {
      setPending(true)
      try {
        const created = await api.workouts.create(dayKey, todayISO())
        setWorkout(created)
        if (created.started_at) return
      } catch (e) {
        setError(e.message)
        return
      } finally {
        setPending(false)
      }
    }
    await stamp({ started_at: 'now', ended_at: null })
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
        // `date` et non todayISO() : la séance affichée n'est pas forcément
        // celle du jour depuis que la navigation est calendaire.
        performed_at: date,
        // Seuls les exercices hors programme portent leur libellé : ceux du
        // programme tirent le leur de src/program.js.
        ...(ex.custom ? { exercise_name: ex.name } : null),
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

  // Le compteur ne suit que les séries de travail — `rows[ex.key]` est
  // l'emplacement de travail, l'échauffement vit sous `ex.key:w` et n'est pas
  // le travail de la séance. Les exercices ajoutés à la volée comptent, eux :
  // les exclure afficherait « 12/19 » alors que tu as bien fait 15 séries.
  const compté = [...day.exercises, ...extras]
  const doneCount = compté.reduce(
    (n, ex) => n + (rows[ex.key] || []).filter((r) => r?.id).length,
    0
  )
  const totalSets = compté.reduce((n, e) => n + e.sets, 0)

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

      <BarreSeance
        workout={workout}
        pending={pending}
        onStart={startSession}
        onFinish={() => stamp({ ended_at: 'now' })}
        onReopen={() => stamp({ ended_at: null })}
      />

      {error && <div className="banner">Erreur : {error}</div>}

      {workout?.ended_at && (
        <Bilan day={day} workout={workout} rows={rows} last={last} best={best} />
      )}

      {day.note && <div className="banner">{day.note}</div>}

      {day.warmup?.length > 0 && <Echauffement items={day.warmup} />}

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
                warmRows={rows[slot(ex.key, true)] || []}
                last={last[ex.key]}
                history={history[ex.key] || []}
                onField={(idx, f, v, warmup) => setField(slot(ex.key, warmup), idx, f, v)}
                onValidate={(idx, opts) => validateSet(ex, idx, opts)}
                onUnvalidate={(idx, warmup) => unvalidateSet(ex, idx, warmup)}
                onOpenMuscle={onOpenMuscle}
                onOpenHistory={onOpenHistory}
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
                    warmRows={rows[slot(ex.key, true)] || []}
                    last={last[ex.key]}
                    history={history[ex.key] || []}
                    onField={(idx, f, v, warmup) => setField(slot(ex.key, warmup), idx, f, v)}
                    onValidate={(idx, opts) => validateSet(ex, idx, opts)}
                    onUnvalidate={(idx, warmup) => unvalidateSet(ex, idx, warmup)}
                    onOpenMuscle={onOpenMuscle}
                    onOpenHistory={onOpenHistory}
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

function Exercice({
  ex,
  rows,
  warmRows,
  last,
  history = [],
  onField,
  onValidate,
  onUnvalidate,
  onRemove,
  onOpenMuscle,
  onOpenHistory,
}) {
  const [open, setOpen] = useState(false)
  const [histOpen, setHistOpen] = useState(false)
  const histCount = history.filter((s) => s.working.length > 0).length

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
          <MusclesLies texte={ex.muscles} onOpen={onOpenMuscle} />
        </div>
        <div className="exo-spec">
          {ex.sets} × {ex.reps}
          <br />
          RPE {ex.rpe}
          <br />
          repos {fmtRest(ex.rest)}
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

      {histCount > 0 && (
        <>
          <button
            className="btn ghost sm ex-hist-toggle"
            onClick={() => setHistOpen(!histOpen)}
          >
            {histOpen
              ? '− Masquer l\'historique'
              : `+ Historique (${histCount} séance${histCount > 1 ? 's' : ''})`}
          </button>
          {histOpen && (
            <>
              <HistoriqueExercice sessions={history} />
              {onOpenHistory && (
                <button
                  type="button"
                  className="btn ghost sm"
                  style={{ paddingLeft: 0 }}
                  onClick={() => onOpenHistory(ex.key)}
                >
                  Voir la courbe dans Progression
                </button>
              )}
            </>
          )}
        </>
      )}

      {ramp.length > 0 && (
        <>
          <div className="warm-title">
            Échauffement{' '}
            <span>
              {working ? 'montées en charge' : 'aucun historique, à toi de juger'} · 30 à 60 s de
              repos
            </span>
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

/**
 * La ligne « muscles » d'un exercice, avec les muscles reconnus rendus
 * cliquables. Le texte d'origine est conservé mot pour mot : on n'affiche
 * jamais le libellé de la fiche à la place, « deltoïde antérieur » resterait
 * sinon un simple « Deltoïde » et perdrait sa précision.
 */
function MusclesLies({ texte, onOpen }) {
  const segments = useMemo(() => splitMuscleText(texte), [texte])

  // Sans gestionnaire (mode démo d'un composant isolé, ou futur réemploi),
  // on retombe sur du texte simple plutôt que des boutons inertes.
  if (!onOpen) return <div className="exo-mus">{texte}</div>

  return (
    <div className="exo-mus">
      {segments.map((s, i) =>
        s.muscleKey ? (
          <button
            key={i}
            type="button"
            className="mus-link"
            onClick={() => onOpen(s.muscleKey)}
            title={`Voir la fiche ${s.text}`}
          >
            {s.text}
          </button>
        ) : (
          <span key={i}>{s.text}</span>
        )
      )}
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

/** Bouton global de début et de fin de séance, avec le temps écoulé. */
function BarreSeance({ workout, pending, onStart, onFinish, onReopen }) {
  const started = workout?.started_at
  const ended = workout?.ended_at

  if (!started) {
    return (
      <button
        className="btn primary block"
        style={{ marginBottom: 12 }}
        onClick={onStart}
        disabled={pending}
      >
        ▶ Démarrer la séance
      </button>
    )
  }

  if (ended) {
    return (
      <div className="sessionbar over">
        <div>
          <div className="t">{fmtDuration(new Date(ended) - new Date(started))}</div>
          <div className="l">Séance terminée</div>
        </div>
        <button className="btn sm" onClick={onReopen} disabled={pending}>
          Reprendre
        </button>
      </div>
    )
  }

  return (
    <div className="sessionbar">
      <div>
        <div className="t">
          <Elapsed from={started} />
        </div>
        <div className="l">Séance en cours</div>
      </div>
      <button className="btn sm" onClick={onFinish} disabled={pending}>
        Terminer
      </button>
    </div>
  )
}

/** Isolé dans son composant pour que la seconde qui tourne ne réaffiche que lui. */
function Elapsed({ from }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  return fmtDuration(now - new Date(from).getTime())
}

/**
 * Bilan de fin de séance. Tout est recalculé depuis les séries validées du
 * jour : la base ne stocke rien de plus que les deux horodatages.
 */
function Bilan({ day, workout, rows, last, best }) {
  const stats = useMemo(() => {
    let sets = 0
    let warmSets = 0
    let tonnage = 0
    let rpeSum = 0
    let rpeCount = 0
    let exercises = 0
    const records = []

    for (const ex of day.exercises) {
      const done = (rows[ex.key] || []).filter((r) => r?.id)
      warmSets += (rows[`${ex.key}:w`] || []).filter((r) => r?.id).length
      if (!done.length) continue

      exercises += 1
      let top = 0
      for (const r of done) {
        const kg = parseFloat(String(r.weight).replace(',', '.')) || 0
        const reps = parseInt(r.reps, 10) || 0
        sets += 1
        tonnage += kg * reps
        if (kg > top) top = kg
        const rpe = parseFloat(String(r.rpe).replace(',', '.'))
        if (!Number.isNaN(rpe)) {
          rpeSum += rpe
          rpeCount += 1
        }
      }

      // Un record se compare à un historique : sans passé sur l'exercice, il
      // n'y a rien à annoncer.
      if (best[ex.key] != null && top > best[ex.key]) {
        records.push({ key: ex.key, name: ex.name, top, previous: best[ex.key] })
      }
    }

    // Tonnage de la fois précédente, exercice par exercice, échauffements exclus.
    const prevTonnage = Object.values(last).reduce(
      (n, e) => n + e.sets.reduce((m, s) => m + (s.weight || 0) * (s.reps || 0), 0),
      0
    )

    const ms =
      workout.started_at && workout.ended_at
        ? new Date(workout.ended_at) - new Date(workout.started_at)
        : null

    return {
      sets,
      warmSets,
      exercises,
      records,
      tonnage: Math.round(tonnage),
      prevTonnage: Math.round(prevTonnage),
      plannedSets: day.exercises.reduce((n, e) => n + e.sets, 0),
      rpe: rpeCount ? Math.round((rpeSum / rpeCount) * 10) / 10 : null,
      ms,
      perSet: ms && sets ? ms / sets : null,
    }
  }, [day, rows, last, best, workout])

  const deltaTonnage =
    stats.prevTonnage > 0 && stats.tonnage > 0
      ? Math.round(((stats.tonnage - stats.prevTonnage) / stats.prevTonnage) * 100)
      : null

  return (
    <div className="card">
      <h3>Bilan de la séance</h3>
      <p className="tiny" style={{ marginBottom: 12 }}>
        {stats.exercises}/{day.exercises.length} exercices abordés,{' '}
        {stats.sets}/{stats.plannedSets} séries de travail validées
        {stats.warmSets > 0 && ` (+ ${stats.warmSets} d'échauffement)`}.
      </p>

      <div className="stats">
        {stats.ms != null && (
          <div className="stat">
            <div className="v">{fmtDuration(stats.ms)}</div>
            <div className="l">Durée totale</div>
            {stats.perSet != null && (
              <div className="d">{fmtDuration(stats.perSet)} par série</div>
            )}
          </div>
        )}
        <div className="stat">
          <div className="v">{stats.tonnage.toLocaleString('fr-FR')} kg</div>
          <div className="l">Tonnage</div>
          {deltaTonnage != null && deltaTonnage !== 0 && (
            <div className={`d ${deltaTonnage > 0 ? 'up' : 'down'}`}>
              {deltaTonnage > 0 ? '+' : ''}
              {deltaTonnage} % vs dernière fois
            </div>
          )}
        </div>
        {stats.rpe != null && (
          <div className="stat">
            <div className="v">{stats.rpe}</div>
            <div className="l">RPE moyen</div>
          </div>
        )}
      </div>

      {stats.records.length > 0 && (
        <div className="records">
          {stats.records.map((r) => (
            <div key={r.key}>
              <b>Record</b> {r.name} — {r.top} kg <span>(avant {r.previous} kg)</span>
            </div>
          ))}
        </div>
      )}

      {stats.sets === 0 && (
        <p className="tiny" style={{ marginTop: 10 }}>
          Aucune série de travail validée : le bilan restera vide tant que rien n'est enregistré.
        </p>
      )}
    </div>
  )
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
