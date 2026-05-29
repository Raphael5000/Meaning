"use client";

import * as React from "react";
import {
  Plus, Trash2, FileDown, ChevronLeft, Upload, Wand2,
  GripVertical, Image as ImageIcon, Type,
} from "lucide-react";
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

import { STARTER_SLIDES, type SlideDefinition, type DataBinding } from "@/lib/report-types";

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

function newSlideId() {
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/* ──────────────── Main Component ──────────────── */

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
    if (activeTemplate?.id === id) setActiveTemplate(null);
    try {
      await fetch(`/api/reports/templates/${id}`, { method: "DELETE" });
    } catch {
      toast.error("Could not delete.");
      await load();
    }
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
            <Plus className="size-3" />
            New template
          </Button>
        }
      />
      <PageBody contained="default" padding="default">
        <div className="mb-6">
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-foreground">Reports</h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground max-w-[580px]">
            Build report templates from scratch or by uploading reference screenshots. Generate consistent PDF reports every month.
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
                    {(t.slides as SlideDefinition[]).length} slides
                  </div>
                </div>
                <Button
                  size="sm" variant="ghost"
                  className="h-7 w-7 p-0 text-destructive opacity-0 group-hover:opacity-100"
                  onClick={(e) => { e.stopPropagation(); deleteTemplate(t.id); }}
                >
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

