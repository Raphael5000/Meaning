"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Image from "next/image";
import { Mark, ThinkingBlob } from "./primitives";

// Platform icon mapping for inline rendering in markdown tables
const PLATFORM_ICONS: Record<string, { src: string; label: string }> = {
  "google": { src: "/Google Analytics.svg", label: "Google" },
  "google / organic": { src: "/Google Analytics.svg", label: "Google" },
  "google / cpc": { src: "/Google Ads.svg", label: "Google Ads" },
  "google ads": { src: "/Google Ads.svg", label: "Google Ads" },
  "paid search": { src: "/Google Ads.svg", label: "Paid Search" },
  "bing": { src: "/Microsoft Ads.svg", label: "Bing" },
  "microsoft ads": { src: "/Microsoft Ads.svg", label: "Microsoft Ads" },
  "microsoft": { src: "/Microsoft Ads.svg", label: "Microsoft" },
  "linkedin": { src: "/Linkedin.svg", label: "LinkedIn" },
  "linkedin.com": { src: "/Linkedin.svg", label: "LinkedIn" },
  "mailchimp": { src: "/Mailchimp.svg", label: "Mailchimp" },
  "organic search": { src: "/Search Console.svg", label: "Organic Search" },
  "facebook": { src: "/Meta.svg", label: "Facebook" },
  "facebook.com": { src: "/Meta.svg", label: "Facebook" },
  "instagram": { src: "/Meta.svg", label: "Instagram" },
  "instagram.com": { src: "/Meta.svg", label: "Instagram" },
  "email": { src: "/Mailchimp.svg", label: "Email" },
  "ahrefs": { src: "/Ahrefs.svg", label: "Ahrefs" },
};

function matchIcon(text: string): { src: string; label: string } | null {
  const lower = text.toLowerCase().trim();
  if (PLATFORM_ICONS[lower]) return PLATFORM_ICONS[lower];
  for (const [key, icon] of Object.entries(PLATFORM_ICONS)) {
    if (lower === key || (lower.length > 3 && key.includes(lower))) return icon;
  }
  return null;
}

// Custom td that shows platform icons for known source/channel values
function SmartTd(props: React.TdHTMLAttributes<HTMLTableCellElement> & { children?: React.ReactNode }) {
  const { children, ...rest } = props;
  const text = typeof children === "string" ? children :
    Array.isArray(children) ? children.filter((c) => typeof c === "string").join("") : "";
  const icon = text ? matchIcon(text) : null;

  if (icon) {
    return (
      <td {...rest}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Image src={icon.src} alt={icon.label} width={14} height={14} style={{ width: 14, height: 14, objectFit: "contain", flexShrink: 0 }} />
          {children}
        </span>
      </td>
    );
  }
  return <td {...rest}>{children}</td>;
}

export function Markdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{ td: SmartTd }}
    >
      {text}
    </ReactMarkdown>
  );
}

export function UserMsg({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[780px] py-3.5">
      <div className="flex justify-end">
        <div className="max-w-[72%] rounded-xl border border-v2-line bg-v2-surface-2 px-3.5 py-2.5 text-[13.5px] leading-[1.55] text-v2-ink">
          {children}
        </div>
      </div>
    </div>
  );
}

interface AssistantMsgProps {
  children: React.ReactNode;
  thinking?: boolean;
}

export function AssistantMsg({ children, thinking }: AssistantMsgProps) {
  return (
    <div className="relative mx-auto w-full max-w-[780px] py-3.5">
      {/* Icon lives outside the bubble (to its left), so the bubble fills the
         full 780px column and visually matches the composer's width.        */}
      <div
        className="absolute top-5 hidden md:block"
        style={{ right: "calc(100% + 8px)" }}
      >
        {thinking ? <ThinkingBlob size={20} /> : <Mark size={20} />}
      </div>
      <div
        className="rounded-[14px] border border-v2-line bg-v2-surface p-4"
        style={{ borderTopLeftRadius: 4 }}
      >
        {children}
      </div>
    </div>
  );
}
