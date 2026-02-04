"use client";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

export default function ChatMessage({ role, content }: ChatMessageProps) {
  return (
    <div className="flex w-full justify-center px-4 py-6">
      <div className="flex w-full max-w-3xl gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {role === "assistant" ? (
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ background: "var(--accent)" }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 20V10" />
                <path d="M12 20V4" />
                <path d="M6 20v-6" />
              </svg>
            </div>
          ) : (
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium"
              style={{
                background: "#5436DA",
                color: "white",
              }}
            >
              U
            </div>
          )}
        </div>

        {/* Message content */}
        <div className="min-w-0 flex-1">
          <div
            className="mb-1 text-sm font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            {role === "assistant" ? "Meaning" : "You"}
          </div>
          <div
            className="message-content text-sm leading-relaxed"
            style={{ color: "var(--text-primary)" }}
            dangerouslySetInnerHTML={{ __html: formatContent(content) }}
          />
        </div>
      </div>
    </div>
  );
}

function formatContent(text: string): string {
  // Basic markdown-like formatting
  let html = escapeHtml(text);

  // Code blocks (```...```)
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    '<pre><code class="language-$1">$2</code></pre>'
  );

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Headers
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Tables
  html = formatTables(html);

  // Lists
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>");

  // Numbered lists
  html = html.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");

  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, "<blockquote>$1</blockquote>");

  // Paragraphs (double newlines)
  html = html.replace(/\n\n/g, "</p><p>");
  html = `<p>${html}</p>`;

  // Single newlines within paragraphs
  html = html.replace(/\n/g, "<br>");

  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, "");
  html = html.replace(/<p>(<h[1-3]>)/g, "$1");
  html = html.replace(/(<\/h[1-3]>)<\/p>/g, "$1");
  html = html.replace(/<p>(<ul>)/g, "$1");
  html = html.replace(/(<\/ul>)<\/p>/g, "$1");
  html = html.replace(/<p>(<pre>)/g, "$1");
  html = html.replace(/(<\/pre>)<\/p>/g, "$1");
  html = html.replace(/<p>(<table>)/g, "$1");
  html = html.replace(/(<\/table>)<\/p>/g, "$1");
  html = html.replace(/<p>(<blockquote>)/g, "$1");
  html = html.replace(/(<\/blockquote>)<\/p>/g, "$1");

  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatTables(html: string): string {
  // Match markdown tables
  const tableRegex = /(\|.+\|)\n(\|[-| :]+\|)\n((?:\|.+\|\n?)+)/g;

  return html.replace(tableRegex, (_, headerRow: string, _separator: string, bodyRows: string) => {
    const headers = headerRow
      .split("|")
      .filter((c: string) => c.trim())
      .map((c: string) => `<th>${c.trim()}</th>`)
      .join("");

    const rows = bodyRows
      .trim()
      .split("\n")
      .map((row: string) => {
        const cells = row
          .split("|")
          .filter((c: string) => c.trim())
          .map((c: string) => `<td>${c.trim()}</td>`)
          .join("");
        return `<tr>${cells}</tr>`;
      })
      .join("");

    return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
  });
}
