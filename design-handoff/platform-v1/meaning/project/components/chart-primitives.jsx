/* =====================================================================
   Chart primitives
   Shared helpers used by every chart in the library:
   - Scales (linear / band)
   - Axes (Y left, X bottom)
   - Grid
   - Tooltip hook + overlay
   - Legend
   - State wrappers (empty / loading / error / no-data)
   - Annotation primitives (threshold, range, event marker)
   - Card shell
   Exports to window for other babel scripts.
   ===================================================================== */

const { useState, useRef, useEffect, useMemo, useCallback } = React;

/* --- scales ----------------------------------------------------------- */
function scaleLinear(domain, range) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const k = (r1 - r0) / (d1 - d0 || 1);
  const fn = (v) => r0 + (v - d0) * k;
  fn.invert = (v) => d0 + (v - r0) / k;
  fn.domain = domain; fn.range = range;
  return fn;
}
function scaleBand(domain, range, padding = 0.2) {
  const n = domain.length;
  const total = range[1] - range[0];
  const step = total / Math.max(1, n);
  const bw = step * (1 - padding);
  const fn = (v) => {
    const i = domain.indexOf(v);
    return range[0] + i * step + (step - bw) / 2;
  };
  fn.bandwidth = () => bw;
  fn.step = () => step;
  fn.domain = domain; fn.range = range;
  return fn;
}

