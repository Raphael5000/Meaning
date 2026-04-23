import * as React from "react";

interface IconProps {
  size?: number;
  stroke?: number;
  className?: string;
  style?: React.CSSProperties;
}

const Base = ({
  size = 16,
  stroke = 1.5,
  className,
  style,
  children,
}: IconProps & { children: React.ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
    aria-hidden="true"
  >
    {children}
  </svg>
);

export const I = {
  Plus: (p: IconProps) => (
    <Base {...p}><path d="M12 5v14M5 12h14" /></Base>
  ),
  Edit: (p: IconProps) => (
    <Base {...p}><path d="M4 20h4l10.5-10.5a2.12 2.12 0 0 0-3-3L5 17v3z" /></Base>
  ),
  Grid: (p: IconProps) => (
    <Base {...p}>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </Base>
  ),
  Bell: (p: IconProps) => (
    <Base {...p}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </Base>
  ),
  Plug: (p: IconProps) => (
    <Base {...p}><path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0V8zM12 18v4" /></Base>
  ),
  Users: (p: IconProps) => (
    <Base {...p}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </Base>
  ),
  Chevron: (p: IconProps) => (
    <Base {...p}><path d="M6 9l6 6 6-6" /></Base>
  ),
  ChevronR: (p: IconProps) => (
    <Base {...p}><path d="M9 18l6-6-6-6" /></Base>
  ),
  ChevronL: (p: IconProps) => (
    <Base {...p}><path d="M15 18l-6-6 6-6" /></Base>
  ),
  Search: (p: IconProps) => (
    <Base {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </Base>
  ),
  Menu: (p: IconProps) => (
    <Base {...p}><path d="M3 6h18M3 12h18M3 18h18" /></Base>
  ),
  Pin: (p: IconProps) => (
    <Base {...p}>
      <path d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
    </Base>
  ),
  More: (p: IconProps) => (
    <Base {...p}>
      <circle cx="5" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="19" cy="12" r="1" fill="currentColor" />
    </Base>
  ),
  ArrowUp: (p: IconProps) => (
    <Base {...p}><path d="M12 19V5M5 12l7-7 7 7" /></Base>
  ),
  Sparkle: (p: IconProps) => (
    <Base {...p}><path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6z" /></Base>
  ),
  Check: (p: IconProps) => (
    <Base {...p}><path d="M20 6L9 17l-5-5" /></Base>
  ),
  X: (p: IconProps) => (
    <Base {...p}><path d="M18 6L6 18M6 6l12 12" /></Base>
  ),
  Db: (p: IconProps) => (
    <Base {...p}>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
    </Base>
  ),
  Download: (p: IconProps) => (
    <Base {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></Base>
  ),
  Copy: (p: IconProps) => (
    <Base {...p}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </Base>
  ),
  Refresh: (p: IconProps) => (
    <Base {...p}><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" /></Base>
  ),
  Stop: (p: IconProps) => (
    <Base {...p}><rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" stroke="none" /></Base>
  ),
  ArrowUpR: (p: IconProps) => (
    <Base {...p}><path d="M7 17L17 7M8 7h9v9" /></Base>
  ),
  Up: (p: IconProps) => (
    <Base {...p}><path d="M18 15l-6-6-6 6" /></Base>
  ),
  Down: (p: IconProps) => (
    <Base {...p}><path d="M6 9l6 6 6-6" /></Base>
  ),
  User: (p: IconProps) => (
    <Base {...p}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </Base>
  ),
  Logout: (p: IconProps) => (
    <Base {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></Base>
  ),
  Bug: (p: IconProps) => (
    <Base {...p}>
      <rect x="8" y="6" width="8" height="14" rx="4" />
      <path d="M19 7l-3 2M5 7l3 2M19 17l-3-2M5 17l3-2M12 20v-5M10 4h4" />
    </Base>
  ),
  Link: (p: IconProps) => (
    <Base {...p}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </Base>
  ),
  Alert: (p: IconProps) => (
    <Base {...p}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </Base>
  ),
};

export type IconComponent = React.ComponentType<IconProps>;