function TemplateEditor({ template, onBack, onUpdate }: {
  template: ReportTemplate;
  onBack: () => void;
  onUpdate: (t: ReportTemplate) => void;
}) {
  const [slides, setSlides] = React.useState<SlideDefinition[]>(template.slides);
  const [generating, setGenerating] = React.useState(false);
  const [addMode, setAddMode] = React.useState<null | "image" | "prompt" | "starter">(null);
  const [genPrompt, setGenPrompt] = React.useState("");
  const [genImage, setGenImage] = React.useState<string | null>(null);
  const [genLoading, setGenLoading] = React.useState(false);
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
      if (res.ok) {
        const updated = (await res.json()) as ReportTemplate;
        onUpdate(updated);
      }
    } catch {
      toast.error("Could not save.");
    }
  }

  function removeSlide(id: string) {
    saveSlides(slides.filter((s) => s.id !== id));
  }

  function moveSlide(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= slides.length) return;
    const arr = [...slides];
    [arr[index], arr[target]] = [arr[target], arr[index]];
    saveSlides(arr);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setGenImage(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function generateSlide() {
    setGenLoading(true);
    try {
      const res = await fetch("/api/reports/generate-slide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referenceImage: genImage || undefined,
          prompt: genPrompt || undefined,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || "Failed to generate slide");
      }
      const data = (await res.json()) as {
        title: string;
        htmlTemplate: string;
        dataBindings: DataBinding[];
      };

      const newSlide: SlideDefinition = {
        id: newSlideId(),
        title: data.title,
        htmlTemplate: data.htmlTemplate,
        dataBindings: data.dataBindings,
        referenceImage: genImage || undefined,
      };

      await saveSlides([...slides, newSlide]);
      setAddMode(null);
      setGenPrompt("");
      setGenImage(null);
      toast.success("Slide added.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate slide.");
    } finally {
      setGenLoading(false);
    }
  }

  async function addStarterSlide(prompt: string, label: string) {
    setGenLoading(true);
    try {
      const res = await fetch("/api/reports/generate-slide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as {
        title: string;
        htmlTemplate: string;
        dataBindings: DataBinding[];
      };
      const newSlide: SlideDefinition = {
        id: newSlideId(),
        title: data.title || label,
        htmlTemplate: data.htmlTemplate,
        dataBindings: data.dataBindings,
      };
      await saveSlides([...slides, newSlide]);
      setAddMode(null);
      toast.success("Slide added.");
    } catch {
      toast.error("Could not generate slide.");
    } finally {
      setGenLoading(false);
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
      toast.error(err instanceof Error ? err.message : "Could not generate report.");
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
            {slides.length} slide{slides.length !== 1 ? "s" : ""}. Add slides from a reference image, a description, or starter templates.
          </p>
        </div>

        {/* Slide list */}
        <div className="space-y-3">
          {slides.map((slide, i) => (
            <div key={slide.id} className="group rounded-lg border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex flex-col gap-0.5">
                  <button type="button" className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30" onClick={() => moveSlide(i, -1)} disabled={i === 0}>
                    <svg width="10" height="6" viewBox="0 0 10 6"><path d="M1 5l4-4 4 4" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg>
                  </button>
                  <button type="button" className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30" onClick={() => moveSlide(i, 1)} disabled={i === slides.length - 1}>
                    <svg width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg>
                  </button>
                </div>
                <span className="text-[11px] font-medium text-muted-foreground tabular-nums w-5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-foreground truncate">{slide.title}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {slide.dataBindings?.length ?? 0} data bindings
                    {slide.referenceImage && " · From reference image"}
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive opacity-0 group-hover:opacity-100" onClick={() => removeSlide(slide.id)}>
                  <Trash2 className="size-3" />
                </Button>
              </div>

              {/* Mini preview */}
              {slide.htmlTemplate && (
                <div className="border-t border-border bg-[#0A0A0A] px-2 py-2">
                  <div
                    className="pointer-events-none origin-top-left overflow-hidden rounded"
                    style={{ width: 256, height: 144, transform: "scale(1)", position: "relative" }}
                  >
                    <iframe
                      srcDoc={`<!DOCTYPE html><html><head><style>*{box-sizing:border-box;margin:0;padding:0;}body{width:1280px;height:720px;transform:scale(0.2);transform-origin:top left;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;padding:48px 56px;}.text-muted{color:#888}.text-green{color:#00A352}.text-red{color:#EF4444}.text-amber{color:#F59E0B}.bg-surface{background:#141414}.card{background:#141414;border:1px solid #2A2A2A;border-radius:8px;padding:20px;}.progress-bar{height:6px;border-radius:999px;background:#2A2A2A;overflow:hidden}.progress-fill{height:100%;border-radius:999px}.tabular{font-variant-numeric:tabular-nums}table{border-collapse:collapse;width:100%}th,td{padding:10px 16px;text-align:left}th{font-size:11px;font-weight:500;color:#888;text-transform:uppercase;letter-spacing:.05em}td{font-size:13px;border-top:1px solid #2A2A2A}</style></head><body>${slide.htmlTemplate.replace(/\{\{[^}]+\}\}/g, '<span style="background:#2A2A2A;border-radius:3px;padding:0 4px;font-size:inherit;">···</span>')}</body></html>`}
                      style={{ width: 1280, height: 720, border: "none", pointerEvents: "none" }}
                      tabIndex={-1}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add slide controls */}
        {addMode === null ? (
          <div className="mt-4 grid grid-cols-3 gap-2">
            <button
              type="button"
              className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-6 text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
              onClick={() => setAddMode("image")}
            >
              <Upload className="size-5" />
              <span className="text-[12px] font-medium">From screenshot</span>
              <span className="text-[10px] text-muted-foreground">Upload a reference image</span>
            </button>
            <button
              type="button"
              className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-6 text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
              onClick={() => setAddMode("prompt")}
            >
              <Wand2 className="size-5" />
              <span className="text-[12px] font-medium">From description</span>
              <span className="text-[10px] text-muted-foreground">Describe what you want</span>
            </button>
            <button
              type="button"
              className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-6 text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
              onClick={() => setAddMode("starter")}
            >
              <Type className="size-5" />
              <span className="text-[12px] font-medium">Starter template</span>
              <span className="text-[10px] text-muted-foreground">Pick a pre-built layout</span>
            </button>
          </div>
        ) : addMode === "image" ? (
          <div className="mt-4 rounded-lg border border-border bg-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-medium">Add slide from screenshot</h3>
              <Button size="sm" variant="ghost" onClick={() => { setAddMode(null); setGenImage(null); setGenPrompt(""); }}>Cancel</Button>
            </div>
            {genImage ? (
              <div className="rounded-lg border border-border overflow-hidden">
                <img src={genImage} alt="Reference" className="w-full max-h-[200px] object-contain bg-black" />
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-border py-8 transition-colors hover:border-ring">
                <Upload className="size-6 text-muted-foreground" />
                <span className="text-[12px] text-muted-foreground">Click to upload or drag & drop</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            )}
            <div>
              <Label className="text-[11px]">Additional instructions (optional)</Label>
              <Input
                value={genPrompt}
                onChange={(e) => setGenPrompt(e.target.value)}
                placeholder="e.g. Use our actual Google Ads data, show cost in ZAR"
                className="mt-1"
              />
            </div>
            <Button onClick={generateSlide} disabled={!genImage || genLoading} className="w-full">
              {genLoading ? "Generating slide..." : "Generate slide from image"}
            </Button>
          </div>
        ) : addMode === "prompt" ? (
          <div className="mt-4 rounded-lg border border-border bg-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-medium">Add slide from description</h3>
              <Button size="sm" variant="ghost" onClick={() => { setAddMode(null); setGenPrompt(""); }}>Cancel</Button>
            </div>
            <div>
              <Label className="text-[11px]">Describe the slide you want</Label>
              <textarea
                value={genPrompt}
                onChange={(e) => setGenPrompt(e.target.value)}
                placeholder="e.g. A Google Ads performance summary showing impressions, clicks, CTR, CPC, and cost. Compare last month to this month with percentage changes. Include a campaign breakdown table below."
                className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-[13px] shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <Button onClick={generateSlide} disabled={!genPrompt.trim() || genLoading} className="w-full">
              {genLoading ? "Generating slide..." : "Generate slide"}
            </Button>
          </div>
        ) : addMode === "starter" ? (
          <div className="mt-4 rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-medium">Pick a starter template</h3>
              <Button size="sm" variant="ghost" onClick={() => setAddMode(null)}>Cancel</Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {STARTER_SLIDES.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  disabled={genLoading}
                  className="flex flex-col gap-1 rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted/30 hover:border-ring disabled:opacity-50"
                  onClick={() => addStarterSlide(s.prompt, s.label)}
                >
                  <span className="text-[12px] font-medium text-foreground">{s.label}</span>
                  <span className="text-[10.5px] text-muted-foreground">{s.description}</span>
                </button>
              ))}
            </div>
            {genLoading && <p className="text-[11px] text-muted-foreground text-center">Generating slide...</p>}
          </div>
        ) : null}
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
