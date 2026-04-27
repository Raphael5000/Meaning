import * as React from "react";

/**
 * Brand mark — the Hivory diamond, recolored via currentColor.
 * Sidebar: 18-22px. Mobile drawer: 18px.
 */
export const Mark = ({ size = 22, color }: { size?: number; color?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 403 450"
    fill={color ?? "var(--v2-brand-vivid)"}
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M381.839 98.7109L223.621 5.71639C210.863 -1.78097 195.055 -1.91728 182.175 5.38924L22.48 95.8756C9.60023 103.168 1.58766 116.786 1.46564 131.59L0.00141168 315.071C-0.120607 329.875 7.67504 343.616 20.4328 351.127L178.664 444.148C191.435 451.646 207.23 451.782 220.11 444.476L379.805 353.989C392.685 346.696 400.698 333.078 400.82 318.275L402.27 134.78C402.392 119.976 394.597 106.236 381.839 98.7382V98.7109ZM395.207 178.224L363.278 341.298C360.703 354.453 351.307 365.235 338.617 369.584L181.376 423.469C168.686 427.818 154.653 425.064 144.539 416.258L19.2262 307.069C9.11215 298.263 4.47544 284.727 7.05139 271.573L38.9932 108.512C41.5691 95.3576 50.9646 84.575 63.6545 80.2265L220.896 26.341C233.586 21.9925 247.618 24.7461 257.732 33.5521L383.032 142.714C393.146 151.52 397.783 165.056 395.207 178.21V178.224Z" />
    <path d="M365.746 183.404L277.255 73.2201C270.111 64.3323 258.776 59.9293 247.51 61.6605L107.798 83.1848C96.532 84.916 87.0417 92.536 82.9066 103.155L31.6858 234.85C27.5507 245.469 29.4081 257.492 36.553 266.379L125.057 376.577C132.202 385.465 143.536 389.881 154.803 388.137L294.514 366.626C305.781 364.895 315.271 357.275 319.406 346.656L370.613 214.934C374.748 204.315 372.891 192.278 365.746 183.404ZM344.434 254.861L272.063 352.926C266.219 360.832 256.607 365.031 246.832 363.927L125.694 350.309C115.919 349.205 107.473 342.989 103.541 333.978L54.7745 222.281C50.8427 213.271 52.0087 202.843 57.852 194.936L130.223 96.8845C136.066 88.9782 145.678 84.7796 155.454 85.8838L276.591 99.5154C286.366 100.62 294.799 106.836 298.744 115.846L347.511 227.516C351.443 236.526 350.277 246.954 344.434 254.861Z" />
  </svg>
);

/**
 * Thinking scribble — single stroke that draws on then erases off;
 * path morphs between 4 loose tangles.
 */
export const ThinkingBlob = ({
  size = 22,
  color = "var(--v2-brand-vivid)",
  paused = false,
}: {
  size?: number;
  color?: string;
  paused?: boolean;
}) => {
  const scribbles = [
    "M20,30 C30,18 48,18 56,30 C62,40 48,50 38,50 C28,50 24,40 34,34 C46,28 64,38 70,52 C74,62 62,72 50,72 C36,72 24,62 26,48",
    "M18,42 C28,26 48,22 62,34 C74,44 70,62 56,68 C44,72 30,66 30,54 C30,44 44,40 54,46 C64,52 62,62 52,66",
    "M22,50 C28,34 50,28 60,40 C70,50 56,64 42,60 C30,56 28,42 40,36 C54,30 70,42 68,58 C66,72 48,76 34,70",
    "M18,36 C32,22 50,26 56,38 C62,50 46,58 36,54 C28,50 30,40 42,42 C58,44 68,54 68,66 C68,74 56,76 46,70",
  ];
  return (
    <span
      style={{
        display: "inline-flex",
        width: size,
        height: size,
        flexShrink: 0,
        position: "relative",
      }}
    >
      <svg
        viewBox="0 0 90 90"
        width={size}
        height={size}
        aria-hidden="true"
        style={{ overflow: "visible" }}
      >
        <path
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="140 140"
          style={{
            animation: paused
              ? "none"
              : "v2-scribble-draw 2.8s cubic-bezier(0.65, 0, 0.35, 1) infinite",
          }}
        >
          <animate
            attributeName="d"
            dur="4.8s"
            repeatCount="indefinite"
            values={[...scribbles, scribbles[0]].join(";")}
            calcMode="spline"
            keySplines={Array(scribbles.length)
              .fill("0.45 0 0.55 1")
              .join(";")}
          />
        </path>
      </svg>
    </span>
  );
};

/** Small dot separator */
export const Dot = () => (
  <span
    style={{
      display: "inline-block",
      width: 2,
      height: 2,
      borderRadius: 999,
      background: "var(--v2-ink-subtle)",
    }}
  />
);

/** Kbd pill */
export const Kbd = ({ children }: { children: React.ReactNode }) => (
  <span
    style={{
      fontFamily: "var(--v2-font-mono)",
      fontSize: 10,
      padding: "1px 5px",
      borderRadius: 4,
      background: "var(--v2-surface-2)",
      border: "1px solid var(--v2-line)",
      color: "var(--v2-ink-muted)",
    }}
  >
    {children}
  </span>
);

/** Source glyph — 1-letter monogram in a small square */
export const SourceGlyph = ({ label, letter }: { label: string; letter: string }) => (
  <span
    title={label}
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 14,
      height: 14,
      borderRadius: 3,
      background: "var(--v2-surface-3)",
      color: "var(--v2-ink-muted)",
      fontFamily: "var(--v2-font-mono)",
      fontSize: 9,
      fontWeight: 600,
      border: "1px solid var(--v2-line)",
    }}
  >
    {letter}
  </span>
);

