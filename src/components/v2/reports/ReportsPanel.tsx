"use client";

import * as React from "react";
import { Plus, Trash2, FileDown, GripVertical, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

import { Page, PageBody, PageHeader } from "../layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { SLIDE_TYPES, type SlideType, type SlideDefinition } from "@/lib/report-types";

/* ──────────────── Types ──────────────── */

interface ReportTemplate {
  id: string;
  name: string;
  slides: SlideDefinition[];
  updatedAt: string;
}

interface ReportsPanelProps {
  orgId: string | null;
}

/* ──────────────── Helpers ──────────────── */

function newSlideId() {
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function defaultConfig(type: SlideType): SlideDefinition["config"] {
  switch (type) {
    case "title": return { subtitle: "" };
    case "scorecard-row": return { metrics: [] };
    case "channel-table": return { sourceType: "GOOGLE_ADS", metrics: [], compare: "MoM" };
    case "goals-grid": return {};
    case "bar-chart": return { manualMetricIds: [] };
    case "line-chart": return { manualMetricIds: [] };
    case "campaign-table": return { sourceType: "GOOGLE_ADS", limit: 10 };
    case "ai-insights": return {};
    default: return {};
  }
}

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/* ──────────────── Component ──────────────── */

export default function ReportsPanel({ orgId }: ReportsPanelProps) {
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
      const data = (await res.json()) as ReportTemplate[];
      setTemplates(Array.isArray(data) ? data : []);
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
      const defaultSlides: SlideDefinition[] = [
        { id: newSlideId(), type: "title", title: "Monthly Report", config: { subtitle: "" } },
        { id: newSlideId(), type: "scorecard-row", title: "Executive Summary", config: { metrics: [] } },
        { id: newSlideId(), type: "goals-grid", title: "Goal Progress", config: {} },
        { id: newSlideId(), type: "ai-insights", title: "Insights & Recommendations", config: {} },
      ];
      const res = await fetch("/api/reports/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createName.trim(), slides: defaultSlides }),
      });
      if (!res.ok) throw new Error();
      const created = (await res.json()) as ReportTemplate;
      setTemplates((prev) => [created, ...prev]);
      setCreateOpen(false);
      setCreateName("");
      setActiveTemplate(created);
      toast.success("Template created.");
    } catch {
      toast.error("Could not create template.");
    } finally {
      setCreating(false);
    }
  }

  async function deleteTemplate(id: string) {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    if (activeTemplate?.id === id) setActiveTemplate(null);
    try {
      await fetch(`/api/reports/templates/${id}`, { method: "DELETE" });
    } catch {
      toast.error("Could not delete template.");
      await load();
    }
  }

  if (activeTemplate) {
    return (
      <TemplateEditor
        template={activeTemplate}
        onBack={() => { setActiveTemplate(null); load(); }}
        onUpdate={(updated) => setActiveTemplate(updated)}
      />
    );
  }

  return (
    <Page className="meaning-v2">
      <PageHeader
        breadcrumb={["Reports"]}
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-3" />
            New template
          </Button>
        }
      />

      <PageBody contained="default" padding="default">
        <div className="mb-6">
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-foreground">
            Reports
          </h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground max-w-[580px]">
            Create report templates to generate consistent monthly presentations. Same structure every time, fresh data each month.
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg border border-border bg-muted/40" />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
            <p className="text-[13px] text-muted-foreground">No report templates yet.</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => setCreateOpen(true)}>
              <Plus className="size-3.5" />
              Create your first template
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
                    {(t.slides as SlideDefinition[]).length} slides · Updated {new Date(t.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-destructive opacity-0 group-hover:opacity-100"
                    onClick={(e) => { e.stopPropagation(); deleteTemplate(t.id); }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </PageBody>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <form onSubmit={(e) => { e.preventDefault(); createTemplate(); }}>
            <DialogHeader>
              <DialogTitle>New report template</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <Input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g. Monthly Client Report"
                autoFocus
              />
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!createName.trim() || creating}>
                {creating ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Page>
  );
}

/* ──────────────── Template Editor ──────────────── */

interface TemplateEditorProps {
  template: ReportTemplate;
  onBack: () => void;
  onUpdate: (t: ReportTemplate) => void;
}

function TemplateEditor({ template, onBack, onUpdate }: TemplateEditorProps) {
  const [slides, setSlides] = React.useState<SlideDefinition[]>(template.slides);
  const [saving, setSaving] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);
  const [addSlideOpen, setAddSlideOpen] = React.useState(false);
  const [genPeriod, setGenPeriod] = React.useState(getCurrentPeriod());
  const [genOpen, setGenOpen] = React.useState(false);

  const dirty = React.useRef(false);

  async function save(newSlides: SlideDefinition[]) {
    setSaving(true);
    try {
      const res = await fetch(`/api/reports/templates/${template.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slides: newSlides }),
      });
      if (!res.ok) throw new Error();
      const updated = (await res.json()) as ReportTemplate;
      onUpdate(updated);
      dirty.current = false;
    } catch {
      toast.error("Could not save template.");
    } finally {
      setSaving(false);
    }
  }

  function updateSlides(newSlides: SlideDefinition[]) {
    setSlides(newSlides);
    dirty.current = true;
    // Auto-save after short delay
    const timeout = setTimeout(() => save(newSlides), 800);
    return () => clearTimeout(timeout);
  }

  function addSlide(type: SlideType) {
    const meta = SLIDE_TYPES.find((s) => s.type === type);
    const newSlide: SlideDefinition = {
      id: newSlideId(),
      type,
      title: meta?.label ?? type,
      config: defaultConfig(type),
    };
    const newSlides = [...slides, newSlide];
    setSlides(newSlides);
    save(newSlides);
    setAddSlideOpen(false);
  }

  function removeSlide(id: string) {
    const newSlides = slides.filter((s) => s.id !== id);
    setSlides(newSlides);
    save(newSlides);
  }

  function moveSlide(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= slides.length) return;
    const newSlides = [...slides];
    [newSlides[index], newSlides[target]] = [newSlides[target], newSlides[index]];
    setSlides(newSlides);
    save(newSlides);
  }

  function updateSlideTitle(id: string, title: string) {
    const newSlides = slides.map((s) => s.id === id ? { ...s, title } : s);
    updateSlides(newSlides);
  }

  async function generatePptx() {
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
      a.download = `${template.name} — ${genPeriod}.pptx`;
      a.click();
      URL.revokeObjectURL(url);
      setGenOpen(false);
      toast.success("Report downloaded.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate report.");
    } finally {
      setGenerating(false);
    }
  }

  const slideTypeMeta = (type: string) => SLIDE_TYPES.find((s) => s.type === type);

  return (
    <Page className="meaning-v2">
      <PageHeader
        breadcrumb={["Reports", template.name]}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onBack}>
              <ChevronLeft className="size-3" />
              Back
            </Button>
            <Button size="sm" onClick={() => setGenOpen(true)}>
              <FileDown className="size-3" />
              Generate
            </Button>
          </div>
        }
      />

      <PageBody contained="default" padding="default">
        <div className="mb-6">
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-foreground">
            {template.name}
          </h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            {slides.length} slides · Drag to reorder, click to configure
          </p>
        </div>

        {/* Slide list */}
        <div className="space-y-2">
          {slides.map((slide, i) => {
            const meta = slideTypeMeta(slide.type);
            return (
              <div
                key={slide.id}
                className="group flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
              >
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    onClick={() => moveSlide(i, -1)}
                    disabled={i === 0}
                  >
                    <svg width="10" height="6" viewBox="0 0 10 6"><path d="M1 5l4-4 4 4" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg>
                  </button>
                  <button
                    type="button"
                    className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    onClick={() => moveSlide(i, 1)}
                    disabled={i === slides.length - 1}
                  >
                    <svg width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg>
                  </button>
                </div>

                <span className="text-[11px] font-medium text-muted-foreground tabular-nums w-5">
                  {i + 1}
                </span>

                <div className="flex-1 min-w-0">
                  <Input
                    value={slide.title}
                    onChange={(e) => updateSlideTitle(slide.id, e.target.value)}
                    className="h-7 border-0 bg-transparent p-0 text-[13px] font-medium shadow-none focus-visible:ring-0"
                  />
                  <div className="text-[11px] text-muted-foreground">
                    {meta?.description ?? slide.type}
                  </div>
                </div>

                <Badge variant="secondary" className="text-[10px] shrink-0">
                  {meta?.label ?? slide.type}
                </Badge>

                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-destructive opacity-0 group-hover:opacity-100"
                  onClick={() => removeSlide(slide.id)}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            );
          })}

          {/* Add slide */}
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-4 text-[12.5px] text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
            onClick={() => setAddSlideOpen(true)}
          >
            <Plus className="size-4" />
            Add slide
          </button>
        </div>

        {saving && (
          <p className="mt-3 text-[11px] text-muted-foreground">Saving...</p>
        )}
      </PageBody>

      {/* Add slide dialog */}
      <Dialog open={addSlideOpen} onOpenChange={setAddSlideOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Add a slide</DialogTitle>
          </DialogHeader>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {SLIDE_TYPES.map((st) => (
              <button
                key={st.type}
                type="button"
                className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-muted/30 hover:border-ring"
                onClick={() => addSlide(st.type)}
              >
                <span className="text-[12px] font-medium text-foreground">{st.label}</span>
                <span className="text-[10.5px] text-muted-foreground">{st.description}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Generate dialog */}
      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent className="sm:max-w-[380px]">
          <form onSubmit={(e) => { e.preventDefault(); generatePptx(); }}>
            <DialogHeader>
              <DialogTitle>Generate report</DialogTitle>
            </DialogHeader>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Period</label>
                <Input
                  type="month"
                  value={genPeriod}
                  onChange={(e) => setGenPeriod(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setGenOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={generating}>
                <FileDown className="size-3" />
                {generating ? "Generating..." : "Download .pptx"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
