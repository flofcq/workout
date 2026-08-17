import { videoUrl } from '../program'

/**
 * Nom d'exercice cliquable, qui ouvre une démonstration vidéo.
 *
 * Toujours dans un nouvel onglet : en plein écran sur l'écran d'accueil iOS,
 * quitter la page ferait perdre les charges tapées et pas encore validées.
 */
export default function ExerciseLink({ ex, children }) {
  if (!ex) return children ?? null

  return (
    <a
      className="exo-link"
      href={videoUrl(ex)}
      target="_blank"
      rel="noopener noreferrer"
      title={`Voir comment faire « ${ex.name} »`}
    >
      {children ?? ex.name}
      {/* Un vrai SVG plutôt que ▶ : selon la plateforme, le caractère se
          transforme en emoji et casse l'alignement. */}
      <svg className="play" viewBox="0 0 10 10" width="9" height="9" aria-hidden="true">
        <path d="M2 1.1 8.5 5 2 8.9Z" fill="currentColor" />
      </svg>
      <span className="sr"> (vidéo de démonstration, nouvel onglet)</span>
    </a>
  )
}
