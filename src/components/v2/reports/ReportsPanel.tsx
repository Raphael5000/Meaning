"use client";

import * as React from "react";
import { Plus, Trash2, FileDown, ChevronLeft, Wand2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Page, PageBody, PageHeader } from "../layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { SlideDefinition, DataBinding } from "@/lib/report-types";

/* ──────────────── Types ──────────────── */

interface ReportTemplate {
  id: string;
  name: string;
  slides: SlideDefinition[];
  updatedAt: string;
}

function newSlideId() {
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/* ──────────────── Main ──────────────── */

export default function ReportsPanel({ orgId }: { orgId: string | null }) {
  const [templates, setTemplates] = React.useState<ReportTemplate[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeTemplate, setActiveTemplate] = React.useState<ReportTemplate | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createName, setCreateName] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/reports/templates");
      if (!res.ok) throw new Error();
      setTemplates((await res.json()) as ReportTemplate[]);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load, orgId]);

  async function createTemplate() {
    if (!createName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/reports/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createName.trim(), slides: [] }),
      });
      if (!res.ok) throw new Error();
      const created = (await res.json()) as ReportTemplate;
      setTemplates((prev) => [created, ...prev]);
      setCreateOpen(false);
      setCreateName("");
      setActiveTemplate(created);
    } catch {
      toast.error("Could not create template.");
    } finally {
      setCreating(false);
    }
  }

  async function deleteTemplate(id: string) {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    try { await fetch(`/api/reports/templates/${id}`, { method: "DELETE" }); }
    catch { toast.error("Could not delete."); await load(); }
  }

  if (activeTemplate) {
    return (
      <TemplateEditor
        template={activeTemplate}
        onBack={() => { setActiveTemplate(null); load(); }}
        onUpdate={(t) => setActiveTemplate(t)}
      />
    );
  }

  return (
    <Page className="meaning-v2">
      <PageHeader
        breadcrumb={["Reports"]}
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-3" /> New template
          </Button>
        }
      />
      <PageBody contained="default" padding="default">
        <div className="mb-6">
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-foreground">Reports</h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground max-w-[580px]">
            Build report templates by describing each slide. Generate consistent PDF reports every month with live data.
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-lg border border-border bg-muted/40" />)}
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
            <p className="text-[13px] text-muted-foreground">No report templates yet.</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => setCreateOpen(true)}>
              <Plus className="size-3.5" /> Create your first template
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map((t) => (
              <div
                key={t.id}
                className="group flex cursor-pointer items-center justify-between rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:bg-muted/30"
                onClick={() => setActiveTemplate(t)}
              >
                <div>
                  <div className="text-[13px] font-medium text-foreground">{t.name}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {t.slides.length} slide{t.slides.length !== 1 ? "s" : ""}
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive opacity-0 group-hover:opacity-100"
                  onClick={(e) => { e.stopPropagation(); deleteTemplate(t.id); }}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </PageBody>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <form onSubmit={(e) => { e.preventDefault(); createTemplate(); }}>
            <DialogHeader><DialogTitle>New report template</DialogTitle></DialogHeader>
            <div className="mt-4">
              <Input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="e.g. Monthly Client Report" autoFocus />
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!createName.trim() || creating}>{creating ? "Creating..." : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Page>
  );
}

/* ──────────────── Template Editor ──────────────── */

