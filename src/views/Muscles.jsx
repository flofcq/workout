import { useEffect, useMemo, useState } from 'react'
import { MUSCLES, REGIONS, musclesByRegion } from '../muscles'
import { getExercise } from '../program'

const cardId = (key) => `mus-${key}`

export default function Muscles({ target, onTargetHandled }) {
  const [region, setRegion] = useState('tous')
  // Fiche mise en évidence à l'arrivée depuis une séance.
  const [highlight, setHighlight] = useState(null)
  const list = useMemo(() => musclesByRegion(region), [region])

  // Deux effets, et non un seul : le défilement doit avoir lieu *après* le
  // rendu qui insère la carte. Tout faire dans le premier échouait — la carte
  // n'était pas encore dans le DOM, ou sa référence venait d'être vidée par le
  // rendu intermédiaire.
  useEffect(() => {
    if (!target) return
    // Le filtre de région pourrait masquer la fiche visée.
    setRegion('tous')
    setHighlight(target)
    onTargetHandled?.()
  }, [target, onTargetHandled])

  useEffect(() => {
    if (!highlight) return
    // getElementById plutôt qu'une ref : indépendant du cycle de vie des refs.
    // Pas de `behavior: 'smooth'` — sur un changement d'onglet un saut direct
    // est ce qu'on attend, et le défilement fluide est ignoré par certains
    // navigateurs, auquel cas rien ne défilait du tout.
    document.getElementById(cardId(highlight))?.scrollIntoView({ block: 'center' })
  }, [highlight])

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
        <MuscleCard key={m.key} muscle={m} highlighted={highlight === m.key} />
      ))}

      <p className="tiny" style={{ marginTop: 4 }}>
        {MUSCLES.length} muscles ou groupes musculaires. Les noms entre parenthèses sont ceux que tu
        retrouveras dans la plupart des articles d'anatomie.
      </p>
    </>
  )
}

function MuscleCard({ muscle, highlighted }) {
  const [open, setOpen] = useState(false)

  // Arrivée depuis une séance : on déplie le détail des faisceaux, c'est le
  // plus souvent ce qu'on vient chercher. Par effet et non à l'initialisation
  // du state : la carte est montée avant que la cible soit connue.
  useEffect(() => {
    if (highlighted) setOpen(true)
  }, [highlighted])

  // Une clé retirée du programme ne doit pas casser la fiche.
  const exercises = muscle.exercises.map(getExercise).filter(Boolean)
  const region = REGIONS.find((r) => r.key === muscle.region)

  return (
    <div id={cardId(muscle.key)} className={`card${highlighted ? ' mus-target' : ''}`}>
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
                {/* Le jour de la semaine, pas « J1 » : depuis que la saisie est
                    calendaire, les libellés J1…J5 n'apparaissent plus nulle part. */}
                <span className="k">{e.dayName.slice(0, 3)}</span>
                {e.name}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
