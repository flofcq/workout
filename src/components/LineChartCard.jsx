import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

// Une seule série par graphique — donc pas de légende (le titre nomme la série)
// et jamais deux axes Y. Deux mesures d'échelles différentes = deux graphiques.
export default function LineChartCard({ data, unit = 'kg', label, dataKey = 'value', meta }) {
  if (!data || data.length === 0) {
    return <div className="empty">Pas encore assez de données pour tracer une courbe.</div>
  }

  const values = data.map((d) => d[dataKey]).filter((v) => v != null)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = Math.max((max - min) * 0.15, unit === 'kg' ? 1 : 0.5)

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
            domain={[Math.floor(min - pad), Math.ceil(max + pad)]}
            tick={{ fill: 'var(--viz-muted)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={44}
            allowDecimals={false}
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
                    {p[dataKey]} {unit}
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
