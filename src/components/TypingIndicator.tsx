"use client";

import Image from "next/image";

export default function TypingIndicator() {
  return (
    <div className="flex w-full justify-center px-4 py-6">
      <div className="flex w-full max-w-3xl gap-4">
        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center">
          <Image
            src="/Hivory icon.svg"
            alt=""
            width={24}
            height={24}
            className="h-6 w-6 object-contain"
          />
        </div>
        <div className="flex items-center gap-1.5 pt-1">
          <span className="thinking-cursor" />
        </div>
      </div>
    </div>
  );
}
