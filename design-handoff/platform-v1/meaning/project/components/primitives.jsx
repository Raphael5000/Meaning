/* global React */
// Primitives: icons, buttons, chips, dividers — thin, uniform 1.5px strokes
const { useState, useEffect, useRef, useMemo } = React;

// Uniform line icon — 16px default. Stroke-width 1.5, rounded.
const Icon = ({ d, size = 16, stroke = 1.5, fill = 'none', viewBox = '0 0 24 24', children, style }) => (
  <svg width={size} height={size} viewBox={viewBox} fill={fill} stroke="currentColor"
    strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true">
    {d ? <path d={d} /> : children}
  </svg>
);

const I = {
  Plus:     (p)=><Icon {...p}><path d="M12 5v14M5 12h14"/></Icon>,
  Edit:     (p)=><Icon {...p}><path d="M4 20h4l10.5-10.5a2.12 2.12 0 0 0-3-3L5 17v3z"/></Icon>,
  Grid:     (p)=><Icon {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></Icon>,
  Bell:     (p)=><Icon {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></Icon>,
  Plug:     (p)=><Icon {...p}><path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0V8zM12 18v4"/></Icon>,
  Users:    (p)=><Icon {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></Icon>,
  Chevron:  (p)=><Icon {...p}><path d="M6 9l6 6 6-6"/></Icon>,
  ChevronR: (p)=><Icon {...p}><path d="M9 18l6-6-6-6"/></Icon>,
  ChevronL: (p)=><Icon {...p}><path d="M15 18l-6-6 6-6"/></Icon>,
  Search:   (p)=><Icon {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></Icon>,
  Menu:     (p)=><Icon {...p}><path d="M3 6h18M3 12h18M3 18h18"/></Icon>,
  Pin:      (p)=><Icon {...p}><path d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></Icon>,
  More:     (p)=><Icon {...p}><circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/></Icon>,
  ArrowUp:  (p)=><Icon {...p}><path d="M12 19V5M5 12l7-7 7 7"/></Icon>,
  Sparkle:  (p)=><Icon {...p}><path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6z"/></Icon>,
  Check:    (p)=><Icon {...p}><path d="M20 6L9 17l-5-5"/></Icon>,
  X:        (p)=><Icon {...p}><path d="M18 6L6 18M6 6l12 12"/></Icon>,
  Db:       (p)=><Icon {...p}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></Icon>,
  Download: (p)=><Icon {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></Icon>,
  Copy:     (p)=><Icon {...p}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></Icon>,
  Refresh: (p)=><Icon {...p}><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/></Icon>,
  Stop:     (p)=><Icon {...p}><rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" stroke="none"/></Icon>,
  ArrowUpR:(p)=><Icon {...p}><path d="M7 17L17 7M8 7h9v9"/></Icon>,
  Up:       (p)=><Icon {...p}><path d="M18 15l-6-6-6 6"/></Icon>,
  Down:     (p)=><Icon {...p}><path d="M6 9l6 6 6-6"/></Icon>,
  User:     (p)=><Icon {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></Icon>,
  Logout:   (p)=><Icon {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></Icon>,
  Bug:      (p)=><Icon {...p}><rect x="8" y="6" width="8" height="14" rx="4"/><path d="M19 7l-3 2M5 7l3 2M19 17l-3-2M5 17l3-2M12 20v-5M10 4h4"/></Icon>,
  Link:     (p)=><Icon {...p}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></Icon>,
  Command:  (p)=><Icon {...p}><path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/></Icon>,
  Alert:    (p)=><Icon {...p}><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></Icon>,
};

// ============================================================================
// BRAND MARK — PLACEHOLDER
// ----------------------------------------------------------------------------
// TODO(implementer): Replace this placeholder with the real Hivory logo asset
// from our codebase. This is NOT the final mark — it's a stand-in for layout
// only. Drop the real SVG/PNG in place of the contents of this component and
// keep the `size` prop working so sizing in the sidebar (22px) and mobile
// drawer (18px) stays consistent.
// ============================================================================
const Mark = ({ size = 22, inverse = false }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" data-placeholder="hivory-logo">
    <rect x="1" y="1" width="30" height="30" rx="7" fill="var(--brand-vivid)" />
    <path d="M8 22V10l4 6 4-6v12M20 22V10h4v12" stroke="var(--on-brand)" strokeWidth="1.75" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Data source glyph — 1-letter monogram in a small square
const SourceGlyph = ({ label, letter }) => (
  <span className="inline-flex items-center justify-center rounded" style={{
    width: 14, height: 14,
    background: 'var(--surface-3)',
    color: 'var(--ink-muted)',
    fontFamily: 'var(--font-mono)',
    fontSize: 9, fontWeight: 600,
    border: '1px solid var(--line)'
  }} title={label}>{letter}</span>
);

// Small kbd-style pill
const Kbd = ({ children }) => (
  <span style={{
    fontFamily: 'var(--font-mono)', fontSize: 10,
    padding: '1px 5px', borderRadius: 4,
    background: 'var(--surface-2)', border: '1px solid var(--line)',
    color: 'var(--ink-muted)'
  }}>{children}</span>
);

// Chip (suggested question / secondary action)
const Chip = ({ children, onClick, icon, block }) => (
  <button onClick={onClick} style={{
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '7px 14px', borderRadius: 999,
    background: 'transparent', color: 'var(--ink)',
    border: '1px solid var(--line-strong)', fontSize: 13,
    cursor: 'pointer', transition: 'all 150ms var(--ease)',
    whiteSpace: block ? 'normal' : 'nowrap', textAlign: 'left', maxWidth: '100%',
    lineHeight: 1.4,
  }}
  onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.borderColor = 'var(--ink)'; }}
  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--line-strong)'; }}>
    {icon}{children}
  </button>
);

// Button primary / ghost / outline
const Btn = ({ children, variant = 'primary', size = 'md', icon, onClick, style, ...rest }) => {
  const pad = size === 'sm' ? '6px 12px' : size === 'icon' ? '7px' : '9px 16px';
  const fs  = size === 'sm' ? 12.5 : 13.5;
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: pad, fontSize: fs, fontWeight: 500, letterSpacing: '-0.005em',
    borderRadius: size === 'icon' ? 6 : 8, cursor: 'pointer',
    transition: 'all 120ms var(--ease)', border: '1px solid transparent',
    fontFamily: 'var(--font-sans)', ...style,
  };
  const variants = {
    primary: { background: 'var(--ink)', color: 'var(--ink-inverse)', borderColor: 'var(--ink)', fontWeight: 600 },
    outline: { background: 'transparent', color: 'var(--ink)', borderColor: 'var(--line-strong)' },
    ghost:   { background: 'transparent', color: 'var(--ink)', borderColor: 'transparent' },
    subtle:  { background: 'var(--surface-2)', color: 'var(--ink)', borderColor: 'var(--line)' },
    dark:    { background: 'var(--ink)', color: 'var(--ink-inverse)', borderColor: 'var(--ink)' },
  };
  return <button onClick={onClick} style={{ ...base, ...variants[variant] }} {...rest}>{icon}{children}</button>;
};

// Avatar — initials in a square
const Avatar = ({ initials, size = 28 }) => (
  <div style={{
    width: size, height: size,
    background: 'var(--ink)', color: 'var(--ink-inverse)',
    fontSize: size * 0.4, fontWeight: 600,
    borderRadius: 6,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--font-sans)',
    letterSpacing: '-0.02em',
  }}>{initials}</div>
);

// Small dot separator
const Dot = () => <span style={{ display: 'inline-block', width: 2, height: 2, borderRadius: 999, background: 'var(--ink-subtle)' }} />;

// ----------------------------------------------------------------------
// THINKING BLOB — organic morphing pill, breathes + slowly rotates
// Uses SVG <animate> on <path> d attribute so it's self-contained, no JS loop.
// Props: size (px), color (css var or hex), paused (bool)
// ----------------------------------------------------------------------
const ThinkingBlob = ({ size = 26, color = 'var(--brand-vivid)', paused = false }) => {
  // Loose hand-drawn scribbles — the kind you do when thinking.
  // Each path is an unclosed squiggle that morphs between shapes.
  // Uses stroke-dashoffset to make it "draw itself" repeatedly.
  const scribbles = [
    // A — loose spiral-ish tangle
    'M20,30 C30,18 48,18 56,30 C62,40 48,50 38,50 C28,50 24,40 34,34 C46,28 64,38 70,52 C74,62 62,72 50,72 C36,72 24,62 26,48',
    // B — zigzag loop
    'M18,42 C28,26 48,22 62,34 C74,44 70,62 56,68 C44,72 30,66 30,54 C30,44 44,40 54,46 C64,52 62,62 52,66',
    // C — knot
    'M22,50 C28,34 50,28 60,40 C70,50 56,64 42,60 C30,56 28,42 40,36 C54,30 70,42 68,58 C66,72 48,76 34,70',
    // D — long S-curve with hook
    'M18,36 C32,22 50,26 56,38 C62,50 46,58 36,54 C28,50 30,40 42,42 C58,44 68,54 68,66 C68,74 56,76 46,70',
  ];
  return (
    <span style={{ display: 'inline-flex', width: size, height: size, flexShrink: 0, position: 'relative' }}>
      <svg viewBox="0 0 90 90" width={size} height={size} aria-hidden="true" style={{ overflow: 'visible' }}>
        <path
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="140 140"
          style={{
            animation: paused ? 'none' : 'scribble-draw 2.8s cubic-bezier(0.65, 0, 0.35, 1) infinite',
          }}
        >
          <animate
            attributeName="d"
            dur="4.8s"
            repeatCount="indefinite"
            values={[...scribbles, scribbles[0]].join(';')}
            calcMode="spline"
            keySplines={Array(scribbles.length).fill('0.45 0 0.55 1').join(';')}
          />
        </path>
      </svg>
    </span>
  );
};

// Inject blob keyframes + pulse-dot styling once
(function injectThinkingStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('thinking-blob-styles')) return;
  const s = document.createElement('style');
  s.id = 'thinking-blob-styles';
  s.textContent = `
    @keyframes blob-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes scribble-draw {
      0%   { stroke-dashoffset: 140; }
      45%  { stroke-dashoffset: 0; }
      55%  { stroke-dashoffset: 0; }
      100% { stroke-dashoffset: -140; }
    }
    @keyframes pulse-dot-kf {
      0%, 100% { transform: scale(1); opacity: 1; }
      50%      { transform: scale(1.35); opacity: 0.55; }
    }
    .pulse-dot {
      display: inline-block;
      width: 6px; height: 6px; border-radius: 999px;
      background: var(--brand-vivid);
      animation: pulse-dot-kf 1.4s ease-in-out infinite;
    }
    @keyframes caret-kf { 50% { opacity: 0; } }
    .caret {
      display: inline-block; width: 2px; height: 1em;
      background: currentColor; margin-left: 2px;
      vertical-align: -2px; animation: caret-kf 1s steps(2, start) infinite;
    }
    @keyframes shimmer-kf {
      0%   { background-position: -200px 0; }
      100% { background-position: calc(200px + 100%) 0; }
    }
    .shimmer {
      background: linear-gradient(90deg,
        var(--surface-2) 0%,
        color-mix(in oklab, var(--surface-2) 60%, var(--line-strong)) 50%,
        var(--surface-2) 100%);
      background-size: 200px 100%;
      background-repeat: no-repeat;
      animation: shimmer-kf 1.6s ease-in-out infinite;
    }
    @keyframes bar-pulse-kf {
      0%, 100% { opacity: 0.55; transform: scaleY(0.85); }
      50%      { opacity: 1;    transform: scaleY(1); }
    }
    .barpulse { transform-origin: bottom; animation: bar-pulse-kf 1.2s ease-in-out infinite; }
  `;
  document.head.appendChild(s);
})();

Object.assign(window, { Icon, I, Mark, SourceGlyph, Kbd, Chip, Btn, Avatar, Dot, ThinkingBlob });
