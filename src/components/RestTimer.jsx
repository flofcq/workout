import { useEffect, useRef, useState } from 'react'

function fmt(s) {
  const sign = s < 0 ? '+' : ''
  const a = Math.abs(s)
  return `${sign}${Math.floor(a / 60)}:${String(a % 60).padStart(2, '0')}`
}

export default function RestTimer({ seconds, label, onDismiss }) {
  const [left, setLeft] = useState(seconds)
  const beeped = useRef(false)

  useEffect(() => {
    const id = setInterval(() => setLeft((v) => v - 1), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (left === 0 && !beeped.current) {
      beeped.current = true
      // Bip court via Web Audio — pas de fichier son à charger.
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext
        if (!Ctx) return
        const ctx = new Ctx()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = 880
        gain.gain.setValueAtTime(0.15, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
        osc.start()
        osc.stop(ctx.currentTime + 0.35)
        if (navigator.vibrate) navigator.vibrate([120, 60, 120])
      } catch {
        /* audio indisponible, on ignore */
      }
    }
  }, [left])

  return (
    <div className={`timer${left < 0 ? ' over' : ''}`} role="status" aria-live="polite">
      <div className="t">{fmt(left)}</div>
      <div className="lab">{left < 0 ? 'Repos dépassé' : 'Repos'} · {label}</div>
      <button onClick={onDismiss}>Passer</button>
    </div>
  )
}
