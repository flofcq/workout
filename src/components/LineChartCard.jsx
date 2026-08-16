import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

// Pas de graduation « ronde » : 1, 2, 2,5 ou 5 fois une puissance de dix,
// choisi pour découper l'étendue en quatre environ.
function niceStep(range) {
  if (!(range > 0)) return 1
  const raw = range / 4
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const n = raw / magnitude
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * magnitude
}

// Une seule série par graphique — donc pas de légende (le titre nomme la série)
// et jamais deux axes Y. Deux mesures d'échelles différentes = deux graphiques.
export default function LineChartCard({
  data,
  unit = 'kg',
  label,
  dataKey = 'value',
  meta,
  // Les valeurs à quatre ou cinq chiffres (les pas) se lisent mal sans
  // séparateur de milliers. Les charges, elles, restent brutes.
  format = (v) => v,
}) {
  if (!data || data.length === 0) {
    return <div className="empty">Pas encore assez de données pour tracer une courbe.</div>
  }

  const values = data.map((d) => d[dataKey]).filter((v) => v != null)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = Math.max((max - min) * 0.15, unit === 'kg' ? 1 : 0.5)

  // Bornes et graduations arrondies à une unité lisible : sans ça, l'axe des
  // pas gradue à 5 017 et 14 573 au lieu de 5 000 et 15 000. On fournit les
  // graduations explicitement, sinon recharts recoupe l'étendue en cinq et
  // produit des écarts inégaux (83, 86, 90).
  const step = niceStep(max + pad - (min - pad))
  const lo = Math.floor((min - pad) / step) * step
  const hi = Math.ceil((max + pad) / step) * step
  const ticks = []
  for (let t = lo; t <= hi + step / 1000; t += step) ticks.push(Math.round(t * 100) / 100)

  return (
    <div className="chartwrap">
      <ResponsiveContainer width="100%" height={210}>
        <LineChart data={data} margin={{ top: 8, right: 14, bottom: 4, left: -12 }}>
          <CartesianGrid stroke="var(--viz-grid)" strokeWidth={1} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: 'var(--viz-muted)', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--viz-axis)' }}
            minTickGap={18}
          />
          <YAxis
            domain={[lo, hi]}
            ticks={ticks}
            tick={{ fill: 'var(--viz-muted)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={format}
          />
          <Tooltip
            cursor={{ stroke: 'var(--viz-axis)', strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const p = payload[0].payload
              return (
                <div className="tt">
                  <div className="d">{p.fullLabel || p.label}</div>
                  <div className="v">
                    {format(p[dataKey])} {unit}
                  </div>
                  {meta && <div className="m">{meta(p)}</div>}
                </div>
              )
            }}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            name={label}
            stroke="var(--series-1)"
            strokeWidth={2}
            dot={{ r: 4, fill: 'var(--viz-surface)', stroke: 'var(--series-1)', strokeWidth: 2 }}
            activeDot={{ r: 6, fill: 'var(--series-1)', stroke: 'var(--viz-surface)', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
