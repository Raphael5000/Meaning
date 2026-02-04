"use client";

import { useEffect, useState } from "react";

interface Property {
  propertyId: string;
  displayName: string;
  account: string;
}

interface PropertySelectorProps {
  selectedPropertyId: string | null;
  onSelect: (propertyId: string, displayName: string) => void;
}

export default function PropertySelector({
  selectedPropertyId,
  onSelect,
}: PropertySelectorProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

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

  const selectedProperty = properties.find(
    (p) => p.propertyId === selectedPropertyId
  );

  if (loading) {
    return (
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
        style={{ color: "var(--text-muted)" }}
      >
        <div
          className="h-4 w-4 animate-spin rounded-full border-2 border-current"
          style={{ borderTopColor: "transparent" }}
        />
        Loading properties...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg px-3 py-2 text-sm" style={{ color: "var(--error)" }}>
        {error}
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="rounded-lg px-3 py-2 text-sm" style={{ color: "var(--text-muted)" }}>
        No GA4 properties found. Make sure your Google account has access to a GA4 property.
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
        style={{
          background: "var(--bg-tertiary)",
          color: "var(--text-primary)",
          border: "1px solid var(--border-color)",
        }}
      >
        <span className="flex items-center gap-2 truncate">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 20V10" />
            <path d="M12 20V4" />
            <path d="M6 20v-6" />
          </svg>
          {selectedProperty
            ? selectedProperty.displayName
            : "Select a property"}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-lg py-1 shadow-lg"
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
          }}
        >
          {properties.map((prop) => (
            <button
              key={prop.propertyId}
              onClick={() => {
                onSelect(prop.propertyId, prop.displayName);
                setOpen(false);
              }}
              className="flex w-full cursor-pointer flex-col px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--bg-hover)]"
              style={{
                color:
                  prop.propertyId === selectedPropertyId
                    ? "var(--accent)"
                    : "var(--text-primary)",
              }}
            >
              <span className="font-medium">{prop.displayName}</span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {prop.account} &middot; {prop.propertyId}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
