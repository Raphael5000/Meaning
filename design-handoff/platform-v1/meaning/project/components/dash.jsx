/* global React, I, Btn, Chip, Avatar, Mark, Kbd, Dot, Sidebar, IconBtn, Composer, LineChart, BarChart, Sparkline */
// Dashboard-specific components. Re-uses Sidebar + chart primitives from chat.jsx.

const { useState: useStateD, useRef: useRefD } = React;

// ============================================================================
// DASH HEADER — top bar: title · date range · add widget · refresh · chat
// ============================================================================
const DashHeader = ({
  title = 'Weekly traffic overview',
  owner = 'Alex Romero',
  lastRefreshed = '2 min ago',
  chatOpen = false,
  onToggleChat,
  range = 'Last 7 days',
}) => (
  <header style={{
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '14px 24px',
    borderBottom: '1px solid var(--line)',
    background: 'var(--surface)',
  }}>
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 10, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--ink-muted)', fontWeight: 600 }}>Dashboard</span>
        <Dot />
        <span style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>{owner}</span>
        <Dot />
        <span style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>Refreshed {lastRefreshed}</span>
      </div>
      <h1 style={{
        margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: '-0.015em',
        color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{title}</h1>
    </div>

    <DateRangePill label={range} />
    <Btn variant="outline" size="sm" icon={<I.Plus size={13} />}>Add widget</Btn>
    <Btn
      variant={chatOpen ? 'primary' : 'outline'}
      size="sm"
      icon={<I.Sparkle size={13} />}
      onClick={onToggleChat}
    >Ask</Btn>
  </header>
);

// Date-range pill — static display component (picks menu up via onClick in real use)
const DateRangePill = ({ label = 'Last 7 days', compare = 'vs. prev. period' }) => (
  <button style={{
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '6px 10px 6px 12px',
    background: 'var(--surface-2)', border: '1px solid var(--line)',
    borderRadius: 8, cursor: 'pointer', color: 'var(--ink)',
    fontSize: 12, fontFamily: 'var(--font-sans)',
  }}>
    <span style={{ fontWeight: 500 }}>{label}</span>
    <span style={{ color: 'var(--ink-subtle)', fontSize: 11 }}>·</span>
    <span style={{ color: 'var(--ink-muted)', fontSize: 11 }}>{compare}</span>
    <I.Chevron size={12} style={{ color: 'var(--ink-muted)', marginLeft: 2 }} />
  </button>
);

// ============================================================================
// WIDGET SHELL — the frame every dashboard widget sits in.
// Handles title, drag handle (hover), menu (hover), optional action affordances.
// ============================================================================
const WidgetShell = ({
  title,
  kicker,
  source,
  subtitle,
  actions,
  children,
  padding = 16,
  compact = false,
  menuOpen = false,
  dragging = false,
  loading = false,
  footnote,
}) => (
  <section
    style={{
      position: 'relative',
      display: 'flex', flexDirection: 'column',
      height: '100%', minHeight: 0,
      background: 'var(--surface)',
      border: `1px solid ${dragging ? 'var(--ink)' : 'var(--line)'}`,
      borderRadius: 10,
      overflow: 'hidden',
      boxShadow: dragging ? '0 12px 32px -8px rgba(0,0,0,0.25), 0 0 0 1px var(--ink)' : 'none',
      transition: 'box-shadow 150ms var(--ease), border-color 150ms var(--ease)',
    }}
    className="widget-shell"
  >
    {/* Header strip */}
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8,
      padding: compact ? '10px 12px 8px' : '14px 16px 10px',
      minHeight: compact ? 38 : 52,
    }}>
      {/* Drag handle rail — appears on hover */}
      <button
        className="widget-drag-handle"
        aria-label="Drag to reorder"
        style={{
          width: 14, height: 18, marginTop: 1,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: 'transparent', border: 'none', cursor: 'grab',
          color: 'var(--ink-subtle)', padding: 0,
          opacity: 0.55,
        }}
      >
        <svg width="10" height="14" viewBox="0 0 10 14" aria-hidden="true">
          <circle cx="2.5" cy="2.5" r="1" fill="currentColor" />
          <circle cx="2.5" cy="7"   r="1" fill="currentColor" />
          <circle cx="2.5" cy="11.5" r="1" fill="currentColor" />
          <circle cx="7.5" cy="2.5" r="1" fill="currentColor" />
          <circle cx="7.5" cy="7"   r="1" fill="currentColor" />
          <circle cx="7.5" cy="11.5" r="1" fill="currentColor" />
        </svg>
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        {(kicker || source) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            {kicker && <span className="kicker">{kicker}</span>}
            {source && (<><span style={{ color: 'var(--ink-subtle)', fontSize: 9 }}>·</span><span className="kicker" style={{ letterSpacing: '0.06em' }}>{source}</span></>)}
          </div>
        )}
        <div style={{
          fontSize: compact ? 13 : 14.5, fontWeight: 600,
          color: 'var(--ink)', letterSpacing: '-0.005em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 2 }}>{subtitle}</div>}
      </div>

      {actions !== null && (
        <div style={{ display: 'flex', gap: 2, marginTop: -2 }}>
          {actions || (
            <button title="More" aria-expanded={menuOpen} style={{
              ...widgetIconBtn(),
              background: menuOpen ? 'var(--surface-2)' : 'transparent',
              color: menuOpen ? 'var(--ink)' : 'var(--ink-muted)',
            }}>
              <I.More size={13} />
            </button>
          )}
        </div>
      )}
    </div>

    <div style={{ borderTop: '1px solid var(--line)' }} />

    {/* Body */}
    <div style={{
      flex: 1, minHeight: 0, padding: compact ? 12 : padding,
      position: 'relative',
    }}>
      {loading ? <WidgetSkeleton /> : children}
    </div>

    {footnote && (
      <>
        <div style={{ borderTop: '1px solid var(--line)' }} />
        <div style={{ padding: '9px 16px', fontSize: 11, color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 8 }}>
          {footnote}
        </div>
      </>
    )}

    {/* Overlay menu portal (static render for design) */}
    {menuOpen && <WidgetMenuPanel />}
  </section>
);

const widgetIconBtn = () => ({
  width: 24, height: 24,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: 'transparent', border: 'none', cursor: 'pointer',
  color: 'var(--ink-muted)', borderRadius: 6,
});

const WidgetMenuPanel = ({ items = [
  { icon: <I.Edit size={12.5} />, label: 'Edit prompt',       shortcut: <Kbd>E</Kbd> },
  { icon: <I.Refresh size={12.5} />, label: 'Refresh now' },
  { icon: <I.Sparkle size={12.5} />, label: 'Ask follow-up',  shortcut: <Kbd>⌘K</Kbd> },
  { icon: <I.Copy size={12.5} />, label: 'Duplicate' },
  { icon: <I.Download size={12.5} />, label: 'Export CSV' },
  { divider: true },
  { icon: <I.X size={12.5} />, label: 'Remove from dashboard', danger: true },
]}) => (
  <div role="menu" style={{
    position: 'absolute', top: 42, right: 8, zIndex: 20,
    minWidth: 210, padding: 5,
    background: 'var(--surface)', border: '1px solid var(--line)',
    borderRadius: 10, boxShadow: 'var(--shadow-pop)',
    fontSize: 12.5,
  }}>
    {items.map((it, i) => it.divider ? (
      <div key={i} style={{ height: 1, background: 'var(--line)', margin: '4px 2px' }} />
    ) : (
      <button key={i} style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
        padding: '7px 9px', background: 'transparent', border: 'none',
        borderRadius: 6, cursor: 'pointer',
        color: it.danger ? 'var(--neg)' : 'var(--ink)',
        textAlign: 'left',
      }}>
        <span style={{ color: it.danger ? 'var(--neg)' : 'var(--ink-muted)' }}>{it.icon}</span>
        <span style={{ flex: 1 }}>{it.label}</span>
        {it.shortcut}
      </button>
    ))}
  </div>
);

