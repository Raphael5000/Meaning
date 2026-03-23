"use client";

import { useEffect, useState, useRef } from "react";
import { Check, ChevronDown, Loader2, Plus, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface Org {
  id: string;
  name: string;
  imageUrl: string | null;
  ownerId: string;
  role: string;
}

interface AccountSelectorProps {
  activeOrgId: string | null;
  onSelect: (org: Org) => void;
  onOpenConnections: () => void;
}

export default function AccountSelector({
  activeOrgId,
  onSelect,
  onOpenConnections,
}: AccountSelectorProps) {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/organizations")
      .then((r) => r.json())
      .then((data) => {
        const list = data.organizations ?? [];
        setOrgs(list);
        // Auto-select if user has an active org or only one org
        if (list.length === 1 && !activeOrgId) {
          onSelect(list[0]);
        } else if (activeOrgId) {
          const active = list.find((o: Org) => o.id === activeOrgId);
          if (active) onSelect(active);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
        setNewName("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        const newOrg: Org = { ...data.organization, role: "admin" };
        setOrgs((prev) => [...prev, newOrg]);
        onSelect(newOrg);
        setOpen(false);
        setNewName("");
      }
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  }

  const selected = orgs.find((o) => o.id === activeOrgId);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </div>
    );
  }

  if (orgs.length === 0) {
    return (
      <button
        type="button"
        onClick={handleCreate}
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
      >
        <Plus className="h-4 w-4" />
        Create an account
      </button>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-[100px] border border-input bg-muted px-3 py-2 text-sm text-foreground shadow-sm cursor-pointer"
        )}
      >
        <div className="flex items-center gap-2 truncate">
          {selected?.imageUrl ? (
            <img src={selected.imageUrl} alt="" className="h-5 w-5 rounded-full object-cover" />
          ) : (
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {(selected?.name ?? "?")[0].toUpperCase()}
            </div>
          )}
          <span className="truncate">{selected?.name ?? "Select account"}</span>
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-lg border border-border bg-popover shadow-md">
          <div className="max-h-48 overflow-y-auto p-1">
            {orgs.map((org) => (
              <button
                key={org.id}
                type="button"
                onClick={() => {
                  onSelect(org);
                  setOpen(false);
                }}
                className="relative flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent"
              >
                {org.imageUrl ? (
                  <img src={org.imageUrl} alt="" className="h-5 w-5 rounded-full object-cover" />
                ) : (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                    {org.name[0].toUpperCase()}
                  </div>
                )}
                <span className="flex-1 truncate">{org.name}</span>
                {org.id === activeOrgId && <Check className="h-4 w-4 shrink-0" />}
              </button>
            ))}
          </div>

          <div className="border-t border-border p-1">
            {/* Settings */}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onOpenConnections();
              }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Settings className="h-4 w-4" />
              Connections
            </button>

            {/* Create new */}
            <div className="flex items-center gap-1 px-2 py-1">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="New account name..."
                className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <button
                type="button"
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
                className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
              >
                {creating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
