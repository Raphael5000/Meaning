"use client";

import { useState, useEffect } from "react";
import { Loader2, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AddWidgetDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (prompt: string) => Promise<void>;
  initialPrompt?: string;
}

export default function AddWidgetDialog({ open, onClose, onSubmit, initialPrompt }: AddWidgetDialogProps) {
  const [prompt, setPrompt] = useState(initialPrompt || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync prompt when initialPrompt changes (edit mode)
  useEffect(() => {
    if (open) setPrompt(initialPrompt || "");
  }, [open, initialPrompt]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      await onSubmit(prompt.trim());
      setPrompt("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try rephrasing your request.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />

      {/* Dialog */}
      <div
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border p-6 shadow-2xl"
        style={{ background: "var(--bg-primary)", borderColor: "var(--border-color)" }}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" style={{ color: "var(--accent)" }} />
            <h3 className="text-sm font-semibold text-foreground">{initialPrompt ? "Edit Widget" : "Add Widget"}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-4 text-xs text-muted-foreground">
          Describe what you want to see. For example: &quot;Bar chart of top 10 pages by sessions&quot; or &quot;Total users this month as a scorecard&quot;
        </p>

        {error && (
          <div
            className="mb-3 rounded-lg px-3 py-2 text-xs"
            style={{ background: "rgba(239, 68, 68, 0.08)", color: "var(--error, #ef4444)" }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <textarea
            autoFocus
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="What would you like to see?"
            rows={3}
            className="w-full resize-none rounded-lg border bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1"
            style={{ borderColor: "var(--border-color)", "--tw-ring-color": "var(--accent)" } as React.CSSProperties}
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={loading} type="button">
              Cancel
            </Button>
            <Button
              size="sm"
              type="submit"
              disabled={!prompt.trim() || loading}
              className="h-8 text-xs"
              style={{ background: "var(--accent)", color: "white" }}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-1.5 h-3 w-3" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