// Skeleton for a generating widget — shimmering bars
const WidgetSkeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%', justifyContent: 'space-between', padding: 4 }}>
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flex: 1, minHeight: 0 }}>
      {[0.45, 0.72, 0.6, 0.88, 0.55, 0.92, 0.78].map((h, i) => (
        <div key={i} className="barpulse shimmer"
          style={{
            flex: 1, height: `${h * 100}%`,
            background: 'var(--surface-2)',
            borderRadius: 3, border: '1px solid var(--line)',
            animationDelay: `${i * 0.08}s`,
          }} />
      ))}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }}>
      <span className="pulse-dot" />
      <span>Querying GA4 · building chart…</span>
    </div>
  </div>
);

// ============================================================================
// KPI TILE — compact dashboard scorecard (smaller than chat Scorecard)
// ============================================================================
const Kpi = ({ value, label, change, period = 'vs. prev.', sparkline, source, invert }) => {
  const isNeg = change && change.startsWith('-');
  const dir = invert ? !isNeg : isNeg; // for inverted metrics (bounce rate etc)
  return (
    <WidgetShell
      kicker={label}
      source={source}
      title={value}
      compact
      padding={14}
      actions={<button title="More" style={widgetIconBtn()}><I.More size={13} /></button>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
        <div style={{ flex: 1 }}>{sparkline}</div>
        {change && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span className={`delta ${dir ? 'neg' : 'pos'}`} style={{ fontSize: 12.5, fontWeight: 500 }}>
              {isNeg ? <I.Down size={10} /> : <I.Up size={10} />}
              {change}
            </span>
            <span style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{period}</span>
          </div>
        )}
      </div>
    </WidgetShell>
  );
};

