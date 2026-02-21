"use client";

import { useEffect, useState } from "react";
import { BarChart3, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

  return (
    <Select
      value={selectedPropertyId || undefined}
      onValueChange={(value) => {
        const prop = properties.find((p) => p.propertyId === value);
        if (prop) onSelect(prop.propertyId, prop.displayName);
      }}
    >
      <SelectTrigger className="rounded-[100px] bg-muted">
        <div className="flex items-center gap-2 truncate">
          <BarChart3 className="h-4 w-4 shrink-0" />
          <SelectValue placeholder="Select a property" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {properties.map((prop) => (
          <SelectItem key={prop.propertyId} value={prop.propertyId}>
            <div className="flex flex-col">
              <span className="font-medium">{prop.displayName}</span>
              <span className="text-xs text-muted-foreground">
                {prop.account} &middot; {prop.propertyId}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
