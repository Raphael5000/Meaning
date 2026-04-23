/* global React, Sidebar, Composer, UserMsg, AssistantMsg, Scorecard, Sparkline, ChartCard, LineChart, BarChart, LegendChip, TableCard, Rec, ToolCard, Suggested, Thinking, ChartSkeleton, ErrorBanner, Chip, Btn, I, Mark, Avatar, Kbd, Dot, SourceGlyph */
// Scene builders — each exported scene is a full chat frame
const { useState } = React;

// ----------------------------------------------------------------------
// FRAME — shared wrapper: sidebar + chat column with composer
// ----------------------------------------------------------------------
const Frame = ({ collapsed = false, children, width = 1280, height = 880, subheader, showComposer = true, composerDisabled = false, composerValue = '' }) => (
  <div style={{ width, height, display: 'flex', background: 'var(--bg)', color: 'var(--ink)', fontFamily: 'var(--font-sans)', overflow: 'hidden' }}>
    <Sidebar collapsed={collapsed} />
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      {subheader}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>{children}</div>
        {showComposer && <Composer disabled={composerDisabled} value={composerValue} />}
      </div>
    </div>
  </div>
);

const ChatHeader = ({ title = 'Top pages this week', right }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderBottom: '1px solid var(--line)', background: 'var(--surface)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
      <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {right || <>
        <Btn size="sm" variant="ghost" icon={<I.Pin size={13} />}>Pin</Btn>
        <Btn size="sm" variant="ghost" icon={<I.Link size={13} />}>Share</Btn>
        <Btn size="sm" variant="ghost" icon={<I.More size={13} />} />
      </>}
    </div>
  </div>
);

// ----------------------------------------------------------------------
// SCENE 1 — Full conversation (dark)
// ----------------------------------------------------------------------
const SceneFullChat = () => (
  <Frame subheader={<ChatHeader title="Top traffic drivers — last 7 days" />}>
    <UserMsg>Which channels drove the most new users last week, and how does that compare to the week before?</UserMsg>

    <AssistantMsg meta="Sources: GA4 · Google Ads">
      <ToolCard name="ga4.acquisitionByChannel" params="7d vs prev 7d" />

      <Scorecard
        value="124,418"
        label="New users"
        change="+12.4%"
        period="vs. prev. 7d"
        sparkline={<Sparkline />}
      />

      <ChartCard
        title="New users by channel"
        subtitle="Daily, last 7 days — solid: this week, dashed: prior"
        legend={<>
          <LegendChip label="This week" value="124,418" />
          <LegendChip label="Prior week" value="110,683" kind="dashed" />
        </>}
      >
        <LineChart />
      </ChartCard>

      <div className="prose-chat">
        <p>Organic Search remains the dominant driver, widening the gap on last week. Direct is flat, while <strong>Paid Search</strong> surged after the new campaign launch on Nov&nbsp;6.</p>
        <ul>
          <li>Organic Search up 14.2% on a strong blog CTR bump.</li>
          <li>Paid Search up 28% — cost-per-new-user held at $2.41.</li>
          <li>Email soft; open rate dipped below 12% for the first time in a quarter.</li>
        </ul>
      </div>

      <Rec>
        Double down on the <strong>November blog series</strong> — it's the primary source of the Organic lift. Consider a paid amplification test (LinkedIn, $500 cap) on the two top-performing posts to see if signups convert at the same rate outside owned search.
      </Rec>

      <Suggested items={[
        'Break Organic Search down by landing page',
        'Why did Email drop this week?',
        'Forecast next week at current pace',
      ]} />
    </AssistantMsg>
  </Frame>
);

// ----------------------------------------------------------------------
// SCENE 2 — Streaming with tool status
// ----------------------------------------------------------------------
const SceneStreaming = () => (
  <Frame composerDisabled composerValue="">
    <UserMsg>Forecast next week at the current pace.</UserMsg>
    <AssistantMsg thinking>
      <Stages
        title="Forecasting next week"
        steps={[
          { label: 'Parse question',           detail: "intent=forecast · metric=newUsers · horizon=7d",                status: 'done',    duration: 0.2 },
          { label: 'Pull historical baseline', detail: "ga4.timeSeries(metric=newUsers, range=90d) → 90 rows",          status: 'done',    duration: 0.8 },
          { label: 'Check seasonality',        detail: "dow + wow patterns · no anomalies in last 14d",                 status: 'done',    duration: 0.4 },
          { label: 'Run forecast model',       detail: "forecast.arima(p=1,d=1,q=1) → building 80% & 95% intervals",    status: 'active' },
          { label: 'Compose answer',           detail: "point estimate + band + drivers",                               status: 'pending' },
        ]}
      />
    </AssistantMsg>
  </Frame>
);

