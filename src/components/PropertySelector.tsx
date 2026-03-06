"use client";

import { useEffect, useState, useRef } from "react";
import { BarChart3, Check, ChevronDown, Loader2, Search, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Property {
  propertyId: string;
  displayName: string;
  account: string;
}

interface PropertySelectorProps {
  selectedPropertyId: string | null;
  onSelect: (propertyId: string, displayName: string) => void;
  disabled?: boolean;
}

export default function PropertySelector({
  selectedPropertyId,
  onSelect,
  disabled,
}: PropertySelectorProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchProperties() {
      try {
        const res = await fetch("/api/analytics/properties");
        if (!res.ok) {
          throw new Error("Failed to load properties");
        }
        const data = await res.json();
        setProperties(data.properties || []);

        // Auto-select if only one property
        if (data.properties?.length === 1 && !selectedPropertyId) {
          onSelect(data.properties[0].propertyId, data.properties[0].displayName);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }

    fetchProperties();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open) {
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [open]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading properties...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg px-3 py-2 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="rounded-lg px-3 py-2 text-sm text-muted-foreground">
        No GA4 properties found. Make sure your Google account has access to a GA4 property.
      </div>
    );
  }

  const selectedProp = properties.find((p) => p.propertyId === selectedPropertyId);

  const filtered = search
    ? properties.filter(
        (p) =>
          p.displayName.toLowerCase().includes(search.toLowerCase()) ||
          p.account.toLowerCase().includes(search.toLowerCase()) ||
          p.propertyId.includes(search)
      )
    : properties;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          if (!disabled) setOpen((o) => !o);
        }}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-[100px] border border-input bg-muted px-3 py-2 text-sm text-foreground shadow-sm",
          disabled ? "cursor-default opacity-70" : "cursor-pointer"
        )}
      >
        <div className="flex items-center gap-2 truncate">
          {disabled ? (
            <Lock className="h-3.5 w-3.5 shrink-0 opacity-50" />
          ) : (
            <BarChart3 className="h-4 w-4 shrink-0" />
          )}
          <span className="truncate">
            {selectedProp ? selectedProp.displayName : "Select a property"}
          </span>
        </div>
        {!disabled && <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />}
      </button>

      {open && !disabled && (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-lg border border-border bg-popover shadow-md"
        >
          {/* Search input */}
          <div className="border-b border-border p-2">
            <div className="flex items-center gap-2 rounded-md bg-secondary px-2 py-1.5">
              <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search properties..."
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Property list */}
          <div className="max-h-64 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="px-2 py-3 text-center text-sm text-muted-foreground">
                No properties found
              </p>
            ) : (
              filtered.map((prop) => (
                <button
                  key={prop.propertyId}
                  type="button"
                  onClick={() => {
                    onSelect(prop.propertyId, prop.displayName);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none flex-col items-start rounded-md py-2 pl-2 pr-8 text-left text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <span className="absolute right-2 top-2.5 flex h-3.5 w-3.5 items-center justify-center">
                    {prop.propertyId === selectedPropertyId && (
                      <Check className="h-4 w-4" />
                    )}
                  </span>
                  <span className="truncate font-medium">{prop.displayName}</span>
                  <span className="text-xs text-muted-foreground">
                    {prop.account} &middot; {prop.propertyId}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
