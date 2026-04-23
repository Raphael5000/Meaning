"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Mark, ThinkingBlob } from "./primitives";

export function Markdown({ text }: { text: string }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>;
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