/** Initials avatar */
export const Avatar = ({
  initials,
  size = 28,
}: {
  initials: string;
  size?: number;
}) => (
  <div
    style={{
      width: size,
      height: size,
      background: "var(--v2-ink)",
      color: "var(--v2-ink-inverse)",
      fontSize: size * 0.4,
      fontWeight: 600,
      borderRadius: 6,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--v2-font-sans)",
      letterSpacing: "-0.02em",
    }}
  >
    {initials}
  </div>
);

/** Pill button — outlined chip for suggestions and secondary actions.
 *  Uses the .v2-chip class so hover/active/focus states are CSS-driven.
 *  Pass `active` for the filled "selected" treatment used by template /
 *  filter / segmented-control style pickers. */
type ChipProps = {
  onClick?: () => void;
  icon?: React.ReactNode;
  block?: boolean;
  active?: boolean;
  children: React.ReactNode;
  title?: string;
};

export const Chip = ({ onClick, icon, block, active, children, title }: ChipProps) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className="v2-chip"
    data-active={active ? "true" : undefined}
    style={{
      whiteSpace: block ? "normal" : "nowrap",
    }}
  >
    {icon}
    {children}
  </button>
);

type BtnVariant =
  | "primary"
  | "outline"
  | "ghost"
  | "subtle"
  | "brand"
  | "danger";
type BtnSize = "xs" | "sm" | "md" | "lg";

type BtnProps = {
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  variant?: BtnVariant;
  size?: BtnSize;
  icon?: React.ReactNode;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  style?: React.CSSProperties;
  className?: string;
  children?: React.ReactNode;
  title?: string;
  "aria-label"?: string;
  "aria-expanded"?: boolean;
};

/**
 * Centralized button. Variants + sizes map to .v2-btn CSS classes so
 * hover/active/focus/disabled states all work via pseudo-classes (inline
 * styles can't express those). Primary is ink-forward per brand spec;
 * brand is the AI-tint CTA (brand-bg + brand text) for "Generate" etc.
 */
export const Btn = ({
  onClick,
  variant = "primary",
  size = "md",
  icon,
  disabled,
  type = "button",
  style,
  className,
  children,
  title,
  "aria-label": ariaLabel,
  "aria-expanded": ariaExpanded,
}: BtnProps) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    title={title}
    aria-label={ariaLabel}
    aria-expanded={ariaExpanded}
    data-variant={variant}
    data-size={size}
    className={className ? `v2-btn ${className}` : "v2-btn"}
    style={style}
  >
    {icon}
    {children}
  </button>
);

type IconBtnVariant = "ghost" | "primary";
type IconBtnSize = "xs" | "sm" | "md" | "lg";

type IconBtnProps = {
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  icon: React.ReactNode;
  size?: IconBtnSize;
  variant?: IconBtnVariant;
  disabled?: boolean;
  pressed?: boolean;
  type?: "button" | "submit" | "reset";
  title?: string;
  style?: React.CSSProperties;
  className?: string;
  "aria-label"?: string;
  "aria-expanded"?: boolean;
};

/**
 * Square icon-only button (kebabs, close, send). Default variant is ghost
 * (transparent → surface-2 on hover). The primary variant is filled ink
 * for send/composer-style CTAs. Use `pressed` for toggles; otherwise
 * aria-expanded also triggers the pressed visual via CSS.
 *
 * forwardRef so callers that need to measure/focus the button (anchored
 * popovers, click-outside checks) can attach a ref.
 */
export const IconBtn = React.forwardRef<HTMLButtonElement, IconBtnProps>(
  function IconBtn(
    {
      onClick,
      icon,
      size = "sm",
      variant = "ghost",
      disabled,
      pressed,
      type = "button",
      title,
      style,
      className,
      "aria-label": ariaLabel,
      "aria-expanded": ariaExpanded,
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        onClick={onClick}
        disabled={disabled}
        title={title}
        aria-label={ariaLabel ?? title}
        aria-expanded={ariaExpanded}
        data-size={size}
        data-variant={variant === "primary" ? "primary" : undefined}
        data-pressed={pressed ? "true" : undefined}
        className={className ? `v2-icon-btn ${className}` : "v2-icon-btn"}
        style={style}
      >
        {icon}
      </button>
    );
  },
);

type MenuItemProps = {
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  icon?: React.ReactNode;
  children: React.ReactNode;
  shortcut?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  role?: string;
};

/** Dropdown-menu item — standardises spacing + hover surface + danger tint. */
export const MenuItem = ({
  onClick,
  icon,
  children,
  shortcut,
  danger,
  disabled,
  role = "menuitem",
}: MenuItemProps) => (
  <button
    type="button"
    role={role}
    onClick={onClick}
    disabled={disabled}
    data-danger={danger ? "true" : undefined}
    className="v2-menu-item"
  >
    {icon && (
      <span
        style={{
          display: "inline-flex",
          color: danger ? "var(--v2-neg)" : "var(--v2-ink-muted)",
        }}
      >
        {icon}
      </span>
    )}
    <span style={{ flex: 1 }}>{children}</span>
    {shortcut}
  </button>
);
