import { DocsNav } from "./DocsNav";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="marketing min-h-screen" style={{ background: "var(--m-bg)" }}>
      <DocsNav />
      {children}
    </div>
  );
}