// ----------------------------------------------------------------------
// SCENE 3 — Streaming a chart specifically
// ----------------------------------------------------------------------
const SceneChartLoading = () => (
  <Frame composerDisabled>
    <UserMsg>Show me a breakdown of traffic sources as a chart.</UserMsg>
    <AssistantMsg thinking>
      <Stages
        title="Building chart"
        steps={[
          { label: 'Identify data source',     detail: "GA4 · acquisitionSource dimension",                    status: 'done',   duration: 0.1 },
          { label: 'Query traffic by source',  detail: "ga4.acquisitionByChannel(range=30d) → 6 channels",     status: 'done',   duration: 0.7 },
          { label: 'Rank and normalize',       detail: "sort desc by sessions · compute share of total",      status: 'done',   duration: 0.2 },
          { label: 'Render visualization',     detail: "horizontal bar · 240px · 12 series",                   status: 'active' },
        ]}
      />
      <ChartSkeleton />
    </AssistantMsg>
  </Frame>
);

// ----------------------------------------------------------------------
// SCENE 4 — Attachment: table
// ----------------------------------------------------------------------
const SceneTable = () => (
  <Frame subheader={<ChatHeader title="Top pages this week" />}>
    <UserMsg>Top 10 landing pages by sessions, with bounce rate and avg. time.</UserMsg>
    <AssistantMsg meta="Sources: GA4">
      <ToolCard name="ga4.landingPages" params="limit=10, range=7d" />
      <TableCard
        title="Landing pages — last 7 days"
        columns={[
          { label: '#', w: 40, mono: true },
          { label: 'Page' },
          { label: 'Sessions', num: true, mono: true, w: 110 },
          { label: 'Δ WoW',   num: true, mono: true, w: 90 },
          { label: 'Bounce',  num: true, mono: true, w: 80 },
          { label: 'Avg. time', num: true, mono: true, w: 100 },
        ]}
        rows={[
          ['01', '/blog/analytics-without-dashboards', '18,204', '+22%', '34.1%', '2m 14s'],
          ['02', '/', '12,938', '+4%', '58.0%', '0m 42s'],
          ['03', '/pricing', '9,441', '+11%', '41.2%', '1m 06s'],
          ['04', '/blog/ga4-cheatsheet', '7,820', '+18%', '29.8%', '3m 01s'],
          ['05', '/features/chat', '5,212', '-2%', '48.5%', '1m 22s'],
          ['06', '/docs/quickstart', '4,103', '+1%', '33.4%', '2m 48s'],
          ['07', '/compare/looker-studio', '3,618', '+44%', '36.1%', '2m 05s'],
          ['08', '/blog/forecasting', '2,941', '+8%', '31.2%', '2m 31s'],
          ['09', '/signup', '2,312', '+3%', '22.0%', '0m 28s'],
          ['10', '/agency-reporting', '1,884', '-6%', '44.3%', '1m 11s'],
        ]}
        footnote="Showing 10 of 1,284 pages · Source: GA4 property 491203881 · Excludes bot traffic"
      />
      <div className="prose-chat">
        <p>The top blog post now outpaces your homepage — the first time this has happened in the last 90 days. If that holds, you'll want to re-evaluate the site's primary conversion path.</p>
      </div>
      <Suggested items={[
        'Show the top blog post in a funnel view',
        'Which ad campaign brought /compare/looker-studio traffic?',
        'Compare bounce rates on mobile vs desktop',
      ]} />
    </AssistantMsg>
  </Frame>
);

// ----------------------------------------------------------------------
// SCENE 5 — Channel bar + prose + rec
// ----------------------------------------------------------------------
const SceneBreakdown = () => (
  <Frame subheader={<ChatHeader title="Channel breakdown" />}>
    <UserMsg>Break down new users by channel and tell me where I should focus.</UserMsg>
    <AssistantMsg meta="GA4 · Google Ads · LinkedIn">
      <ChartCard
        title="New users by channel"
        subtitle="Last 7 days · 124,418 total"
        height={240}
        legend={<>
          <LegendChip label="Top channel" value="Organic Search — 38.7%" />
        </>}
      >
        <BarChart />
      </ChartCard>
      <Rec label="Recommended next action">
        Shift <strong>15% of Google Ads spend</strong> from Display to Search — Display CPA is 3.2× higher this month and Search inventory has headroom at current bids.
      </Rec>
      <Suggested items={[
        'Model the CPA impact of the shift over 30 days',
        'Which Google Ads campaigns are wasting Display spend?',
        'Compare Organic Search pages week over week',
      ]} />
    </AssistantMsg>
  </Frame>
);