/* --- nice tick generator --------------------------------------------- */
function niceTicks(min, max, count = 5) {
  if (min === max) return [min];
  const span = max - min;
  const step0 = Math.pow(10, Math.floor(Math.log10(span / count)));
  const err = (count / span) * step0;
  const step =
    err >= 7.5 ? step0 * 10 :
    err >= 3.5 ? step0 * 5 :
    err >= 1.5 ? step0 * 2 : step0;
  const lo = Math.ceil(min / step) * step;
  const ticks = [];
  for (let v = lo; v <= max + 1e-9; v += step) ticks.push(Number(v.toFixed(12)));
  return ticks;
}
function fmtNum(v) {
  if (v == null || isNaN(v)) return '—';
  const a = Math.abs(v);
  if (a >= 1e9) return (v / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
  if (a >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (a >= 1e4) return (v / 1e3).toFixed(0) + 'k';
  if (a >= 1e3) return (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
  if (a >= 10)  return v.toFixed(0);
  if (a >= 1)   return v.toFixed(1);
  return v.toFixed(2);
}
function fmtPct(v, dp = 1) {
  if (v == null || isNaN(v)) return '—';
  return (v >= 0 ? '+' : '') + v.toFixed(dp) + '%';
}

/* --- default categorical palette ------------------------------------- */
const CAT_VARS = ['--cat-1','--cat-2','--cat-3','--cat-4','--cat-5','--cat-6','--cat-7','--cat-8'];
const catColor = (i) => `var(${CAT_VARS[i % CAT_VARS.length]})`;

/* --- Axis components ------------------------------------------------- */
function YAxis({ scale, ticks, x = 0, width = 0, showLine = true, showGrid = true, fmt = fmtNum }) {
  return (
    <g className="y-axis">
      {showGrid && ticks.map((t, i) => (
        <line key={'g'+i} className="grid-line" x1={x} x2={x + width} y1={scale(t)} y2={scale(t)} />
      ))}
      {showLine && <line className="axis-line" x1={x} x2={x} y1={scale.range[0]} y2={scale.range[1]} />}
      {ticks.map((t, i) => (
        <text key={'t'+i} x={x - 8} y={scale(t)} dy="0.32em" textAnchor="end">{fmt(t)}</text>
      ))}
    </g>
  );
}
function XAxis({ scale, ticks, y = 0, showLine = true, fmt = (v) => v, tickEvery = 1, rotate = 0 }) {
  const isBand = typeof scale.bandwidth === 'function';
  const labels = ticks.filter((_, i) => i % tickEvery === 0);
  return (
    <g className="x-axis">
      {showLine && <line className="axis-line" x1={scale.range[0]} x2={scale.range[1]} y1={y} y2={y} />}
      {labels.map((t, i) => {
        const cx = isBand ? scale(t) + scale.bandwidth() / 2 : scale(t);
        return (
          <text key={i} x={cx} y={y + 16}
            textAnchor={rotate ? 'end' : 'middle'}
            transform={rotate ? `rotate(${rotate} ${cx} ${y + 16})` : undefined}>
            {fmt(t)}
          </text>
        );
      })}
    </g>
  );
}

/* --- Legend (interactive: click to hide series) ---------------------- */
function Legend({ series, hidden, onToggle, shape = 'square' }) {
  return (
    <div className="chart-legend">
      {series.map((s, i) => {
        const off = hidden?.[s.key];
        return (
          <button key={s.key} onClick={() => onToggle?.(s.key)} data-off={off ? 'true' : 'false'}>
            <span className="swatch" style={{ background: s.color || catColor(i) }} />
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

/* --- Tooltip hook ---------------------------------------------------- */
function useTooltip() {
  const [tip, setTip] = useState(null);
  const ref = useRef(null);
  const show = (payload, e) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect || !e) { setTip({ payload, x: 0, y: 0 }); return; }
    setTip({
      payload,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };
  const hide = () => setTip(null);
  return { tip, show, hide, ref };
}

function TooltipOverlay({ tip, render }) {
  if (!tip) return null;
  // Nudge inside bounds
  const style = {
    position: 'absolute',
    left: tip.x + 14,
    top: tip.y + 14,
    zIndex: 5,
    transform: 'translateZ(0)',
  };
  return (
    <div className="chart-tooltip" style={style}>
      {render(tip.payload)}
    </div>
  );
}

/* --- State wrappers -------------------------------------------------- */
function StateEmpty({ title = 'No data yet', sub = 'Connect a source or widen the range.' }) {
  return (
    <div className="chart-state">
      <div className="icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></svg></div>
      <div className="title">{title}</div>
      <div className="sub">{sub}</div>
    </div>
  );
}
function StateLoading({ title = 'Fetching…', sub = 'Pulling fresh data.' }) {
  return (
    <div className="chart-state">
      <div className="icon"><span className="pulse-dot" /></div>
      <div className="title">{title}</div>
      <div className="sub">{sub}</div>
    </div>
  );
}
function StateError({ title = 'Couldn’t load', sub = 'Source returned an error. Retry or check connection.' }) {
  return (
    <div className="chart-state">
      <div className="icon" style={{ color: 'var(--neg)' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 8v5"/><circle cx="12" cy="16.5" r="1" fill="currentColor" stroke="none"/><path d="M10.3 3.8L2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0z"/></svg>
      </div>
      <div className="title">{title}</div>
      <div className="sub">{sub}</div>
    </div>
  );
}
function StateNoMatch({ title = 'No matching rows', sub = 'Try removing filters or widening the date range.' }) {
  return (
    <div className="chart-state">
      <div className="icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="11" cy="11" r="7"/><path d="M16 16l4.5 4.5"/></svg></div>
      <div className="title">{title}</div>
      <div className="sub">{sub}</div>
    </div>
  );
}

/* --- Annotation primitives (SVG fragments) --------------------------- */
function ThresholdLine({ y, x0, x1, label }) {
  return (
    <g>
      <line className="anno-line" x1={x0} x2={x1} y1={y} y2={y} />
      {label && (
        <g>
          <rect className="anno-pill" x={x1 - 56} y={y - 9} width="52" height="18" rx="9" />
          <text className="anno-pill-text" x={x1 - 30} y={y} dy="0.32em" textAnchor="middle">{label}</text>
        </g>
      )}
    </g>
  );
}
function RangeBand({ x0, x1, y0, y1, label }) {
  return (
    <g>
      <rect className="anno-range" x={x0} y={y1} width={x1 - x0} height={y0 - y1} />
      {label && <text x={x0 + 6} y={y1 + 12} fill="var(--ink-muted)">{label}</text>}
    </g>
  );
}
function EventMarker({ x, y0, y1, label }) {
  return (
    <g>
      <line className="anno-line" x1={x} x2={x} y1={y0} y2={y1} />
      <circle className="anno-event" cx={x} cy={y1} r="3" />
      {label && (
        <g transform={`translate(${x}, ${y1 - 14})`}>
          <rect className="anno-pill" x={-28} y={-10} width="56" height="18" rx="9" />
          <text className="anno-pill-text" x="0" y="0" dy="0.32em" textAnchor="middle">{label}</text>
        </g>
      )}
    </g>
  );
}

/* --- ChartCard shell ------------------------------------------------- */
function ChartCard({ kicker, title, desc, children, right, style }) {
  return (
    <div className="chart-card" style={style}>
      <div className="chart-card-head">
        <div style={{ minWidth: 0 }}>
          {kicker && <div className="chart-card-kicker">{kicker}</div>}
          <div className="chart-card-title">{title}</div>
          {desc && <div className="chart-card-desc">{desc}</div>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

/* --- Simple path builders -------------------------------------------- */
function linePath(pts) {
  if (!pts.length) return '';
  return pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0] + ',' + p[1]).join(' ');
}
function smoothPath(pts) {
  if (pts.length < 2) return linePath(pts);
  const d = ['M' + pts[0][0] + ',' + pts[0][1]];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d.push(`C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`);
  }
  return d.join(' ');
}
function areaPath(pts, y0) {
  if (!pts.length) return '';
  return linePath(pts) + ` L${pts[pts.length-1][0]},${y0} L${pts[0][0]},${y0} Z`;
}

/* --- export ---------------------------------------------------------- */
Object.assign(window, {
  // scales & math
  scaleLinear, scaleBand, niceTicks, fmtNum, fmtPct,
  // palette
  catColor, CAT_VARS,
  // axes & legend
  YAxis, XAxis, Legend,
  // tooltip
  useTooltip, TooltipOverlay,
  // states
  StateEmpty, StateLoading, StateError, StateNoMatch,
  // annotations
  ThresholdLine, RangeBand, EventMarker,
  // shell
  ChartCard,
  // path
  linePath, smoothPath, areaPath,
});
