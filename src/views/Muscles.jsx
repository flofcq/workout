import { useMemo, useState } from 'react'
import { MUSCLES, REGIONS, musclesByRegion } from '../muscles'
import { getExercise } from '../program'
import ExerciseLink from '../components/ExerciseLink'

export default function Muscles() {
  const [region, setRegion] = useState('tous')
  const list = useMemo(() => musclesByRegion(region), [region])

  return (
    <>
      <h1>Muscles</h1>
      <p className="sub" style={{ marginBottom: 14 }}>
        Ce que chaque muscle fait, et quels exercices de ton programme le travaillent.
      </p>

      <div className="banner">
        Dans les séances, les muscles sont notés <b>primaire · secondaires</b> : avant le point,
        celui qui fait le mouvement ; après, ceux qui aident. Un muscle progresse quand il est
        primaire — être secondaire trois fois par semaine ne le remplace pas.
      </div>

      <div className="chips" style={{ marginBottom: 14 }}>
        <button className={`chip${region === 'tous' ? ' on' : ''}`} onClick={() => setRegion('tous')}>
          Tous
        </button>
        {REGIONS.map((r) => (
          <button
            key={r.key}
            className={`chip${region === r.key ? ' on' : ''}`}
            onClick={() => setRegion(r.key)}
          >
            {r.label}
          </button>
        ))}
      </div>

      {list.map((m) => (
        <MuscleCard key={m.key} muscle={m} />
      ))}

      <p className="tiny" style={{ marginTop: 4 }}>
        {MUSCLES.length} muscles ou groupes musculaires. Les noms entre parenthèses sont ceux que tu
        retrouveras dans la plupart des articles d'anatomie.
      </p>
    </>
  )
}

function MuscleCard({ muscle }) {
  const [open, setOpen] = useState(false)

  // Une clé retirée du programme ne doit pas casser la fiche.
  const exercises = muscle.exercises.map(getExercise).filter(Boolean)
  const region = REGIONS.find((r) => r.key === muscle.region)

  return (
    <div className="card">
      <div className="exo-head">
        <div style={{ minWidth: 0 }}>
          <h3>{muscle.name}</h3>
          {muscle.aka && <div className="exo-mus">{muscle.aka}</div>}
        </div>
        <span className="tag grey">{region?.label}</span>
      </div>

      <dl className="mus-def">
        <dt>Où</dt>
        <dd>{muscle.where}</dd>
        <dt>Ce qu'il fait</dt>
        <dd>{muscle.action}</dd>
      </dl>

      {muscle.parts && (
        <>
          <button
            className="btn ghost sm"
            style={{ padding: '4px 0', marginTop: 4 }}
            onClick={() => setOpen(!open)}
          >
            {open ? '− Masquer le détail' : `+ Détail (${muscle.parts.length} portions)`}
          </button>
          {open && (
            <div className="mus-parts">
              {muscle.parts.map((p) => (
                <div className="mus-part" key={p.name}>
                  <b>{p.name}</b>
                  <span>{p.text}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className="exo-cue" style={{ marginTop: 10 }}>{muscle.tip}</div>

      {exercises.length > 0 && (
        <>
          <div className="mus-exos-title">Dans ton programme</div>
          <ul className="mus-exos">
            {exercises.map((e) => (
              <li key={e.key}>
                <span className="k">{e.dayKey.toUpperCase()}</span>
                <ExerciseLink ex={e} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
