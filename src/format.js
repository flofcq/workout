/** Durée : « 48:12 » sous l'heure, « 1 h 03 » au-delà. */
export function fmtDuration(ms) {
  const total = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const sec = total % 60
  if (h > 0) return `${h} h ${String(m).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}

/** Temps de repos : 180 → « 3:00 », 45 → « 45 s ». */
export const fmtRest = (sec) =>
  sec < 60 ? `${sec} s` : `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