// ----------------------------------------------------------------------
// SCENE 6 — Empty state: no sources
// ----------------------------------------------------------------------
const SceneEmptyNoSources = () => (
  <Frame showComposer={false}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 40 }}>
      <div style={{ width: 440, textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, margin: '0 auto 22px', border: '1px solid var(--line-strong)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <I.Plug size={20} />
        </div>
        <div className="kicker" style={{ marginBottom: 10 }}>Step 1 of 1</div>
        <div style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.2, letterSpacing: '-0.02em', marginBottom: 10 }}>
          Connect a source to<br/>start asking questions.
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 22, lineHeight: 1.55 }}>
          Meaning queries your analytics directly. Connect at least one source — we'll never store the raw rows.
        </div>
        <Btn variant="primary" icon={<I.Plug size={13} />}>Connect a data source</Btn>
        <div style={{ marginTop: 22, display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
          {['GA4','Google Ads','LinkedIn','Mailchimp','GSC','Microsoft Ads'].map(s =>
            <div key={s} style={{ fontSize: 11, color: 'var(--ink-subtle)', fontFamily: 'var(--font-mono)' }}>{s}</div>
          )}
        </div>
      </div>
    </div>
  </Frame>
);

// ----------------------------------------------------------------------
// SCENE 7 — Empty state: sources connected, no chats
// ----------------------------------------------------------------------
const SceneEmptyReady = () => (
  <Frame>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '40px 24px' }}>
      <div style={{ width: '100%', maxWidth: 720, textAlign: 'center' }}>
        <div className="kicker" style={{ marginBottom: 12 }}>Hivory · hivory.com</div>
        <div style={{ fontSize: 36, fontWeight: 600, lineHeight: 1.15, letterSpacing: '-0.025em', marginBottom: 10 }}>
          What would you like to<br/>know about your traffic?
        </div>
        <div style={{ fontSize: 13.5, color: 'var(--ink-muted)', marginBottom: 28 }}>
          Ask anything in plain English. Four sources connected.
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
          {[
            'How many users visited this week?',
            'What are my top traffic sources?',
            'Which pages get the most views?',
            'Who is on my site right now?',
            'Compare last month to the one before it',
          ].map((q) => (
            <button key={q} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '9px 14px',
              border: '1px solid var(--line-strong)',
              background: 'var(--surface-2)',
              borderRadius: 999,
              cursor: 'pointer', color: 'var(--ink)', fontSize: 13,
              fontFamily: 'var(--font-sans)', lineHeight: 1.2,
              transition: 'background 120ms ease, border-color 120ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-3)'; e.currentTarget.style.borderColor = 'var(--ink-subtle)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.borderColor = 'var(--line-strong)'; }}
            >
              <span>{q}</span>
              <I.ArrowUpR size={12} style={{ color: 'var(--ink-muted)' }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  </Frame>
);

// ----------------------------------------------------------------------
// SCENE 8 — Error state
// ----------------------------------------------------------------------
const SceneError = () => (
  <Frame>
    <UserMsg>Pull last 90 days from BigQuery — all events.</UserMsg>
    <AssistantMsg>
      <ToolCard name="bq.query" params="range=90d, events=*" />
      <ErrorBanner
        title="BigQuery returned an error"
        detail="403 — The OAuth token has expired. Reconnect Google Analytics to resume."
        onRetry
      />
      <div className="prose-chat">
        <p>I couldn't complete the query. Reconnect GA4 in <strong>Connections</strong>, or try a narrower range — I can usually pull 30 days without the token refresh.</p>
      </div>
      <Suggested items={['Try the last 30 days instead', 'Open Connections', 'Show me only the errors']} />
    </AssistantMsg>
  </Frame>
);

// ----------------------------------------------------------------------
// SCENE 9 — Account menu open
// ----------------------------------------------------------------------
const SceneAccountMenu = () => (
  <div style={{ width: 1280, height: 880, display: 'flex', background: 'var(--bg)', overflow: 'hidden' }}>
    <div style={{ position: 'relative' }}>
      <Sidebar />
      {/* Account popover */}
      <div style={{
        position: 'absolute', left: 10, bottom: 68, width: 252,
        background: 'var(--surface)', border: '1px solid var(--line)',
        borderRadius: 10, boxShadow: 'var(--shadow-pop)', overflow: 'hidden', zIndex: 5,
      }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ fontSize: 12.5, fontWeight: 500 }}>Alex Romero</div>
          <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>alex@hivory.io</div>
        </div>
        {[
          { i: <I.User size={13} />, l: 'Account' },
          { i: <I.Plug size={13} />, l: 'Connections' },
          { i: <I.Users size={13} />, l: 'Team' },
          { i: <I.Bug size={13} />, l: 'Report a bug' },
        ].map(it => (
          <button key={it.l} className="row-hover" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12.5, color: 'var(--ink)', textAlign: 'left' }}>
            {it.i}<span>{it.l}</span>
          </button>
        ))}
        <div style={{ borderTop: '1px solid var(--line)' }} />
        <button className="row-hover" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12.5, color: 'var(--ink)', textAlign: 'left' }}>
          <I.Logout size={13} /><span>Log out</span>
        </button>
      </div>
    </div>
    <div style={{ flex: 1 }}>
      <ChatHeader />
      <div style={{ padding: 40 }} />
    </div>
  </div>
);

