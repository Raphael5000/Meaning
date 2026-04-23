/* global React, I, SourceGlyph, Chip, Btn, Avatar, Mark, Kbd, Dot */
// Chat-specific components: sidebar, composer, messages, attachments

const { useState, useEffect, useRef } = React;

// -------------------------------------------------------------------------
// SIDEBAR
// -------------------------------------------------------------------------
const Sidebar = ({ collapsed = false, activeChat, onNewChat }) => {
  const orgs = [
    { id: 'a', name: 'Hivory', initials: 'HV', active: true },
    { id: 'b', name: 'Acme Brand', initials: 'AC' },
  ];
  const chats = {
    pinned: [
      { id: '1', title: 'GA4 acquisition breakdown' },
      { id: '2', title: 'LinkedIn CPM vs. Google Ads' },
    ],
    today: [
      { id: '3', title: 'Top pages this week', active: true },
      { id: '4', title: 'Which campaigns drove signups?' },
      { id: '5', title: 'Bounce rate by landing page' },
    ],
    yesterday: [
      { id: '6', title: 'Search Console CTR trend' },
      { id: '7', title: 'Mailchimp open rate — Nov' },
    ],
    older: [
      { id: '8', title: 'YTD revenue attribution' },
      { id: '9', title: 'Core Web Vitals regressions' },
      { id: '10', title: 'Weekly exec summary draft' },
    ],
  };

  if (collapsed) {
    return (
      <aside style={{ width: 56, background: 'var(--surface)', borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 0', flexShrink: 0 }}>
        <div style={{ marginBottom: 18 }}><Mark size={22} /></div>
        <IconBtn icon={<I.Edit />} label="New chat" />
        <IconBtn icon={<I.Search />} label="Search" />
        <IconBtn icon={<I.Grid />} label="Dashboards" />
        <IconBtn icon={<I.Bell />} label="Alerts" />
        <div style={{ flex: 1 }} />
        <div style={{ padding: 8 }}><Avatar initials="AR" size={30} /></div>
      </aside>
    );
  }

  return (
    <aside style={{ width: 272, background: 'var(--surface)', borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      {/* Brand + org switcher */}
      <div style={{ padding: '16px 14px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Mark size={20} />
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>Meaning</span>
        </div>
        <button style={iconBtnStyle()} aria-label="Search"><I.Search size={15} /></button>
      </div>

      {/* Org selector */}
      <div style={{ padding: '0 10px 10px' }}>
        <button style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 10px', borderRadius: 8, border: '1px solid var(--line)',
          background: 'var(--surface-2)', cursor: 'pointer', textAlign: 'left',
        }}>
          <div style={{ width: 22, height: 22, borderRadius: 5, background: 'var(--ink)', color: 'var(--ink-inverse)', fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>HV</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink)' }}>Hivory</div>
          </div>
          <I.Chevron size={13} style={{ color: 'var(--ink-muted)' }} />
        </button>
      </div>

      {/* Primary nav */}
      <nav style={{ padding: '0 10px 8px' }}>
        <NavLink icon={<I.Edit size={14} />} label="New chat" shortcut={<Kbd>⌘N</Kbd>} primary />
        <NavLink icon={<I.Grid size={14} />} label="Dashboards" />
        <NavLink icon={<I.Bell size={14} />} label="Alerts" badge="3" />
        <NavLink icon={<I.Plug size={14} />} label="Connections" />
      </nav>

      <div style={{ borderTop: '1px solid var(--line)', margin: '6px 0' }} />

      {/* Chat groups */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
        <ChatGroup label="Pinned" items={chats.pinned} pinned />
        <ChatGroup label="Today" items={chats.today} />
        <ChatGroup label="Yesterday" items={chats.yesterday} />
        <ChatGroup label="Older" items={chats.older} />
      </div>

      {/* Account */}
      <div style={{ borderTop: '1px solid var(--line)', padding: 10 }}>
        <button style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: 8,
          borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left'
        }}>
          <Avatar initials="AR" size={30} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 500 }}>Alex Romero</div>
            <div style={{ fontSize: 10.5, color: 'var(--ink-muted)' }}>Team plan</div>
          </div>
          <I.Chevron size={13} style={{ color: 'var(--ink-muted)', transform: 'rotate(180deg)' }} />
        </button>
      </div>
    </aside>
  );
};

const iconBtnStyle = () => ({
  background: 'transparent', border: 'none', padding: 6, borderRadius: 6,
  cursor: 'pointer', color: 'var(--ink-muted)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
});

const IconBtn = ({ icon, label, active }) => (
  <button title={label} aria-label={label} style={{
    width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer',
    background: active ? 'var(--surface-2)' : 'transparent',
    color: active ? 'var(--ink)' : 'var(--ink-muted)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '2px 0',
  }}>{icon}</button>
);

const NavLink = ({ icon, label, shortcut, badge, primary }) => (
  <button style={{
    position: 'relative',
    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
    padding: '7px 10px', borderRadius: 7, border: 'none',
    background: primary ? 'var(--surface-2)' : 'transparent',
    color: 'var(--ink)',
    cursor: 'pointer', textAlign: 'left', fontSize: 13, fontFamily: 'var(--font-sans)',
    margin: '1px 0',
    fontWeight: primary ? 600 : 400,
  }}>
    {primary && (
      <span style={{
        position: 'absolute', left: 3, top: 6, bottom: 6,
        width: 2, borderRadius: 2,
        background: 'var(--ink)',
      }} />
    )}
    <span style={{ color: 'var(--ink-muted)', display: 'inline-flex' }}>{icon}</span>
    <span style={{ flex: 1 }}>{label}</span>
    {badge && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 999, background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--ink-muted)' }}>{badge}</span>}
    {shortcut && !badge && <span style={{ opacity: 0.6 }}>{shortcut}</span>}
  </button>
);

const ChatGroup = ({ label, items, pinned }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px 6px' }}>
      <span className="kicker" style={{ fontSize: 9.5 }}>{label}</span>
      <div style={{ flex: 1, borderTop: '1px solid var(--line)', marginTop: 1 }} />
    </div>
    {items.map(item => (
      <button key={item.id} className="row-hover" style={{
        display: 'flex', alignItems: 'center', gap: 8,
        width: '100%', padding: '6px 8px', borderRadius: 6,
        border: 'none', cursor: 'pointer', textAlign: 'left',
        background: item.active ? 'var(--surface-2)' : 'transparent',
        color: 'var(--ink)', fontSize: 12.5, fontFamily: 'var(--font-sans)',
        position: 'relative',
      }}>
        {item.active && <div style={{ position: 'absolute', left: 0, top: 6, bottom: 6, width: 2, background: 'var(--ink)', borderRadius: 1 }} />}
        {pinned && <I.Pin size={11} style={{ color: 'var(--ink-subtle)', flexShrink: 0 }} />}
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: item.active ? 500 : 400 }}>{item.title}</span>
      </button>
    ))}
  </div>
);

