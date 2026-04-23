/* global React, Frame, I */
// ============================================================================
// CONNECTIONS — calibrated.
// One clear list. Each row: logo, name, status chip, last sync, one action.
// No coverage band, no freshness bars, no kind labels, no sync log.
// Status is visible because sync health is the thing users come here for.
// ============================================================================

const SOURCES = [
  { type: 'GA4',      label: 'Google Analytics', icon: 'assets/sources/ga4.svg',        status: 'ACTIVE',       lastSync: '4m ago',  accounts: 'hivory.com' },
  { type: 'GADS',     label: 'Google Ads',       icon: 'assets/sources/google-ads.svg', status: 'ACTIVE',       lastSync: '12m ago', accounts: '2 accounts' },
  { type: 'GSC',      label: 'Search Console',   icon: 'assets/sources/gsc.svg',        status: 'BACKFILLING',  lastSync: 'syncing', accounts: 'Backfilling 62%' },
  { type: 'LINKEDIN', label: 'LinkedIn',         icon: 'assets/sources/linkedin.svg',   status: 'ERROR',        lastSync: '2d ago',  accounts: 'Token expired' },
  { type: 'MC',       label: 'Mailchimp',        icon: 'assets/sources/mailchimp.svg',  status: 'ACTIVE',       lastSync: '1h ago',  accounts: 'Newsletter' },
  { type: 'MSADS',    label: 'Microsoft Ads',    icon: 'assets/sources/ms-ads.svg',     status: 'DISCONNECTED' },
  { type: 'META',     label: 'Meta',             icon: 'assets/sources/meta.svg',       status: 'DISCONNECTED', comingSoon: true },
];

const Logo = ({ icon, size = 22 }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: size, height: size,
    flexShrink: 0,
  }}>
    <img src={icon} alt="" style={{ width: size, height: size, display: 'block' }} />
  </span>
);

const StatusPill = ({ status }) => {
  const cfg = {
    ACTIVE:       { label: 'Connected',     dot: 'var(--pos)',        ink: 'var(--pos)',       bg: 'var(--pos-bg)' },
    BACKFILLING:  { label: 'Syncing',       dot: 'var(--info)',       ink: 'var(--info)',      bg: 'var(--info-bg)', pulse: true },
    ERROR:        { label: 'Error',         dot: 'var(--neg)',        ink: 'var(--neg)',       bg: 'var(--neg-bg)' },
    DISCONNECTED: { label: 'Not connected', dot: 'var(--ink-subtle)', ink: 'var(--ink-muted)', bg: 'var(--surface-2)' },
  }[status];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 9px 3px 8px', borderRadius: 999,
      background: cfg.bg, color: cfg.ink,
      fontSize: 11, fontWeight: 500, letterSpacing: '-0.005em',
      border: '1px solid color-mix(in oklab, currentColor 16%, transparent)',
      whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: 999, background: cfg.dot,
        animation: cfg.pulse ? 'pulse-ring 1.6s ease-out infinite' : 'none',
      }} />
      {cfg.label}
    </span>
  );
};

const Row = ({ s }) => {
  const isConnected = s.status !== 'DISCONNECTED';
  const isError = s.status === 'ERROR';
  // Last-sync column holds whichever value describes the row's current sync state:
  //   active → synced timestamp; syncing → progress; error → Reconnect; disconnected → Connect.
  let lastCell;
  if (s.comingSoon) {
    lastCell = <span style={{ fontSize: 11.5, color: 'var(--ink-subtle)' }}>—</span>;
  } else if (isError) {
    lastCell = <button style={linkBtn('var(--neg)')}>Reconnect</button>;
  } else if (!isConnected) {
    lastCell = <button style={linkBtn('var(--ink)')}>Connect</button>;
  } else if (s.status === 'BACKFILLING') {
    lastCell = <span className="mono" style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>syncing…</span>;
  } else {
    lastCell = <span className="mono" style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>{s.lastSync}</span>;
  }
  return (
    <tr style={{ borderBottom: '1px solid var(--line)', opacity: s.comingSoon ? 0.55 : 1 }}>
      <td style={tdL}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Logo icon={s.icon} size={20} />
          <span style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: 500 }}>{s.label}</span>
        </div>
      </td>
      <td style={td}>
        <span style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>
          {s.comingSoon ? 'Coming soon' : (s.accounts || '—')}
        </span>
      </td>
      <td style={td}>
        <StatusPill status={s.status} />
      </td>
      <td style={{ ...td, textAlign: 'right' }}>
        {lastCell}
      </td>
      <td style={tdR}>
        {isConnected && !s.comingSoon
          ? <button style={iconBtn} aria-label="Open"><I.ChevronR size={14} /></button>
          : null}
      </td>
    </tr>
  );
};

const th = {
  textAlign: 'left', padding: '8px 12px',
  fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
  color: 'var(--ink-subtle)',
  borderBottom: '1px solid var(--line)',
  background: 'var(--surface-2)',
};
const td  = { padding: '9px 12px', verticalAlign: 'middle' };
const tdL = { ...td, paddingLeft: 14 };
const tdR = { ...td, paddingRight: 12, textAlign: 'right', whiteSpace: 'nowrap' };