// ----------------------------------------------------------------------
// SCENE 10 — Sidebar collapsed
// ----------------------------------------------------------------------
const SceneCollapsed = () => (
  <Frame collapsed subheader={<ChatHeader title="Top traffic drivers — last 7 days" />}>
    <UserMsg>Which channels drove the most new users last week?</UserMsg>
    <AssistantMsg meta="Sources: GA4">
      <Scorecard value="124,418" label="New users" change="+12.4%" sparkline={<Sparkline />} />
      <div className="prose-chat">
        <p>Organic Search remains the dominant driver, widening the gap on last week. Paid Search surged after the Nov&nbsp;6 campaign launch.</p>
      </div>
    </AssistantMsg>
  </Frame>
);

// ----------------------------------------------------------------------
// SCENE 11 — Mobile (drawer + composer)
// ----------------------------------------------------------------------
const SceneMobile = ({ drawer = false }) => {
  const W = 390, H = 800;
  return (
    <div style={{ width: W, height: H, display: 'flex', flexDirection: 'column', background: 'var(--bg)', color: 'var(--ink)', border: '1px solid var(--line)', overflow: 'hidden', position: 'relative' }}>
      {/* Status bar mimic */}
      <div style={{ height: 38, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 20px 4px', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)' }}>
        <span>9:41</span><span>•••</span>
      </div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
        <button style={{ background: 'transparent', border: 'none', padding: 6, borderRadius: 6, cursor: 'pointer', color: 'var(--ink)' }}><I.Menu size={18} /></button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Mark size={18} />
          <span style={{ fontSize: 15, fontWeight: 600 }}>Meaning</span>
        </div>
        <button style={{ background: 'transparent', border: 'none', padding: 6, borderRadius: 6, cursor: 'pointer', color: 'var(--ink)' }}><I.Edit size={18} /></button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!drawer && <>
          <div style={{ padding: '14px 14px 10px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '9px 12px', fontSize: 13, maxWidth: '85%' }}>
                Top channels last week?
              </div>
            </div>
          </div>
          <div style={{ padding: '10px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}><Mark size={16} /><span className="kicker">Meaning</span></div>
            <Scorecard value="124,418" label="New users" change="+12.4%" />
            <ChartCard title="Channel share" subtitle="Last 7 days" actions={false} height={160}>
              <BarChart data={[
                { label: 'Organic Search', value: 48210 },
                { label: 'Direct', value: 22105 },
                { label: 'Referral', value: 14308 },
                { label: 'Paid Search', value: 11442 },
              ]} />
            </ChartCard>
            <div className="prose-chat" style={{ fontSize: 13 }}>
              <p>Organic leads comfortably. Paid Search surged after the Nov 6 campaign.</p>
            </div>
          </div>
        </>}
      </div>

      {/* Composer */}
      <div style={{ borderTop: '1px solid var(--line)', padding: '10px 12px 14px', background: 'var(--surface)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          <div style={{ flex: 1, border: '1px solid var(--line-strong)', borderRadius: 22, padding: '10px 14px', background: 'var(--surface-2)', fontSize: 14, color: 'var(--ink-muted)' }}>
            Ask about your analytics…
          </div>
          <button style={{ width: 38, height: 38, borderRadius: 999, background: 'var(--ink)', color: 'var(--ink-inverse)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><I.ArrowUp size={16} /></button>
        </div>
      </div>

      {/* Drawer overlay */}
      {drawer && (
        <>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10 }} />
          <div style={{ position: 'absolute', inset: '0 48px 0 0', background: 'var(--surface)', zIndex: 11, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--line)' }}>
            <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Mark size={18} /><span style={{ fontSize: 15, fontWeight: 600 }}>Meaning</span>
              </div>
              <button style={{ background: 'transparent', border: 'none', color: 'var(--ink)' }}><I.X size={18} /></button>
            </div>
            <div style={{ padding: '10px 12px' }}>
              <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: 'var(--ink)', color: 'var(--ink-inverse)', border: 'none', fontSize: 13.5, fontWeight: 600, marginBottom: 8 }}>
                <I.Edit size={14} /> New chat
              </button>
              <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: 'transparent', border: 'none', fontSize: 13.5, color: 'var(--ink)', textAlign: 'left' }}>
                <I.Grid size={14} /> Dashboards
              </button>
              <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: 'transparent', border: 'none', fontSize: 13.5, color: 'var(--ink)', textAlign: 'left' }}>
                <I.Bell size={14} /> Alerts
              </button>
            </div>
            <div style={{ padding: '8px 14px' }}>
              <div className="kicker" style={{ marginBottom: 6 }}>Today</div>
              {['Top pages this week','Which campaigns drove signups?','Bounce rate by landing page'].map(t => (
                <div key={t} style={{ padding: '8px 4px', fontSize: 13, color: 'var(--ink)', borderBottom: '1px solid var(--line)' }}>{t}</div>
              ))}
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ borderTop: '1px solid var(--line)', padding: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
              <Avatar initials="AR" size={30} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500 }}>Alex Romero</div>
                <div style={{ fontSize: 10.5, color: 'var(--ink-muted)' }}>Team plan</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------
// SCENE 12 — Long scroll demo with sticky composer
// ----------------------------------------------------------------------
const SceneLongScroll = () => (
  <Frame subheader={<ChatHeader title="November performance review" />}>
    <UserMsg>Give me a full Nov performance review — traffic, ads, email. Flag anything odd.</UserMsg>
    <AssistantMsg meta="GA4 · Google Ads · Mailchimp">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
        <div className="bw-card" style={{ padding: 14 }}>
          <div className="kicker" style={{ marginBottom: 4 }}>Sessions</div>
          <div className="serif num" style={{ fontSize: 32, lineHeight: 1 }}>412k</div>
          <div className="delta pos" style={{ marginTop: 4 }}><I.Up size={10} /> +8.1%</div>
        </div>
        <div className="bw-card" style={{ padding: 14 }}>
          <div className="kicker" style={{ marginBottom: 4 }}>Ad spend</div>
          <div className="serif num" style={{ fontSize: 32, lineHeight: 1 }}>$18.3k</div>
          <div className="delta neg" style={{ marginTop: 4 }}><I.Down size={10} /> -2.4%</div>
        </div>
        <div className="bw-card" style={{ padding: 14 }}>
          <div className="kicker" style={{ marginBottom: 4 }}>Signups</div>
          <div className="serif num" style={{ fontSize: 32, lineHeight: 1 }}>2,108</div>
          <div className="delta pos" style={{ marginTop: 4 }}><I.Up size={10} /> +14.6%</div>
        </div>
      </div>
      <ChartCard title="Sessions — November" subtitle="Daily, GA4" height={220}>
        <LineChart />
      </ChartCard>
      <div className="prose-chat">
        <p>November was the strongest month of the quarter. Sessions up 8% month-over-month, signups up 15% on flat ad spend — conversion rate is doing the heavy lifting.</p>
        <h3>What worked</h3>
        <ul>
          <li>The new pricing page (/pricing v2) shipped Nov 3 and lifted visit-to-signup from 2.1% to 2.8%.</li>
          <li>Google Ads shift from Display to Search cut CPA by 18%.</li>
          <li>Organic blog traffic held flat despite algo chatter in the industry.</li>
        </ul>
      </div>
      <Rec>
        Keep the <strong>Display→Search reallocation</strong> — CPA improvement is holding over 4 weeks, which is long enough to call real.
      </Rec>
      <Suggested items={[
        'Project December at the current pace',
        'Break down /pricing v2 by traffic source',
        'Why did email open rate dip mid-November?',
      ]} />
    </AssistantMsg>
  </Frame>
);

Object.assign(window, {
  Frame, ChatHeader,
  SceneFullChat, SceneStreaming, SceneChartLoading, SceneTable, SceneBreakdown,
  SceneEmptyNoSources, SceneEmptyReady, SceneError, SceneAccountMenu,
  SceneCollapsed, SceneMobile, SceneLongScroll,
});