// Override — Kpi renders value as 40px hero, not header-sized
Kpi.displayName = 'Kpi';

// Kpi-hero — the big number sits in the body
const KpiBig = ({ value, label, change, period = 'vs. prev. 7d', sparkline, source, invert, footnote }) => {
  const isNeg = change && change.startsWith('-');
  return (
    <WidgetShell
      kicker={label}
      source={source}
      title={value}
      compact
      padding={14}
      actions={<button title="More" style={widgetIconBtn()}><I.More size={13} /></button>}
      footnote={footnote}
    >
      {/* Value is already rendered in the title slot by design; move it to body */}
    </WidgetShell>
  );
};

// ---- Actual compact dashboard scorecard (bypasses WidgetShell title) ----
const DashScorecard = ({ value, label, change, period = 'vs. prev.', sparkline, source, invert, menuOpen }) => {
  const isNeg = change && change.startsWith('-');
  const dir = invert ? !isNeg : isNeg;
  return (
    <div className="widget-shell" style={{
      position: 'relative',
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--surface)', border: '1px solid var(--line)',
      borderRadius: 10, overflow: 'hidden', padding: 16,
    }}>
      {/* top row — kicker + actions */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="kicker">{label}</span>
          {source && <><span style={{ color: 'var(--ink-subtle)', fontSize: 9 }}>·</span><span className="kicker" style={{ letterSpacing: '0.06em' }}>{source}</span></>}
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          <button title="More" style={{ ...widgetIconBtn(), background: menuOpen ? 'var(--surface-2)' : 'transparent' }}><I.More size={12.5} /></button>
        </div>
      </div>

      {/* value */}
      <div className="num" style={{
        marginTop: 8,
        fontSize: 36, fontWeight: 600, lineHeight: 1.05,
        letterSpacing: '-0.025em', color: 'var(--ink)',
      }}>{value}</div>

      {/* delta */}
      {change && (
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span className={`delta ${dir ? 'neg' : 'pos'}`} style={{ fontSize: 12.5, fontWeight: 500 }}>
            {isNeg ? <I.Down size={10} /> : <I.Up size={10} />}
            {change}
          </span>
        </div>
      )}

      {/* sparkline */}
      {sparkline && <div style={{ marginTop: 12, flex: 1, display: 'flex', alignItems: 'flex-end' }}>{sparkline}</div>}

      {menuOpen && <WidgetMenuPanel />}
    </div>
  );
};

