"use client";

import { useState, useMemo } from "react";
import { CalendarIcon } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRangePickerProps {
  dateRange: string;
  dateFrom?: string | null;
  dateTo?: string | null;
  onChange: (dateRange: string, dateFrom?: string | null, dateTo?: string | null) => void;
}

const PRESETS = [
  { value: "7d", label: "7 days", days: 7 },
  { value: "28d", label: "28 days", days: 28 },
  { value: "90d", label: "90 days", days: 90 },
] as const;

export default function DateRangePicker({ dateRange, dateFrom, dateTo, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);

  const selected: DateRange | undefined = useMemo(() => {
    if (dateRange === "custom" && dateFrom && dateTo) {
      return { from: new Date(dateFrom), to: new Date(dateTo) };
    }
    const preset = PRESETS.find((p) => p.value === dateRange);
    if (preset) {
      return { from: startOfDay(subDays(new Date(), preset.days)), to: startOfDay(new Date()) };
    }
    return { from: startOfDay(subDays(new Date(), 28)), to: startOfDay(new Date()) };
  }, [dateRange, dateFrom, dateTo]);

  function handlePreset(value: string, days: number) {
    onChange(value, null, null);
    setOpen(false);
  }

  function handleCalendarSelect(range: DateRange | undefined) {
    if (range?.from && range?.to) {
      const from = format(range.from, "yyyy-MM-dd");
      const to = format(range.to, "yyyy-MM-dd");
      onChange("custom", from, to);
    }
  }

  const label = useMemo(() => {
    const preset = PRESETS.find((p) => p.value === dateRange);
    if (preset) return `Last ${preset.label}`;
    if (dateRange === "custom" && dateFrom && dateTo) {
      return `${format(new Date(dateFrom), "MMM d, yyyy")} – ${format(new Date(dateTo), "MMM d, yyyy")}`;
    }
    return "Pick a date range";
  }, [dateRange, dateFrom, dateTo]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "justify-start text-left font-normal",
            !dateRange && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
          <span className="text-xs">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex">
          <div className="flex flex-col gap-1 border-r p-3">
            {PRESETS.map((p) => (
              <Button
                key={p.value}
                variant={dateRange === p.value ? "default" : "ghost"}
                size="sm"
                className="justify-start text-xs"
                onClick={() => handlePreset(p.value, p.days)}
              >
                Last {p.label}
              </Button>
            ))}
          </div>
          <div className="p-0">
            <Calendar
              mode="range"
              selected={selected}
              onSelect={handleCalendarSelect}
              numberOfMonths={2}
              defaultMonth={selected?.from}
              disabled={{ after: new Date() }}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
