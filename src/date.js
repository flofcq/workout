// Toutes les dates de l'app sont des chaînes 'YYYY-MM-DD' désignant un jour
// civil dans le fuseau de l'utilisateur — pas un instant.
//
// ⚠️ Ne jamais les produire avec toISOString() : cette méthode convertit en
// UTC. À l'est de Greenwich (France : UTC+1, UTC+2 en été), minuit local
// tombe la veille en UTC, et la date retournée recule d'un jour. Concrètement
// une séance saisie à 0 h 30 était datée de la veille. On construit donc la
// chaîne à partir des composantes locales.

export const parseDate = (iso) => new Date(iso + 'T00:00:00')

export function toISODate(d) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const todayISO = () => toISODate(new Date())

export function shiftDate(iso, days) {
  const d = parseDate(iso)
  d.setDate(d.getDate() + days) // gère les fins de mois et l'heure d'été
  return toISODate(d)
}
