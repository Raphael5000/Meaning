"use client";

import { useEffect, useState } from "react";
import { BarChart3, Loader2 } from "lucide-react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

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
          <SelectPrimitive.Item
            key={prop.propertyId}
            value={prop.propertyId}
            textValue={prop.displayName}
            className={cn(
              "relative flex w-full cursor-pointer select-none flex-col rounded-md py-2 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
            )}
          >
            <span className="absolute right-2 top-2.5 flex h-3.5 w-3.5 items-center justify-center">
              <SelectPrimitive.ItemIndicator>
                <Check className="h-4 w-4" />
              </SelectPrimitive.ItemIndicator>
            </span>
            <SelectPrimitive.ItemText>
              {prop.displayName}
            </SelectPrimitive.ItemText>
            <span className="text-xs text-muted-foreground">
              {prop.account} &middot; {prop.propertyId}
            </span>
          </SelectPrimitive.Item>
        ))}
      </SelectContent>
    </Select>
  );
}