// ============================================================================
// DATA-TABLE WIDGET — row-dense list for top-N tables
// ============================================================================
const DashTable = ({
  title,
  source,
  columns,
  rows,
  footnote,
  menuOpen,
}) => (
  <WidgetShell
    title={title}
    kicker="Table"
    source={source}
    padding={0}
    menuOpen={menuOpen}
    footnote={footnote}
  >
    <div style={{ overflow: 'auto', height: '100%' }}>
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={i} className={c.num ? 'num' : ''} style={{ width: c.w }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((cell, j) => (
                <td key={j} className={columns[j].num ? 'num' : ''}>
                  {columns[j].mono ? <span className="mono">{cell}</span> : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </WidgetShell>
);

// ============================================================================
// SANKEY — flow placeholder (two-stage). Real one renders via ECharts in code.
// ============================================================================
const DashSankey = ({ w = 720, h = 280 }) => {
  const sources = [
    { label: 'Organic',  y: 20,  height: 70, color: 'var(--c-1)' },
    { label: 'Paid',     y: 105, height: 55, color: 'var(--c-2)' },
    { label: 'Direct',   y: 175, height: 40, color: 'var(--ink-muted)' },
    { label: 'Email',    y: 230, height: 28, color: 'var(--c-3)' },
  ];
  const targets = [
    { label: 'Home',     y: 10,   height: 80 },
    { label: 'Pricing',  y: 100,  height: 60 },
    { label: 'Blog',     y: 170,  height: 50 },
    { label: 'Signup',   y: 230,  height: 40 },
  ];
  // hand-placed flows — rough apportionment
  const flows = [
    { from: 0, to: 0, width: 30 }, { from: 0, to: 2, width: 22 }, { from: 0, to: 3, width: 18 },
    { from: 1, to: 1, width: 25 }, { from: 1, to: 3, width: 16 }, { from: 1, to: 0, width: 14 },
    { from: 2, to: 0, width: 18 }, { from: 2, to: 1, width: 12 }, { from: 2, to: 2, width: 10 },
    { from: 3, to: 3, width: 14 }, { from: 3, to: 1, width: 10 },
  ];
  const srcX = 140, tgtX = w - 140;
  // compute running y per stack to stack flows cleanly
  const srcCursor = sources.map(s => s.y);
  const tgtCursor = targets.map(t => t.y);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{ display: 'block' }}>
      {/* flow ribbons */}
      {flows.map((f, i) => {
        const s = sources[f.from], t = targets[f.to];
        const sy = srcCursor[f.from]; srcCursor[f.from] += f.width;
        const ty = tgtCursor[f.to];   tgtCursor[f.to]   += f.width;
        const x1 = srcX, x2 = tgtX;
        const mx = (x1 + x2) / 2;
        const d = `M${x1},${sy} C${mx},${sy} ${mx},${ty} ${x2},${ty} L${x2},${ty + f.width} C${mx},${ty + f.width} ${mx},${sy + f.width} ${x1},${sy + f.width} Z`;
        return <path key={i} d={d} fill={s.color} opacity="0.18" />;
      })}

      {/* source nodes */}
      {sources.map((s, i) => (
        <g key={i}>
          <rect x={srcX - 6} y={s.y} width="6" height={s.height} fill={s.color} />
          <text x={srcX - 14} y={s.y + s.height / 2 + 4} textAnchor="end" fontSize="11" fill="var(--ink)" fontFamily="var(--font-sans)">{s.label}</text>
        </g>
      ))}
      {/* target nodes */}
      {targets.map((t, i) => (
        <g key={i}>
          <rect x={tgtX} y={t.y} width="6" height={t.height} fill="var(--ink)" />
          <text x={tgtX + 14} y={t.y + t.height / 2 + 4} fontSize="11" fill="var(--ink)" fontFamily="var(--font-sans)">{t.label}</text>
        </g>
      ))}
    </svg>
  );
};

// ============================================================================
// ADD WIDGET DIALOG — center-stage modal with chart-type picker
// ============================================================================
const CHART_TYPES = [
  { id: 'auto',      label: 'Auto',       hint: 'Let Meaning decide',
    glyph: (<svg width="28" height="18" viewBox="0 0 28 18"><path d="M2 15 L8 9 L13 12 L19 5 L26 8" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/><circle cx="19" cy="5" r="1.6" fill="currentColor"/></svg>) },
  { id: 'scorecard', label: 'Scorecard',  hint: 'Single number + delta',
    glyph: (<svg width="28" height="18" viewBox="0 0 28 18"><text x="3" y="14" fontSize="12" fontWeight="700" fontFamily="system-ui" fill="currentColor">124K</text></svg>) },
  { id: 'line',      label: 'Line',        hint: 'Time series',
    glyph: (<svg width="28" height="18" viewBox="0 0 28 18"><path d="M2 14 L7 9 L11 11 L16 5 L21 8 L26 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>) },
  { id: 'bar',       label: 'Bar',         hint: 'Compare categories',
    glyph: (<svg width="28" height="18" viewBox="0 0 28 18"><rect x="3"  y="8"  width="3" height="8" fill="currentColor"/><rect x="9"  y="5"  width="3" height="11" fill="currentColor"/><rect x="15" y="11" width="3" height="5" fill="currentColor"/><rect x="21" y="3"  width="3" height="13" fill="currentColor"/></svg>) },
  { id: 'pie',       label: 'Pie',         hint: 'Share of total',
    glyph: (<svg width="28" height="18" viewBox="0 0 28 18"><circle cx="14" cy="9" r="7" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M14 2 A7 7 0 0 1 20.5 12 L14 9 Z" fill="currentColor"/></svg>) },
  { id: 'table',     label: 'Table',       hint: 'Ranked rows',
    glyph: (<svg width="28" height="18" viewBox="0 0 28 18"><rect x="3" y="3" width="22" height="12" fill="none" stroke="currentColor" strokeWidth="1"/><path d="M3 8 H25 M3 11.5 H25 M11 3 V15 M19 3 V15" stroke="currentColor" strokeWidth="1"/></svg>) },
  { id: 'sankey',    label: 'Sankey',      hint: 'Flows & journeys',
    glyph: (<svg width="28" height="18" viewBox="0 0 28 18"><path d="M3 4 C14 4 14 6 25 6 L25 10 C14 10 14 14 3 14 Z" fill="currentColor" opacity="0.4"/><path d="M3 4 L3 14 M25 6 L25 10" stroke="currentColor" strokeWidth="1.5"/></svg>) },
];

const AddWidgetDialog = ({ open = true, initialPrompt = '', selectedChart = 'auto', examples = [
  'Sessions this week by channel',
  'Top 10 landing pages by conversion rate',
  'Bounce rate trend, last 30 days',
  'New users vs. returning, last 14 days',
] }) => {
  if (!open) return null;
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 40,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      background: 'color-mix(in oklab, var(--bg) 72%, transparent)',
      backdropFilter: 'blur(6px)',
      paddingTop: 88,
    }}>
      <div style={{
        width: 680, maxWidth: '92%',
        background: 'var(--surface)', border: '1px solid var(--line-strong)',
        borderRadius: 14, overflow: 'hidden',
        boxShadow: 'var(--shadow-pop)',
      }}>
        <div style={{ padding: '18px 20px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'var(--brand-bg)', color: 'var(--brand)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}><I.Sparkle size={14} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Describe a new widget</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 1 }}>
              Plain English — pick a chart type or let Meaning choose.
            </div>
          </div>
          <button style={widgetIconBtn()} aria-label="Close"><I.X size={14} /></button>
        </div>

        <div style={{ borderTop: '1px solid var(--line)' }} />

        {/* Prompt */}
        <div style={{ padding: '14px 16px 4px' }}>
          <div style={{
            position: 'relative',
            border: '1.5px solid var(--ink)',
            borderRadius: 10,
            background: 'var(--surface)',
            padding: 12,
          }}>
            <textarea
              defaultValue={initialPrompt || 'Sessions by channel over the last 30 days, broken down by device'}
              rows={2}
              style={{
                width: '100%', resize: 'none', border: 'none',
                background: 'transparent', outline: 'none',
                fontSize: 14, lineHeight: 1.55, color: 'var(--ink)',
                fontFamily: 'var(--font-sans)',
              }}
            />
          </div>
        </div>

        {/* Chart type picker */}
        <div style={{ padding: '10px 16px 4px' }}>
          <div style={{ marginBottom: 8 }}>
            <span className="kicker">Chart type</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
            {CHART_TYPES.map((c) => {
              const active = c.id === selectedChart;
              return (
                <button key={c.id} title={c.hint} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                  padding: '10px 6px 8px',
                  background: active ? 'var(--ink)' : 'var(--surface)',
                  color: active ? 'var(--ink-inverse)' : 'var(--ink)',
                  border: `1px solid ${active ? 'var(--ink)' : 'var(--line)'}`,
                  borderRadius: 8, cursor: 'pointer',
                  fontSize: 10.5, fontWeight: 500,
                  fontFamily: 'var(--font-sans)',
                  transition: 'all 120ms var(--ease)',
                }}>
                  <span style={{ color: active ? 'var(--ink-inverse)' : 'var(--ink-muted)' }}>{c.glyph}</span>
                  <span>{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer controls */}
        <div style={{
          padding: '14px 16px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 10,
        }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11, color: 'var(--ink-muted)' }}>
            <I.Db size={11} />
            <span>GA4 · Google Ads · Search Console</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <Btn variant="ghost" size="sm">Cancel</Btn>
            <Btn variant="primary" size="sm" icon={<I.Sparkle size={12} />}>Generate widget</Btn>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--line)' }} />

        <div style={{ padding: '12px 16px 16px' }}>
          <div className="kicker" style={{ marginBottom: 8 }}>Or try one of these</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {examples.map((e, i) => (
              <button key={i} style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '7px 11px', background: 'transparent',
                border: '1px solid var(--line-strong)', borderRadius: 999,
                cursor: 'pointer', color: 'var(--ink)', fontSize: 12, textAlign: 'left',
                fontFamily: 'var(--font-sans)',
              }}>
                <I.Plus size={10} style={{ color: 'var(--ink-subtle)' }} />
                <span>{e}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// DASH EMPTY STATE
// ============================================================================
const DashEmpty = () => (
  <div style={{
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    textAlign: 'center', gap: 18, padding: 40,
  }}>
    <div style={{
      width: 72, height: 72, borderRadius: 16,
      background: 'var(--surface-2)', border: '1px solid var(--line)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--ink-muted)',
    }}>
      <I.Grid size={28} stroke={1.25} />
    </div>
    <div style={{ maxWidth: 420 }}>
      <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--ink)', marginBottom: 6 }}>
        A blank dashboard.
      </div>
      <div style={{ fontSize: 13.5, color: 'var(--ink-muted)', lineHeight: 1.55 }}>
        Describe the widgets you want and Meaning will query your sources, pick the chart type,
        and lay them out. Add as many as you like — you can rearrange them anytime.
      </div>
    </div>
    <div style={{ display: 'flex', gap: 8 }}>
      <Btn variant="primary" size="md" icon={<I.Sparkle size={13} />}>Describe a widget</Btn>
      <Btn variant="outline" size="md" icon={<I.Copy size={13} />}>Start from a template</Btn>
    </div>

    <div style={{ marginTop: 20, maxWidth: 560, width: '100%' }}>
      <div className="kicker" style={{ marginBottom: 10, textAlign: 'left' }}>Starting points</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {[
          { title: 'Weekly overview',   note: '4 KPIs · trend · top pages' },
          { title: 'Paid performance',  note: 'Cost, CPA, ROAS · by campaign' },
          { title: 'Content scorecard', note: 'Top pages · engagement · CTR' },
        ].map((t) => (
          <button key={t.title} style={{
            padding: '14px 14px', textAlign: 'left',
            background: 'var(--surface)', border: '1px solid var(--line)',
            borderRadius: 10, cursor: 'pointer', color: 'var(--ink)',
            fontFamily: 'var(--font-sans)',
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{t.title}</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>{t.note}</div>
          </button>
        ))}
      </div>
    </div>
  </div>
);

// ============================================================================
// CHAT DOCK — side panel anchored right, overlays dashboard
// ============================================================================
const ChatDock = ({ onClose }) => (
  <aside style={{
    width: 380, flexShrink: 0,
    borderLeft: '1px solid var(--line)',
    background: 'var(--surface)',
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
  }}>
    {/* header */}
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '14px 16px', borderBottom: '1px solid var(--line)',
    }}>
      <div style={{
        width: 26, height: 26, borderRadius: 7,
        background: 'var(--brand-bg)', color: 'var(--brand)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}><I.Sparkle size={13} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Ask about this dashboard</div>
        <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>Context: 4 widgets · Last 7 days</div>
      </div>
      <button onClick={onClose} style={widgetIconBtn()} aria-label="Close"><I.X size={14} /></button>
    </div>

    {/* messages */}
    <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* user msg */}
      <div style={{ alignSelf: 'flex-end', maxWidth: '88%' }}>
        <div style={{
          background: 'var(--ink)', color: 'var(--ink-inverse)',
          padding: '9px 13px', borderRadius: '12px 12px 3px 12px',
          fontSize: 13, lineHeight: 1.5,
        }}>Why did Paid Search spike on Tuesday?</div>
      </div>

      {/* assistant msg */}
      <div style={{ maxWidth: '92%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontSize: 10.5, color: 'var(--ink-muted)', letterSpacing: '0.09em', textTransform: 'uppercase', fontWeight: 600 }}>
          <I.Sparkle size={10} />
          <span>Meaning</span>
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--ink)' }}>
          New <strong>&ldquo;winter-promo&rdquo;</strong> campaign launched Tue 06:00 UTC — it drove +4,218 sessions
          at $2.18 CPA, roughly double the channel baseline for the day.
        </div>

        {/* inline widget reference */}
        <div style={{
          marginTop: 10, padding: 10,
          background: 'var(--surface-2)', border: '1px solid var(--line)',
          borderRadius: 8,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--surface)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-muted)' }}>
            <I.Grid size={14} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="kicker" style={{ marginBottom: 1 }}>Referenced widget</div>
            <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Sessions by channel · Last 7 days</div>
          </div>
          <button style={widgetIconBtn()} title="Jump to widget"><I.ArrowUpR size={12} /></button>
        </div>
      </div>

      {/* suggested */}
      <div style={{ marginTop: 2 }}>
        <div className="kicker" style={{ marginBottom: 6 }}>Follow-ups</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {[
            'Add that campaign to the dashboard',
            'Compare this week to last',
            'Where are those sessions converting?',
          ].map((q) => (
            <button key={q} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 11px', background: 'transparent', border: '1px solid var(--line)',
              borderRadius: 8, cursor: 'pointer',
              color: 'var(--ink)', fontSize: 12.5, textAlign: 'left',
              fontFamily: 'var(--font-sans)',
            }}>
              <span style={{ flex: 1 }}>{q}</span>
              <I.ChevronR size={11} style={{ color: 'var(--ink-subtle)' }} />
            </button>
          ))}
        </div>
      </div>
    </div>

    {/* composer */}
    <div style={{ borderTop: '1px solid var(--line)', padding: 12 }}>
      <div style={{
        border: '1.5px solid var(--ink)', borderRadius: 10,
        background: 'var(--surface)', padding: 8,
      }}>
        <textarea
          placeholder="Ask a follow-up…"
          rows={1}
          style={{
            width: '100%', resize: 'none', border: 'none',
            background: 'transparent', outline: 'none',
            fontSize: 13, color: 'var(--ink)',
            fontFamily: 'var(--font-sans)',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          <span style={{ fontSize: 10.5, color: 'var(--ink-subtle)' }}>Answers draw from the 4 widgets above.</span>
          <button style={{
            width: 28, height: 28, borderRadius: 6,
            background: 'var(--ink)', color: 'var(--ink-inverse)',
            border: 'none', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}><I.ArrowUp size={14} /></button>
        </div>
      </div>
    </div>
  </aside>
);

// ============================================================================
// DASHBOARDS LIST — picker/landing
// ============================================================================
const DashboardsList = () => {
  const items = [
    { title: 'Weekly traffic overview',    widgets: 6,  updated: '2 min ago',    owner: 'Alex Romero',  pinned: true  },
    { title: 'Paid campaign performance',  widgets: 9,  updated: '1 hour ago',   owner: 'Alex Romero',  pinned: true  },
    { title: 'Content scorecard',          widgets: 5,  updated: 'Yesterday',    owner: 'Priya Shah'                  },
    { title: 'YTD revenue attribution',    widgets: 12, updated: '3 days ago',   owner: 'Priya Shah'                  },
    { title: 'Search Console — branded',   widgets: 4,  updated: '2 weeks ago',  owner: 'Alex Romero'                 },
    { title: 'Weekly exec summary',        widgets: 8,  updated: 'Nov 4',        owner: 'Team'                        },
  ];
  const pinned = items.filter(i => i.pinned);
  const rest   = items.filter(i => !i.pinned);
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div className="kicker" style={{ marginBottom: 4 }}>Dashboards</div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)' }}>Your boards</h1>
        </div>
        <Btn variant="primary" size="md" icon={<I.Plus size={13} />}>New dashboard</Btn>
      </div>

      {pinned.length > 0 && (
        <>
          <div className="kicker" style={{ marginBottom: 10 }}>Pinned</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
            {pinned.map((d, i) => <DashCard key={i} {...d} />)}
          </div>
        </>
      )}

      <div className="kicker" style={{ marginBottom: 10 }}>All dashboards</div>
      <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden', background: 'var(--surface)' }}>
        {rest.map((d, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '1fr 80px 140px 140px 40px',
            alignItems: 'center', gap: 16, padding: '13px 16px',
            borderTop: i === 0 ? 'none' : '1px solid var(--line)',
            cursor: 'pointer', transition: 'background 120ms var(--ease)',
          }} className="row-hover">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 30, height: 30, borderRadius: 7, background: 'var(--surface-2)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-muted)' }}>
                <I.Grid size={14} />
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink)' }}>{d.title}</div>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }} className="num">{d.widgets} widgets</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>{d.owner}</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>{d.updated}</div>
            <button style={widgetIconBtn()}><I.More size={13} /></button>
          </div>
        ))}
      </div>
    </div>
  );
};

