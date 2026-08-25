import { parseDate } from '../date'
import { fmtSetsLine, sessionTonnage } from '../history'

function formatLong(iso) {
  return parseDate(iso).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  })
}

/**
 * Liste des séances d'un exercice : toutes les séries de travail, date par
 * date. Les échauffements restent mentionnés mais hors tonnage.
 */
export default function HistoriqueExercice({ sessions, empty }) {
  const withWork = sessions.filter((s) => s.working.length > 0)

  if (withWork.length === 0) {
    return (
      <div className="empty" style={{ padding: '18px 8px' }}>
        {empty || "Aucune série enregistrée pour cet exercice."}
      </div>
    )
  }

  return (
    <ol className="ex-hist">
      {withWork.map((sess) => (
        <li key={sess.id}>
          <div className="ex-hist-date">{formatLong(sess.date)}</div>
          <div className="ex-hist-sets">{fmtSetsLine(sess.working)}</div>
          <div className="ex-hist-meta">
            {sess.working.length} série{sess.working.length > 1 ? 's' : ''} ·{' '}
            {sessionTonnage(sess.working)} kg
            {sess.warmups.length > 0 &&
              ` · + ${sess.warmups.length} d'échauffement`}
          </div>
        </li>
      ))}
    </ol>
  )
}
