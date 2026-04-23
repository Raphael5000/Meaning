/* global React, I, Btn, Chip, Kbd, Dot, Sidebar, IconBtn, Composer, Sparkline, LineChart, BarChart, DashHeader, DashScorecard, DashTable, DashSankey, WidgetShell, WidgetMenuPanel, WidgetSkeleton, AddWidgetDialog, DashEmpty, ChatDock, DashboardsList */
// Dashboard scene builders — each returns a full dashboard frame.

const { useState: useStateDS } = React;

// =============================================================================
// DASH FRAME — sidebar (Dashboards active) + content column
// =============================================================================
const DashFrame = ({ children, width = 1280, height = 900, collapsed = false, chatOpen = false, header = null }) => (
  <div style={{
    width, height, display: 'flex',
    background: 'var(--bg)', color: 'var(--ink)',
    fontFamily: 'var(--font-sans)', overflow: 'hidden',
    position: 'relative',
  }}>
    <DashSidebar collapsed={collapsed} />
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
      {header}
      <div style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>{children}</div>

      {/* Chat dock — absolute overlay so dashboard content keeps its full width */}
      {chatOpen && (
        <>
          {/* soft scrim on the content beneath */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 29,
            background: 'color-mix(in oklab, var(--bg) 35%, transparent)',
            backdropFilter: 'blur(1px)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', top: 0, right: 0, bottom: 0,
            zIndex: 30, display: 'flex',
            boxShadow: '-24px 0 48px -16px rgba(0,0,0,0.35)',
          }}>
            <ChatDock />
          </div>
        </>
      )}
    </div>
  </div>
);