const DashCard = ({ title, widgets, updated, owner }) => (
  <button style={{
    all: 'unset', cursor: 'pointer',
    display: 'flex', flexDirection: 'column',
    background: 'var(--surface)', border: '1px solid var(--line)',
    borderRadius: 10, overflow: 'hidden',
    transition: 'border-color 120ms var(--ease), box-shadow 120ms var(--ease)',
  }}
  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--ink)'; }}
  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; }}>
    {/* thumb preview — fake mini layout */}
    <div style={{ height: 120, padding: 12, background: 'var(--surface-2)', borderBottom: '1px solid var(--line)', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridAutoRows: '28px', gap: 4 }}>
      {[1,1,1,1,3,3,3,3,2,2,1,1].map((w, i) => (
        <div key={i} style={{
          gridColumn: `span ${w}`,
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 3,
        }} />
      ))}
    </div>
    <div style={{ padding: '12px 14px' }}>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>{title}</div>
      <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{widgets} widgets · {updated} · {owner}</div>
    </div>
  </button>
);

// Export globals
Object.assign(window, {
  DashHeader, DashScorecard, DashTable, DashSankey,
  WidgetShell, WidgetMenuPanel, WidgetSkeleton,
  AddWidgetDialog, DashEmpty, ChatDock, DashboardsList, DashCard,
  DateRangePill,
});
