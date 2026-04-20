import Image from "next/image";

const connectors: { name: string; src?: string; comingSoon?: boolean }[] = [
  { name: "Google Analytics", src: "/Google Analytics.svg" },
  { name: "Google Ads", src: "/Google Ads.svg" },
  { name: "LinkedIn", src: "/Linkedin.svg" },
  { name: "Microsoft Ads", src: "/Microsoft Ads.svg" },
  { name: "Mailchimp", src: "/Mailchimp.svg" },
  { name: "Search Console", src: "/Search Console.svg" },
  { name: "Meta", src: "/Meta.svg", comingSoon: true },
];

export function LogoWall({
  title = "Connect everything you already use",
}: {
  title?: string;
}) {
  return (
    <div className="text-center">
      <p className="mono-label mb-8">{title}</p>
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-10 gap-y-6">
        {connectors.map((c) => (
          <div
            key={c.name}
            className="flex items-center gap-2 text-[color:var(--m-text-secondary)]"
          >
            {c.src ? (
              <Image
                src={c.src}
                alt={c.name}
                width={28}
                height={28}
                className="h-7 w-7 object-contain"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold bg-[color:var(--brand-soft)] text-[color:var(--brand)]">
                {c.name[0]}
              </div>
            )}
            <span className="text-sm font-medium">{c.name}</span>
            {c.comingSoon && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{
                  background: "var(--m-surface-elevated)",
                  color: "var(--m-text-muted)",
                  border: "1px solid var(--m-hairline)",
                }}
              >
                Soon
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