function TemplateEditor({ template, onBack, onUpdate }: {
  template: ReportTemplate;
  onBack: () => void;
  onUpdate: (t: ReportTemplate) => void;
}) {
  const [slides, setSlides] = React.useState<SlideDefinition[]>(template.slides);
  const [generating, setGenerating] = React.useState(false);
  const [prompt, setPrompt] = React.useState("");
  const [addingSlide, setAddingSlide] = React.useState(false);
  const [genOpen, setGenOpen] = React.useState(false);
  const [genPeriod, setGenPeriod] = React.useState(getCurrentPeriod());

  async function saveSlides(newSlides: SlideDefinition[]) {
    setSlides(newSlides);
    try {
      const res = await fetch(`/api/reports/templates/${template.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slides: newSlides }),
      });
      if (res.ok) onUpdate((await res.json()) as ReportTemplate);
    } catch { toast.error("Could not save."); }
  }

  function removeSlide(id: string) { saveSlides(slides.filter((s) => s.id !== id)); }

  function moveSlide(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= slides.length) return;
    const arr = [...slides];
    [arr[index], arr[target]] = [arr[target], arr[index]];
    saveSlides(arr);
  }

  async function addSlide() {
    if (!prompt.trim()) return;
    setAddingSlide(true);
    try {
      const res = await fetch("/api/reports/generate-slide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || "Failed");
      }
      const data = (await res.json()) as { title: string; htmlTemplate: string; dataBindings: DataBinding[] };
      const newSlide: SlideDefinition = {
        id: newSlideId(),
        title: data.title,
        htmlTemplate: data.htmlTemplate,
        dataBindings: data.dataBindings,
      };
      await saveSlides([...slides, newSlide]);
      setPrompt("");
      toast.success("Slide added.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate slide.");
    } finally {
      setAddingSlide(false);
    }
  }

  async function generatePdf() {
    setGenerating(true);
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: template.id, period: genPeriod }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || "Generation failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${template.name} - ${genPeriod}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setGenOpen(false);
      toast.success("Report downloaded.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Page className="meaning-v2">
      <PageHeader
        breadcrumb={["Reports", template.name]}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onBack}>
              <ChevronLeft className="size-3" /> Back
            </Button>
            <Button size="sm" onClick={() => setGenOpen(true)} disabled={slides.length === 0}>
              <FileDown className="size-3" /> Generate PDF
            </Button>
          </div>
        }
      />
      <PageBody contained="default" padding="default">
        <div className="mb-6">
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-foreground">{template.name}</h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            {slides.length} slide{slides.length !== 1 ? "s" : ""}. Describe each slide and AI will design it.
          </p>
        </div>

        {/* Slide list */}
        <div className="space-y-3">
          {slides.map((slide, i) => (
            <div key={slide.id} className="group rounded-lg border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex flex-col gap-0.5">
                  <button type="button" className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    onClick={() => moveSlide(i, -1)} disabled={i === 0}>
                    <svg width="10" height="6" viewBox="0 0 10 6"><path d="M1 5l4-4 4 4" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg>
                  </button>
                  <button type="button" className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    onClick={() => moveSlide(i, 1)} disabled={i === slides.length - 1}>
                    <svg width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg>
                  </button>
                </div>
                <span className="text-[11px] font-medium text-muted-foreground tabular-nums w-5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-foreground truncate">{slide.title}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {slide.dataBindings?.length ?? 0} data binding{(slide.dataBindings?.length ?? 0) !== 1 ? "s" : ""}
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive opacity-0 group-hover:opacity-100"
                  onClick={() => removeSlide(slide.id)}>
                  <Trash2 className="size-3" />
                </Button>
              </div>

              {/* Preview */}
              {slide.htmlTemplate && (
                <div className="border-t border-border px-2 py-2">
                  <div className="pointer-events-none overflow-hidden rounded" style={{ width: 320, height: 180 }}>
                    <iframe
                      srcDoc={`<!DOCTYPE html><html><head><style>*{box-sizing:border-box;margin:0;padding:0;}body{width:1280px;height:720px;transform:scale(0.25);transform-origin:top left;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;padding:48px 56px;}.text-muted{color:#888}.text-green{color:#00A352}.text-red{color:#EF4444}.text-amber{color:#F59E0B}.bg-surface{background:#141414}.card{background:#141414;border:1px solid #2A2A2A;border-radius:8px;padding:20px;}.progress-bar{height:6px;border-radius:999px;background:#2A2A2A;overflow:hidden}.progress-fill{height:100%;border-radius:999px}.tabular{font-variant-numeric:tabular-nums}table{border-collapse:collapse;width:100%}th,td{padding:10px 16px;text-align:left}th{font-size:11px;font-weight:500;color:#888;text-transform:uppercase;letter-spacing:.05em}td{font-size:13px;border-top:1px solid #2A2A2A}</style></head><body>${slide.htmlTemplate.replace(/\{\{[^}]+\}\}/g, '<span style="background:rgba(0,163,82,0.15);border-radius:3px;padding:1px 6px;font-size:inherit;color:#00A352;">···</span>')}</body></html>`}
                      style={{ width: 1280, height: 720, border: "none", pointerEvents: "none" }}
                      tabIndex={-1}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add slide */}
        <div className="mt-4 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Wand2 className="size-4 text-muted-foreground" />
            <h3 className="text-[13px] font-medium text-foreground">Add a slide</h3>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) addSlide(); }}
            placeholder="Describe the slide you want, e.g.&#10;&#10;• A title slide with the company name and report period&#10;• Google Ads summary — impressions, clicks, CTR, CPC, cost. Compare last month to this month with % change.&#10;• Goal progress showing all KPI targets with progress bars&#10;• AI insights and recommendations for the month"
            className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-[13px] shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            disabled={addingSlide}
          />
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">⌘ Enter to generate</span>
            <Button size="sm" onClick={addSlide} disabled={!prompt.trim() || addingSlide}>
              {addingSlide ? (
                <><Loader2 className="size-3 animate-spin" /> Designing slide...</>
              ) : (
                <><Wand2 className="size-3" /> Generate slide</>
              )}
            </Button>
          </div>
        </div>
      </PageBody>

      {/* Generate PDF dialog */}
      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent className="sm:max-w-[380px]">
          <form onSubmit={(e) => { e.preventDefault(); generatePdf(); }}>
            <DialogHeader><DialogTitle>Generate report</DialogTitle></DialogHeader>
            <div className="mt-4">
              <Label className="text-[11px]">Period</Label>
              <Input type="month" value={genPeriod} onChange={(e) => setGenPeriod(e.target.value)} className="mt-1" />
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setGenOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={generating}>
                <FileDown className="size-3" />
                {generating ? "Generating..." : "Download PDF"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