const ConnectionsMain = () => {
  const connected = SOURCES.filter(s => s.status !== 'DISCONNECTED');
  const available = SOURCES.filter(s => s.status === 'DISCONNECTED');
  const Table = ({ rows }) => (
    <div className="bw-card" style={{ overflow: 'hidden', padding: 0 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '24%' }} />
          <col />
          <col style={{ width: 120 }} />
          <col style={{ width: 120 }} />
          <col style={{ width: 40 }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ ...th, paddingLeft: 14 }}>Source</th>
            <th style={th}>Account</th>
            <th style={th}>Status</th>
            <th style={{ ...th, textAlign: 'right' }}>Last sync</th>
            <th style={{ ...th, paddingRight: 14 }}> </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(s => <Row key={s.type} s={s} />)}
        </tbody>
      </table>
    </div>
  );
  return (
    <div style={{ padding: '44px 48px', maxWidth: 820, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--ink)', marginBottom: 4 }}>
            Connections
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-muted)' }}>
            {connected.length} connected · daily sync
          </div>
        </div>
        <button style={btnGhost}><I.Refresh size={12} /> Sync all</button>
      </div>

      <div style={{ marginBottom: 28 }}>
        <Table rows={connected} />
      </div>

      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-subtle)', marginBottom: 8 }}>
        Add source
      </div>
      <Table rows={available} />
    </div>
  );
};

// --- Empty state -------------------------------------------------------------
const ConnectionsEmpty = () => (
  <div style={{ padding: '120px 40px', maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
    <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: '-0.015em', marginBottom: 10 }}>
      Connect a data source
    </div>
    <div style={{ fontSize: 13.5, color: 'var(--ink-muted)', marginBottom: 28, lineHeight: 1.55 }}>
      Meaning answers from the data you connect. Start with Google Analytics — most teams finish in under a minute.
    </div>
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      <button style={btnPrimary}>Connect Google Analytics</button>
      <button style={btnGhost}>See all sources</button>
    </div>
  </div>
);

// --- Source detail -----------------------------------------------------------
const ConnectionsDetail = () => (
  <div style={{ padding: '44px 48px', maxWidth: 720, margin: '0 auto' }}>
    <button style={{ ...btnGhost, padding: '4px 0', marginBottom: 20, color: 'var(--ink-muted)' }}>← Connections</button>

    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
      <Logo icon="assets/sources/google-ads.svg" size={24} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-0.015em' }}>Google Ads</div>
      </div>
      <StatusPill status="ACTIVE" />
      <span className="mono" style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>Synced 12m ago</span>
    </div>

    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-subtle)', marginBottom: 4 }}>
      Accounts
    </div>
    {[
      { id: '734-219-0040', name: 'Hivory — Brand' },
      { id: '908-441-7781', name: 'Hivory — Acquisition' },
    ].map(a => (
      <div key={a.id} style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 0', borderBottom: '1px solid var(--line)',
      }}>
        <div>
          <div style={{ fontSize: 13.5, color: 'var(--ink)' }}>{a.name}</div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 2 }}>{a.id}</div>
        </div>
        <button style={btnGhost}>Remove</button>
      </div>
    ))}

    <button style={{ ...btnOutline, marginTop: 16 }}>+ Add account</button>

    <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid var(--line)' }}>
      <button style={{ ...btnGhost, color: 'var(--neg)', padding: 0 }}>Disconnect Google Ads</button>
    </div>
  </div>
);

// --- Buttons -----------------------------------------------------------------
const btnBase = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '6px 12px', borderRadius: 6, fontSize: 12.5,
  fontFamily: 'var(--font-sans)', cursor: 'pointer',
  border: '1px solid transparent', whiteSpace: 'nowrap',
};
const btnGhost   = { ...btnBase, background: 'transparent', color: 'var(--ink-muted)' };
const btnOutline = { ...btnBase, background: 'transparent', color: 'var(--ink)', border: '1px solid var(--line-strong)' };
const btnPrimary = { ...btnBase, background: 'var(--ink)',  color: 'var(--ink-inverse)', fontWeight: 500 };
const btnDanger  = { ...btnBase, background: 'transparent', color: 'var(--neg)', border: '1px solid color-mix(in oklab, var(--neg) 35%, var(--line))' };
const linkBtn = (color) => ({
  background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
  fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500,
  color, letterSpacing: '-0.005em',
  textDecoration: 'underline', textUnderlineOffset: 3,
  textDecorationColor: 'color-mix(in oklab, currentColor 35%, transparent)',
});
const iconBtn   = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 24, height: 24, borderRadius: 6,
  background: 'transparent', color: 'var(--ink-muted)',
  border: '1px solid transparent', cursor: 'pointer',
  transition: 'background 120ms ease, color 120ms ease',
};

// --- Scene wrappers ----------------------------------------------------------
const SceneConnectionsCoverage = () => <Frame showComposer={false}><ConnectionsMain /></Frame>;
const SceneConnectionsGrid     = () => <Frame showComposer={false}><ConnectionsMain /></Frame>;
const SceneConnectionsPipeline = () => <Frame showComposer={false}><ConnectionsMain /></Frame>;
const SceneConnectionsDetail   = () => <Frame showComposer={false}><ConnectionsDetail /></Frame>;
const SceneConnectionsEmpty    = () => <Frame showComposer={false}><ConnectionsEmpty /></Frame>;

Object.assign(window, {
  SceneConnectionsCoverage,
  SceneConnectionsGrid,
  SceneConnectionsPipeline,
  SceneConnectionsDetail,
  SceneConnectionsEmpty,
});
