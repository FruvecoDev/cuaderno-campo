// Shared chart defaults for consistent, professional Recharts styling across the app
// Keeps axis/tick/tooltip/legend styling consistent.

export const AXIS_TICK = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' };
export const AXIS_LABEL_TICK = { fontSize: 11, fill: 'hsl(var(--foreground))' };

export const TOOLTIP_STYLE = {
  borderRadius: '8px',
  border: '1px solid hsl(var(--border))',
  fontSize: '0.8rem',
  backgroundColor: 'white',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
};

export const LEGEND_STYLE = {
  fontSize: '0.72rem',
  lineHeight: '1.4',
  paddingLeft: '0.5rem',
  maxWidth: '44%',
};

/**
 * Truncate a string for axis tick display, adding ellipsis.
 */
export const truncTick = (v, n = 20) => (v?.length > n ? v.slice(0, n - 1) + '…' : v);

/**
 * Render a centered percentage label inside a pie slice (only if >= minPercent).
 * Use as the `label` prop on <Pie>.
 */
export const percentLabelRenderer = (minPercent = 0.04) => (props) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
  if (percent < minPercent) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x} y={y}
      fill="#fff"
      textAnchor="middle"
      dominantBaseline="central"
      style={{ fontSize: 11, fontWeight: 700, pointerEvents: 'none' }}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default {
  AXIS_TICK, AXIS_LABEL_TICK, TOOLTIP_STYLE, LEGEND_STYLE, truncTick, percentLabelRenderer,
};