// -------------------------------------------------------------------------
// COMPOSER
// -------------------------------------------------------------------------
const Composer = ({ value = '', sources = [], disabled = false, onSend }) => {
  const [v, setV] = useState(value);
  return (
    <div style={{ width: '100%', maxWidth: 780, margin: '0 auto', padding: '8px 24px 20px' }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--line-strong)',
        borderRadius: 14, padding: '12px 14px 8px',
        boxShadow: '0 10px 30px -18px rgba(0,0,0,0.2)'
      }}>
        <textarea
          value={v}
          placeholder="Ask about your analytics…"
          onChange={e => setV(e.target.value)}
          rows={1}
          style={{
            width: '100%', resize: 'none', border: 'none', outline: 'none',
            background: 'transparent', color: 'var(--ink)',
            fontFamily: 'var(--font-sans)', fontSize: 14, lineHeight: 1.5,
            padding: '4px 4px 8px',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px',
              borderRadius: 6, background: 'var(--surface-2)', border: '1px solid var(--line)',
              color: 'var(--ink-muted)', fontSize: 11, cursor: 'pointer'
            }}>
              <I.Db size={11} />
              <span className="mono">{sources.length || 4} sources</span>
              <I.Chevron size={11} />
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button disabled={!v && !disabled} style={{
              width: 30, height: 30, borderRadius: 6,
              background: v ? 'var(--ink)' : 'var(--surface-2)',
              color: v ? 'var(--ink-inverse)' : 'var(--ink-subtle)',
              border: v ? 'none' : '1px solid var(--line)',
              cursor: v ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {disabled ? <I.Stop size={12} /> : <I.ArrowUp size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------------------
// MESSAGES
// -------------------------------------------------------------------------
const UserMsg = ({ children }) => (
  <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 24px' }}>
    <div style={{ maxWidth: '72%' }}>
      <div style={{
        background: 'var(--surface-2)', border: '1px solid var(--line)',
        borderRadius: 12, padding: '10px 14px', fontSize: 13.5, color: 'var(--ink)',
        lineHeight: 1.55,
      }}>{children}</div>
    </div>
  </div>
);

const AssistantMsg = ({ children, kicker = 'Meaning', meta, thinking }) => (
  <div style={{ padding: '14px 24px' }}>
    <div style={{ maxWidth: 780, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'nowrap', whiteSpace: 'nowrap', overflow: 'hidden' }}>
        {thinking ? <ThinkingBlob size={22} /> : <Mark size={18} />}
        <span className="kicker">{kicker}</span>
        {thinking && <><Dot /><span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--brand)', fontWeight: 600 }}>thinking…</span></>}
        {meta && !thinking && <><Dot /><span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-muted)', letterSpacing: '0.02em', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meta}</span></>}
      </div>
      <div style={{
        marginLeft: 26,
        padding: '16px 18px',
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 14,
        borderTopLeftRadius: 4,
      }}>{children}</div>
    </div>
  </div>
);

// -------------------------------------------------------------------------
// ATTACHMENT CARDS
// -------------------------------------------------------------------------

// SCORECARD — hero number with optional delta
const Scorecard = ({ value, label, change, period = 'vs. last 7d', sparkline }) => {
  const isNeg = change && change.startsWith('-');
  return (
    <div className="bw-card" style={{ padding: '18px 20px', marginBottom: 12, width: 340 }}>
      <div style={{ marginBottom: 10 }}>
        <span className="kicker">{label}</span>
      </div>
      <div className="num" style={{ fontSize: 40, fontWeight: 600, lineHeight: 1.05, letterSpacing: '-0.02em', color: 'var(--ink)', marginBottom: 8 }}>{value}</div>
      {change && (
        <span className={`delta ${isNeg ? 'neg' : 'pos'}`} style={{ fontSize: 13, fontWeight: 500 }}>
          {isNeg ? <I.Down size={11} /> : <I.Up size={11} />}
          {change}
          <span style={{ color: 'var(--ink-muted)', marginLeft: 4, fontWeight: 400 }}>{period}</span>
        </span>
      )}
      {sparkline && <div style={{ marginTop: 14 }}>{sparkline}</div>}
    </div>
  );
};

// Minimal sparkline — responsive width so it scales to the card
const Sparkline = ({ points = [4,7,5,9,6,11,8,14,10,13,12,17], w = 260, h = 36 }) => {
  const max = Math.max(...points), min = Math.min(...points);
  const step = w / (points.length - 1);
  const norm = (v) => h - ((v - min) / (max - min || 1)) * (h - 4) - 2;
  const d = points.map((v, i) => `${i === 0 ? 'M' : 'L'}${i * step},${norm(v)}`).join(' ');
  const area = d + ` L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" width="100%" height={h} style={{ display: 'block' }}>
      <path d={area} fill="var(--c-1)" opacity="0.22" />
      <path d={d} stroke="var(--c-1)" strokeWidth="1.75" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={w} cy={norm(points[points.length-1])} r="2.5" fill="var(--c-1)" />
    </svg>
  );
};

// CHART CARD — title, body, legend
const ChartCard = ({ title, kicker = 'Chart', subtitle, children, legend, height = 260 }) => (
  <div className="bw-card" style={{ marginBottom: 12, overflow: 'hidden' }}>
    <div style={{ padding: '14px 16px 10px' }}>
      <div className="kicker" style={{ marginBottom: 3 }}>{kicker}</div>
      <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.005em', color: 'var(--ink)' }}>{title}</div>
      {subtitle && <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 2 }}>{subtitle}</div>}
    </div>
    <div style={{ borderTop: '1px solid var(--line)' }} />
    <div style={{ padding: 16, minHeight: height }}>{children}</div>
    {legend && (
      <>
        <div style={{ borderTop: '1px solid var(--line)' }} />
        <div style={{ padding: '10px 16px', display: 'flex', flexWrap: 'wrap', gap: 14 }}>{legend}</div>
      </>
    )}
  </div>
);

// BW line chart — primary solid, secondary dashed
const LineChart = ({ w = 700, h = 220 }) => {
  const a = [22, 28, 24, 34, 30, 42, 38, 48, 44, 52, 49, 58, 60, 64];
  const b = [18, 21, 19, 24, 23, 28, 26, 30, 29, 33, 32, 36, 38, 40];
  const max = 70, pad = { l: 44, r: 16, t: 12, b: 28 };
  const cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;
  const step = cw / (a.length - 1);
  const toPath = arr => arr.map((v,i) => `${i===0?'M':'L'}${pad.l + i*step},${pad.t + ch - (v/max)*ch}`).join(' ');
  const yTicks = [0, 20, 40, 60];
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      {yTicks.map(t => {
        const y = pad.t + ch - (t/max)*ch;
        return (
          <g key={t}>
            <line x1={pad.l} x2={w-pad.r} y1={y} y2={y} stroke="var(--line)" strokeDasharray={t === 0 ? "" : "2 3"} />
            <text x={pad.l - 8} y={y+3} textAnchor="end" className="mono" fontSize="9.5" fill="var(--ink-muted)">{t}k</text>
          </g>
        );
      })}
      {['Nov 1','Nov 3','Nov 5','Nov 7','Nov 9','Nov 11','Nov 13'].map((lbl,i) => (
        <text key={lbl} x={pad.l + i * (cw/6)} y={h - 10} textAnchor="middle" className="mono" fontSize="9.5" fill="var(--ink-muted)">{lbl}</text>
      ))}
      <path d={toPath(b)} stroke="var(--ink-muted)" strokeWidth="1.25" strokeDasharray="3 3" fill="none" strokeLinejoin="round" />
      <path d={toPath(a) + ` L${pad.l + (a.length-1)*step},${pad.t+ch} L${pad.l},${pad.t+ch} Z`} fill="var(--c-1)" opacity="0.10" />
      <path d={toPath(a)} stroke="var(--c-1)" strokeWidth="1.75" fill="none" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pad.l + (a.length-1)*step} cy={pad.t + ch - (a[a.length-1]/max)*ch} r="3" fill="var(--c-1)" />
    </svg>
  );
};

// BW bar chart — horizontal, like a mini league table
const BarChart = ({ data = [
  { label: 'Organic Search', value: 48210 },
  { label: 'Direct',         value: 22105 },
  { label: 'Referral',       value: 14308 },
  { label: 'Paid Search',    value: 11442 },
  { label: 'Social',          value: 7120 },
  { label: 'Email',           value: 3944 },
] }) => {
  const max = Math.max(...data.map(d => d.value));
  const colors = ['var(--c-1)','var(--c-2)','var(--c-3)','var(--c-4)','var(--c-5)','var(--c-6)'];
  return (
    <div>
      {data.map((d, i) => {
        const pct = (d.value / max) * 100;
        return (
          <div key={d.label} style={{ display: 'flex', alignItems: 'center', padding: '6px 0', borderBottom: i === data.length-1 ? 'none' : '1px solid var(--line)' }}>
            <div style={{ width: 150, fontSize: 12.5, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: colors[i % colors.length], flexShrink: 0 }} />
              {d.label}
            </div>
            <div style={{ flex: 1, position: 'relative', height: 14, background: 'var(--surface-2)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: colors[i % colors.length], borderRadius: 2, opacity: 0.9 }} />
            </div>
            <div style={{ width: 90, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink)' }}>{d.value.toLocaleString()}</div>
          </div>
        );
      })}
    </div>
  );
};

const LegendChip = ({ label, kind = 'solid', value }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--ink-muted)' }}>
    <span style={{
      display: 'inline-block', width: 14, height: 2,
      background: kind === 'solid' ? 'var(--ink)' : 'transparent',
      borderTop: kind === 'dashed' ? '1.5px dashed var(--ink-muted)' : 'none',
    }} />
    <span style={{ color: 'var(--ink)' }}>{label}</span>
    {value && <span className="mono" style={{ color: 'var(--ink-muted)' }}>{value}</span>}
  </span>
);

// TABLE CARD
const TableCard = ({ title, kicker = 'Table', columns, rows, footnote }) => (
  <div className="bw-card" style={{ marginBottom: 12, overflow: 'hidden' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px' }}>
      <div>
        <div className="kicker" style={{ marginBottom: 3 }}>{kicker}</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{title}</div>
      </div>
      <div style={{ display: 'flex', gap: 2 }}>
        <button title="Download" style={iconBtnStyle()}><I.Download size={14} /></button>
        <button title="More" style={iconBtnStyle()}><I.More size={14} /></button>
      </div>
    </div>
    <table className="data-table">
      <thead><tr>{columns.map((c,i) => <th key={i} className={c.num ? 'num' : ''} style={{ width: c.w }}>{c.label}</th>)}</tr></thead>
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
    {footnote && <div style={{ padding: '10px 16px', borderTop: '1px solid var(--line)', fontSize: 11, color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }}>{footnote}</div>}
  </div>
);

// RECOMMENDATION CALLOUT — replaces the old green bubble
const Rec = ({ children, label = 'Recommended next action' }) => (
  <div style={{
    marginTop: 4, marginBottom: 12, display: 'flex', gap: 14,
    padding: '16px 18px',
    background: 'color-mix(in oklab, var(--brand-vivid) 12%, transparent)',
    border: '1.5px solid var(--brand-vivid)',
    borderRadius: 12,
  }}>
    <div style={{
      width: 22, height: 22, borderRadius: 999,
      background: 'var(--brand-vivid)', color: 'var(--on-brand)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, marginTop: 1,
    }}><I.Check size={13} stroke={2.5} /></div>
    <div style={{ flex: 1 }}>
      <div style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 10, fontWeight: 700,
        letterSpacing: '0.09em', textTransform: 'uppercase',
        color: 'var(--brand)',
        marginBottom: 4,
      }}>{label}</div>
      <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--ink)' }}>{children}</div>
    </div>
  </div>
);

// TOOL-RESULT CARD — generic wrapped tool output
const ToolCard = ({ name, params, children }) => (
  <div className="bw-card bw-card-tight" style={{ marginBottom: 12, overflow: 'hidden', background: 'var(--surface-2)' }}>
    <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-muted)' }}>
      <I.Db size={11} />
      <span style={{ color: 'var(--ink)' }}>{name}</span>
      {params && <span style={{ color: 'var(--ink-subtle)' }}>({params})</span>}
      <div style={{ flex: 1 }} />
      <I.Check size={11} style={{ color: 'var(--pos)' }} />
      <span style={{ color: 'var(--ink-subtle)' }}>0.8s</span>
    </div>
    {children && <><div style={{ borderTop: '1px solid var(--line)' }} /><div style={{ padding: 12 }}>{children}</div></>}
  </div>
);

// SUGGESTED QUESTIONS
// SUGGESTED QUESTIONS — stacked follow-up list with leading "?" marker and trailing arrow
const Suggested = ({ items = [], label = 'Follow-up questions' }) => (
  <div style={{ marginTop: 18 }}>
    <div className="kicker" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 14, height: 14, borderRadius: 999,
        background: 'var(--brand-vivid)', color: 'var(--on-brand)',
        fontSize: 9, fontWeight: 800, letterSpacing: 0,
      }}>?</span>
      <span>{label}</span>
    </div>
    <div style={{
      display: 'flex', flexDirection: 'column',
      border: '1px solid var(--line)', borderRadius: 12,
      overflow: 'hidden', background: 'var(--surface)',
    }}>
      {items.map((q, i) => (
        <button key={q} type="button" style={{
          all: 'unset',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '11px 14px',
          borderTop: i === 0 ? 'none' : '1px solid var(--line)',
          fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink)',
          lineHeight: 1.4,
          transition: 'background 120ms var(--ease)',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <span style={{ flex: 1 }}>{q}</span>
          <I.ChevronR size={13} style={{ color: 'var(--ink-subtle)', flexShrink: 0 }} />
        </button>
      ))}
    </div>
  </div>
);

// STREAMING — thinking + tool status
const Thinking = ({ status }) => (
  <div style={{ padding: '12px 24px' }}>
    <div style={{ maxWidth: 780, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12 }}>
      <ThinkingBlob size={20} />
      <span className="kicker">Meaning</span>
      <Dot />
      {status ? (
        <span style={{ fontSize: 12, color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }}>{status}</span>
      ) : (
        <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>Thinking…</span>
      )}
    </div>
  </div>
);

// STAGES — multi-step tool-call progress log (Claude-style)
// Pass an array of { label, detail?, status: 'done' | 'active' | 'pending', duration? }
const Stages = ({ title = 'Working', steps = [], collapsedCount }) => {
  const activeIdx = steps.findIndex(s => s.status === 'active');
  const doneCount = steps.filter(s => s.status === 'done').length;
  const totalDur = steps.reduce((a, s) => a + (s.duration || 0), 0);
  return (
    <div style={{
      marginBottom: 14,
      border: '1px solid var(--line)',
      borderRadius: 12,
      background: 'var(--surface)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '6px 10px',
        display: 'flex', alignItems: 'center', gap: 8,
        borderBottom: '1px solid var(--line)',
        background: 'var(--surface-2)',
      }}>
        {activeIdx >= 0
          ? <ThinkingBlob size={18} />
          : <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: 999, background: 'var(--ink-subtle)' }} />
        }
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, color: 'var(--ink)', letterSpacing: '0.01em' }}>{title}</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-subtle)' }}>
          {activeIdx >= 0 ? `${doneCount + 1}/${steps.length}` : `${steps.length} · ${totalDur.toFixed(1)}s`}
        </span>
      </div>

      {/* Steps */}
      <ol style={{ listStyle: 'none', margin: 0, padding: '4px 0' }}>
        {steps.map((s, i) => {
          const isActive = s.status === 'active';
          const isDone = s.status === 'done';
          const isPending = s.status === 'pending';
          const isLast = i === steps.length - 1;
          return (
            <li key={i} style={{
              position: 'relative',
              padding: '5px 10px 5px 32px',
              opacity: isPending ? 0.45 : 1,
            }}>
              {/* Vertical timeline rail */}
              {!isLast && (
                <div style={{
                  position: 'absolute', left: 15, top: 17, bottom: -3,
                  width: 1, background: 'var(--line)',
                }} />
              )}
              {/* Status marker */}
              <div style={{
                position: 'absolute', left: 9, top: 7,
                width: 13, height: 13, borderRadius: 999,
                background: isDone ? 'var(--brand-vivid)' : (isActive ? 'var(--surface)' : 'var(--surface-2)'),
                border: isActive ? '1.5px solid var(--brand-vivid)' : (isDone ? 'none' : '1px solid var(--line-strong)'),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: isActive ? '0 0 0 3px color-mix(in oklab, var(--brand-vivid) 20%, transparent)' : 'none',
              }}>
                {isDone && <I.Check size={8} stroke={3.5} style={{ color: 'var(--on-brand)' }} />}
                {isActive && <span className="pulse-dot" style={{ width: 4, height: 4, background: 'var(--brand-vivid)' }} />}
              </div>

              {/* Content — single line with label · detail · duration */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
                <span style={{
                  fontFamily: 'var(--font-sans)', fontSize: 12,
                  fontWeight: isActive ? 600 : 500,
                  color: 'var(--ink)',
                  lineHeight: 1.4,
                  flexShrink: 0,
                }}>
                  {s.label}
                </span>
                {s.detail && (
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10.5,
                    color: 'var(--ink-muted)',
                    lineHeight: 1.4,
                    flex: 1, minWidth: 0,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {s.detail}
                  </span>
                )}
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10.5,
                  color: isActive ? 'var(--brand)' : 'var(--ink-subtle)',
                  flexShrink: 0,
                }}>
                  {isDone && s.duration != null && `${s.duration.toFixed(1)}s`}
                  {isActive && '…'}
                  {isPending && '·'}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

// Chart-skeleton — when the model is preparing a chart
const ChartSkeleton = () => (
  <div className="bw-card" style={{ marginBottom: 12, overflow: 'hidden' }}>
    <div style={{ padding: '14px 16px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div className="kicker" style={{ marginBottom: 3 }}>Chart</div>
        <div style={{ fontSize: 14, color: 'var(--ink-muted)' }}>Building visualisation…</div>
      </div>
      <span className="pulse-dot" />
    </div>
    <div style={{ borderTop: '1px solid var(--line)' }} />
    <div className="shimmer" style={{ height: 220, padding: 16, display: 'flex', alignItems: 'flex-end', gap: 6 }}>
      {[40, 62, 48, 78, 55, 90, 68, 82, 72, 95, 88, 100].map((h, i) => (
        <div key={i} className="barpulse" style={{
          flex: 1, height: `${h}%`,
          background: 'var(--line-strong)',
          borderRadius: 2,
          animationDelay: `${i * 60}ms`,
        }} />
      ))}
    </div>
  </div>
);

// ERROR BANNER — inline at message level
const ErrorBanner = ({ title = 'Something went wrong', detail, onRetry }) => (
  <div style={{
    padding: '12px 14px', marginBottom: 12, borderRadius: 10,
    border: '1px solid var(--neg)', background: 'var(--neg-bg)',
    display: 'flex', gap: 12, alignItems: 'flex-start',
  }}>
    <I.Alert size={16} style={{ color: 'var(--neg)', marginTop: 2, flexShrink: 0 }} />
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--neg)' }}>{title}</div>
      {detail && <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>{detail}</div>}
    </div>
    {onRetry && <Btn size="sm" variant="outline" icon={<I.Refresh size={12} />}>Retry</Btn>}
  </div>
);

Object.assign(window, {
  Sidebar, Composer, UserMsg, AssistantMsg,
  Scorecard, Sparkline, ChartCard, LineChart, BarChart, LegendChip,
  TableCard, Rec, ToolCard, Suggested,
  Thinking, Stages, ChartSkeleton, ErrorBanner, IconBtn,
});
