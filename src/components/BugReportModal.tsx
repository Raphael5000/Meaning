"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface BugReportModalProps {
  open: boolean;
  onClose: () => void;
}

export default function BugReportModal({ open, onClose }: BugReportModalProps) {
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function resetForm() {
    setSubject("");
    setDescription("");
    setError(null);
    setSuccess(false);
  }

  function handleClose() {
    if (!sending) {
      resetForm();
      onClose();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSending(true);

    try {
      const res = await fetch("/api/bug-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          description: description.trim(),
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to submit bug report");
      }

      setSuccess(true);
      setTimeout(() => {
        resetForm();
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="flex max-h-[80vh] flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Submit a Bug Report</DialogTitle>
          <DialogDescription>
            Found something that isn&apos;t working? Let us know and we&apos;ll look into it.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {success ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div
                className="mb-3 flex h-10 w-10 items-center justify-center rounded-full"
                style={{ background: "var(--accent)" }}
              >
                <svg
                  className="h-5 w-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-medium text-foreground">Bug report submitted</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Thanks for helping us improve. We&apos;ll look into this.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-muted px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="bug-subject">Subject</Label>
                <Input
                  id="bug-subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary of the issue"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bug-description">Description</Label>
                <Textarea
                  id="bug-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What happened? What did you expect to happen? Include any steps to reproduce the issue."
                  rows={5}
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="submit"
                  disabled={sending || !subject.trim() || !description.trim()}
                >
                  {sending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit report"
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={handleClose} disabled={sending}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