// Re-use Sidebar from chat.jsx, but nudge the active state toward Dashboards.
// We render it fresh here because Sidebar has internal nav state.
const DashSidebar = ({ collapsed }) => {
  // Inline clone of the chat sidebar with Dashboards as the active nav item
  // and a list of dashboards in place of chats.
  if (collapsed) {
    return (
      <aside style={{ width: 56, background: 'var(--surface)', borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 0', flexShrink: 0 }}>
        <div style={{ marginBottom: 18 }}><Mark size={22} /></div>
        <IconBtn icon={<I.Edit />} label="New chat" />
        <IconBtn icon={<I.Search />} label="Search" />
        <IconBtn icon={<I.Grid />} label="Dashboards" active />
        <IconBtn icon={<I.Bell />} label="Alerts" />
        <div style={{ flex: 1 }} />
        <div style={{ padding: 8 }}><Avatar initials="AR" size={30} /></div>
      </aside>
    );
  }
  const dashboards = {
    pinned: [
      { id: '1', title: 'Weekly traffic overview',    active: true },
      { id: '2', title: 'Paid campaign performance' },
    ],
    mine: [
      { id: '3', title: 'Content scorecard' },
      { id: '4', title: 'Search Console — branded' },
      { id: '5', title: 'YTD revenue attribution' },
    ],
  };
  return (
    <aside style={{ width: 272, background: 'var(--surface)', borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      <div style={{ padding: '16px 14px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Mark size={20} />
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>Meaning</span>
        </div>
        <button style={{
          background: 'transparent', border: 'none', padding: 6, borderRadius: 6,
          cursor: 'pointer', color: 'var(--ink-muted)'
        }}><I.Search size={15} /></button>
      </div>

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

      <nav style={{ padding: '0 10px 8px' }}>
        <DashNavLink icon={<I.Edit size={14} />} label="New chat" shortcut={<Kbd>⌘N</Kbd>} />
        <DashNavLink icon={<I.Grid size={14} />} label="Dashboards" primary />
        <DashNavLink icon={<I.Bell size={14} />} label="Alerts" badge="3" />
        <DashNavLink icon={<I.Plug size={14} />} label="Connections" />
      </nav>

      <div style={{ borderTop: '1px solid var(--line)', margin: '6px 0' }} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
        <DashGroup label="Pinned" items={dashboards.pinned} pinned />
        <DashGroup label="My dashboards" items={dashboards.mine} />
      </div>

      <div style={{ borderTop: '1px solid var(--line)', padding: 10 }}>
        <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
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

const DashNavLink = ({ icon, label, shortcut, badge, primary }) => (
  <button style={{
    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
    padding: '7px 10px', borderRadius: 7, border: 'none', cursor: 'pointer',
    background: primary ? 'var(--surface-2)' : 'transparent',
    color: primary ? 'var(--ink)' : 'var(--ink-muted)',
    fontSize: 12.5, fontFamily: 'var(--font-sans)', fontWeight: primary ? 500 : 400,
    textAlign: 'left',
    borderLeft: primary ? '2px solid var(--ink)' : '2px solid transparent',
    paddingLeft: 10,
  }}>
    <span style={{ color: primary ? 'var(--ink)' : 'var(--ink-muted)' }}>{icon}</span>
    <span style={{ flex: 1 }}>{label}</span>
    {badge && <span style={{
      fontSize: 10, padding: '1px 6px', borderRadius: 999,
      background: 'var(--ink)', color: 'var(--ink-inverse)', fontWeight: 600,
    }}>{badge}</span>}
    {shortcut}
  </button>
);

const DashGroup = ({ label, items, pinned }) => (
  <div style={{ marginBottom: 14 }}>
    <div className="kicker" style={{ padding: '0 10px', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
      {pinned && <I.Pin size={9} />}<span>{label}</span>
    </div>
    {items.map((it) => (
      <button key={it.id} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 10px', borderRadius: 6, border: 'none',
        background: it.active ? 'var(--surface-2)' : 'transparent',
        color: it.active ? 'var(--ink)' : 'var(--ink-muted)',
        fontSize: 12.5, fontFamily: 'var(--font-sans)',
        textAlign: 'left', cursor: 'pointer',
        fontWeight: it.active ? 500 : 400,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        <I.Grid size={11} style={{ color: 'var(--ink-subtle)', flexShrink: 0 }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.title}</span>
      </button>
    ))}
  </div>
);

// =============================================================================
// GRID — positions widgets in CSS grid based on row/col spans
// =============================================================================
const Grid = ({ children, gap = 16, cols = 12 }) => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gridAutoRows: '88px',
    gap,
    padding: '18px 24px',
  }}>
    {children}
  </div>
);

const Cell = ({ c = 3, r = 3, children }) => (
  <div style={{ gridColumn: `span ${c}`, gridRow: `span ${r}`, minHeight: 0 }}>{children}</div>
);

// =============================================================================
// SCENE 1 — FULL DASHBOARD (the hero)
// =============================================================================
const SceneDashFull = ({ chatOpen = false }) => (
  <DashFrame
    chatOpen={chatOpen}
    header={<DashHeader title="Weekly traffic overview" chatOpen={chatOpen} />}
  >
    <Grid>
      {/* 4 KPIs */}
      <Cell c={3} r={2}>
        <DashScorecard
          label="New users"
          value="124,418"
          change="+12.4%"
          period="vs. prev. 7d"
          sparkline={<Sparkline points={[4,7,5,9,6,11,8,14,10,13,12,17]} h={32} />}
        />
      </Cell>
      <Cell c={3} r={2}>
        <DashScorecard
          label="Sessions"
          value="318,902"
          change="+8.1%"
          period="vs. prev. 7d"
          sparkline={<Sparkline points={[14,13,16,15,18,17,20,19,22,21,24,23]} h={32} />}
        />
      </Cell>
      <Cell c={3} r={2}>
        <DashScorecard
          label="Bounce rate"
          value="42.6%"
          change="-1.8%"
          period="vs. prev. 7d"
          invert
          sparkline={<Sparkline points={[12,11,13,10,11,9,10,8,9,7,8,6]} h={32} />}
        />
      </Cell>
      <Cell c={3} r={2}>
        <DashScorecard
          label="Cost per new user"
          value="$2.41"
          change="+$0.08"
          period="vs. prev. 7d"
          invert
          sparkline={<Sparkline points={[8,9,8,10,9,11,10,12,11,13,12,14]} h={32} />}
        />
      </Cell>

      {/* line chart — big */}
      <Cell c={8} r={4}>
        <WidgetShell
          title="New users by channel"
          kicker="Line chart"
        >
          <div style={{ height: '100%' }}>
            <LineChart w={720} h={240} />
          </div>
        </WidgetShell>
      </Cell>

      {/* bar chart — side */}
      <Cell c={4} r={4}>
        <WidgetShell
          title="Sessions by channel"
          kicker="Bar chart"
        >
          <BarChart />
        </WidgetShell>
      </Cell>

      {/* table */}
      <Cell c={8} r={4}>
        <DashTable
          title="Top landing pages"
          columns={[
            { label: 'Page',              w: '44%' },
            { label: 'Sessions',   num: true },
            { label: 'Conv. rate', num: true },
            { label: 'Δ 7d',       num: true },
          ]}
          rows={[
            ['/pricing',             '18,402',  '4.8%',  '+18%'],
            ['/blog/new-campaign',   '12,108',  '3.2%',  '+42%'],
            ['/features/dashboards', '9,817',   '5.6%',  '+9%'],
            ['/',                    '8,412',   '2.1%',  '-3%'],
            ['/blog/q4-retrospective', '7,304', '3.9%',  '+12%'],
          ]}
          footnote="Showing 5 of 38 pages"
        />
      </Cell>

      {/* sankey */}
      <Cell c={4} r={4}>
        <WidgetShell
          title="Channel → Landing page flow"
          kicker="Sankey"
        >
          <div style={{ height: '100%', display: 'flex', alignItems: 'center' }}>
            <DashSankey w={340} h={260} />
          </div>
        </WidgetShell>
      </Cell>
    </Grid>
  </DashFrame>
);

// =============================================================================
// SCENE 2 — Dashboard + chat dock open
// =============================================================================
const SceneDashWithChat = () => <SceneDashFull chatOpen />;

// =============================================================================
// SCENE 3 — Generating / streaming widget
// =============================================================================
const SceneDashGenerating = () => (
  <DashFrame header={<DashHeader title="Weekly traffic overview" />}>
    <Grid>
      <Cell c={3} r={2}>
        <DashScorecard label="New users" value="124,418" change="+12.4%" sparkline={<Sparkline h={32} />} />
      </Cell>
      <Cell c={3} r={2}>
        <DashScorecard label="Sessions" value="318,902" change="+8.1%" sparkline={<Sparkline points={[14,13,16,15,18,17,20,19,22,21,24,23]} h={32} />} />
      </Cell>
      <Cell c={3} r={2}>
        <DashScorecard label="Bounce rate" value="42.6%" change="-1.8%" invert sparkline={<Sparkline points={[12,11,13,10,11,9,10,8,9,7,8,6]} h={32} />} />
      </Cell>
      <Cell c={3} r={2}>
        <DashScorecard label="Cost / new user" value="$2.41" change="+$0.08" invert sparkline={<Sparkline points={[8,9,8,10,9,11,10,12,11,13,12,14]} h={32} />} />
      </Cell>

      <Cell c={8} r={4}>
        <WidgetShell
          title="New users by channel"
          kicker="Line chart"
        >
          <LineChart w={720} h={240} />
        </WidgetShell>
      </Cell>

      {/* generating widget */}
      <Cell c={4} r={4}>
        <WidgetShell
          title="Sessions by device, last 30 days"
          kicker="Generating…"
          loading
          actions={<button title="Cancel" style={{ width: 24, height: 24, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-muted)', borderRadius: 6 }}><I.X size={13} /></button>}
        />
      </Cell>
    </Grid>
  </DashFrame>
);

// =============================================================================
// SCENE 4 — Add widget dialog open
// =============================================================================
const SceneDashAddDialog = () => (
  <div style={{ position: 'relative', width: 1280, height: 900 }}>
    <SceneDashFull />
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <AddWidgetDialog open selectedChart="line" />
    </div>
  </div>
);

// =============================================================================
// SCENE 5 — Widget menu open (hover state)
// =============================================================================
const SceneDashWidgetMenu = () => (
  <DashFrame header={<DashHeader title="Weekly traffic overview" />}>
    <Grid>
      <Cell c={3} r={2}>
        <DashScorecard label="New users" value="124,418" change="+12.4%" menuOpen sparkline={<Sparkline h={32} />} />
      </Cell>
      <Cell c={3} r={2}>
        <DashScorecard label="Sessions" value="318,902" change="+8.1%" sparkline={<Sparkline points={[14,13,16,15,18,17,20,19,22,21,24,23]} h={32} />} />
      </Cell>
      <Cell c={3} r={2}>
        <DashScorecard label="Bounce rate" value="42.6%" change="-1.8%" invert sparkline={<Sparkline points={[12,11,13,10,11,9,10,8,9,7,8,6]} h={32} />} />
      </Cell>
      <Cell c={3} r={2}>
        <DashScorecard label="Cost / new user" value="$2.41" change="+$0.08" invert sparkline={<Sparkline points={[8,9,8,10,9,11,10,12,11,13,12,14]} h={32} />} />
      </Cell>
      <Cell c={8} r={4}>
        <WidgetShell title="New users by channel" kicker="Line chart">
          <LineChart w={720} h={240} />
        </WidgetShell>
      </Cell>
      <Cell c={4} r={4}>
        <WidgetShell title="Sessions by channel" kicker="Bar chart" menuOpen>
          <BarChart />
        </WidgetShell>
      </Cell>
    </Grid>
  </DashFrame>
);

// =============================================================================
// SCENE 6 — Empty dashboard
// =============================================================================
const SceneDashEmpty = () => (
  <DashFrame header={<DashHeader title="New dashboard" lastRefreshed="never" />}>
    <DashEmpty />
  </DashFrame>
);

// =============================================================================
// SCENE 7 — Dashboards list
// =============================================================================
const SceneDashList = () => (
  <DashFrame header={null}>
    <DashboardsList />
  </DashFrame>
);

// =============================================================================
// SCENE 8 — Error state widget
// =============================================================================
const SceneDashError = () => (
  <DashFrame header={<DashHeader title="Weekly traffic overview" />}>
    <Grid>
      <Cell c={3} r={2}>
        <DashScorecard label="New users" value="124,418" change="+12.4%" sparkline={<Sparkline h={32} />} />
      </Cell>
      <Cell c={3} r={2}>
        <DashScorecard label="Sessions" value="318,902" change="+8.1%" sparkline={<Sparkline points={[14,13,16,15,18,17,20,19,22,21,24,23]} h={32} />} />
      </Cell>
      <Cell c={6} r={2}>
        <WidgetShell
          title="Campaign performance by platform"
          kicker="Bar chart"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 2px' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'var(--neg-bg)', color: 'var(--neg)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}><I.Alert size={16} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>Microsoft Ads token expired</div>
              <div style={{ fontSize: 12, color: 'var(--ink-muted)', lineHeight: 1.5 }}>We could query Google Ads but not Microsoft. Reconnect to include both sources.</div>
            </div>
            <Btn variant="outline" size="sm" icon={<I.Plug size={12} />}>Reconnect</Btn>
          </div>
        </WidgetShell>
      </Cell>

      <Cell c={8} r={4}>
        <WidgetShell title="New users by channel" kicker="Line chart">
          <LineChart w={720} h={240} />
        </WidgetShell>
      </Cell>
      <Cell c={4} r={4}>
        <WidgetShell title="Sessions by channel" kicker="Bar chart"><BarChart /></WidgetShell>
      </Cell>
    </Grid>
  </DashFrame>
);

// =============================================================================
// SCENE 9 — Mobile dashboard
// =============================================================================
const SceneDashMobile = () => (
  <div style={{
    width: 420, height: 840,
    background: 'var(--bg)', color: 'var(--ink)',
    fontFamily: 'var(--font-sans)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    border: '1px solid var(--line)', borderRadius: 24,
  }}>
    {/* header */}
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '14px 14px 12px', borderBottom: '1px solid var(--line)',
      background: 'var(--surface)',
    }}>
      <button style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--ink-muted)' }}><I.Menu size={18} /></button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="kicker" style={{ fontSize: 9, marginBottom: 0 }}>Dashboard</div>
        <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Weekly traffic overview</div>
      </div>
      <button style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--ink-muted)' }}><I.Sparkle size={18} /></button>
    </div>

    <div style={{
      padding: '10px 14px',
      borderBottom: '1px solid var(--line)',
      display: 'flex', alignItems: 'center', gap: 8,
      background: 'var(--surface)',
    }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '5px 9px', background: 'var(--surface-2)',
        border: '1px solid var(--line)', borderRadius: 7,
        fontSize: 11, color: 'var(--ink)',
      }}>
        <span style={{ fontWeight: 500 }}>Last 7 days</span>
        <I.Chevron size={11} style={{ color: 'var(--ink-muted)' }} />
      </div>
      <div style={{ flex: 1 }} />
      <button style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--ink-muted)' }}><I.Refresh size={14} /></button>
    </div>

    {/* body */}
    <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* kpi row — 2x2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div style={{ height: 110 }}><DashScorecard label="New users" value="124,418" change="+12.4%" /></div>
        <div style={{ height: 110 }}><DashScorecard label="Sessions" value="318,902" change="+8.1%" /></div>
        <div style={{ height: 110 }}><DashScorecard label="Bounce rate" value="42.6%" change="-1.8%" invert /></div>
        <div style={{ height: 110 }}><DashScorecard label="Cost / user" value="$2.41" change="+$0.08" invert /></div>
      </div>

      <div style={{ height: 220 }}>
        <WidgetShell title="New users by channel" kicker="Line chart" compact>
          <LineChart w={380} h={150} />
        </WidgetShell>
      </div>

      <div style={{ height: 240 }}>
        <WidgetShell title="Sessions by channel" kicker="Bar chart" compact>
          <BarChart />
        </WidgetShell>
      </div>
    </div>

    {/* bottom composer stub */}
    <div style={{
      borderTop: '1px solid var(--line)', padding: 10,
      background: 'var(--surface)',
      display: 'flex', gap: 8, alignItems: 'center',
    }}>
      <div style={{
        flex: 1,
        border: '1px solid var(--line-strong)', borderRadius: 999,
        padding: '8px 14px', background: 'var(--surface-2)',
        fontSize: 12, color: 'var(--ink-muted)',
      }}>Ask about this dashboard…</div>
      <button style={{
        width: 34, height: 34, borderRadius: 999,
        background: 'var(--ink)', color: 'var(--ink-inverse)',
        border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}><I.Sparkle size={15} /></button>
    </div>
  </div>
);

// Export scenes
Object.assign(window, {
  SceneDashFull, SceneDashWithChat, SceneDashGenerating,
  SceneDashAddDialog, SceneDashWidgetMenu, SceneDashEmpty,
  SceneDashList, SceneDashError, SceneDashMobile,
  DashFrame,
});
