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

type ChipProps = {
  onClick?: () => void;
  icon?: React.ReactNode;
  block?: boolean;
  children: React.ReactNode;
};

/** Pill button — outlined chip for suggestions and secondary actions */
export const Chip = ({ onClick, icon, block, children }: ChipProps) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "7px 14px",
      borderRadius: 999,
      background: "transparent",
      color: "var(--v2-ink)",
      border: "1px solid var(--v2-line-strong)",
      fontSize: 13,
      cursor: "pointer",
      transition: "all 150ms var(--v2-ease)",
      whiteSpace: block ? "normal" : "nowrap",
      textAlign: "left",
      maxWidth: "100%",
      lineHeight: 1.4,
      fontFamily: "var(--v2-font-sans)",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = "var(--v2-surface-2)";
      e.currentTarget.style.borderColor = "var(--v2-ink)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = "transparent";
      e.currentTarget.style.borderColor = "var(--v2-line-strong)";
    }}
  >
    {icon}
    {children}
  </button>
);

type BtnVariant = "primary" | "outline" | "ghost" | "subtle";
type BtnSize = "sm" | "md" | "icon";

type BtnProps = {
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  variant?: BtnVariant;
  size?: BtnSize;
  icon?: React.ReactNode;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  style?: React.CSSProperties;
  children?: React.ReactNode;
  title?: string;
  "aria-label"?: string;
};

/** Ink-forward button — primary uses neutral ink fill, not brand green */
export const Btn = ({
  onClick,
  variant = "primary",
  size = "md",
  icon,
  disabled,
  type = "button",
  style,
  children,
  title,
  "aria-label": ariaLabel,
}: BtnProps) => {
  const pad = size === "sm" ? "6px 12px" : size === "icon" ? "7px" : "9px 16px";
  const fs = size === "sm" ? 12.5 : 13.5;
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: pad,
    fontSize: fs,
    fontWeight: 500,
    letterSpacing: "-0.005em",
    borderRadius: size === "icon" ? 6 : 8,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    transition: "all 120ms var(--v2-ease)",
    border: "1px solid transparent",
    fontFamily: "var(--v2-font-sans)",
    ...style,
  };
  const variants: Record<BtnVariant, React.CSSProperties> = {
    primary: {
      background: "var(--v2-ink)",
      color: "var(--v2-ink-inverse)",
      borderColor: "var(--v2-ink)",
      fontWeight: 600,
    },
    outline: {
      background: "transparent",
      color: "var(--v2-ink)",
      borderColor: "var(--v2-line-strong)",
    },
    ghost: {
      background: "transparent",
      color: "var(--v2-ink)",
      borderColor: "transparent",
    },
    subtle: {
      background: "var(--v2-surface-2)",
      color: "var(--v2-ink)",
      borderColor: "var(--v2-line)",
    },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      style={{ ...base, ...variants[variant] }}
    >
      {icon}
      {children}
    </button>
  );
};
