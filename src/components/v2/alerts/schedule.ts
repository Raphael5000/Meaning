/**
 * Schedule shape conversion between the simplified v2 UI and the existing
 * EmailAlert DB columns.
 *
 *   UI shape:  { frequency, day, hour }
 *   DB shape:  { sendDays[], sendHour, sendMinute, intervalWeeks }
 *
 * The new design assumes single-day, hour-aligned sends (per design call).
 * Existing alerts with multi-day schedules collapse lossy: we pick the first
 * day and treat as weekly. The user signed off on this simplification.
 */

export type Frequency = "daily" | "weekly" | "biweekly" | "monthly";
export type DayKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface UiSchedule {
  frequency: Frequency;
  day: DayKey;
  /** 24-hour clock, only the hour slots in TIME_SLOTS are picker-selectable */
  hour: number;
}

export interface DbSchedule {
  sendDays: string[];
  sendHour: number;
  sendMinute: number;
  intervalWeeks: number;
}

/** Picker time slots — matches the design's SchedulePopover */
export const TIME_SLOTS = [7, 8, 9, 10, 12, 17] as const;

export const DAY_ORDER: DayKey[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const DAY_LABEL_SHORT: Record<DayKey, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

const DAY_LABEL_LONG: Record<DayKey, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

export function dayShort(d: DayKey): string {
  return DAY_LABEL_SHORT[d];
}
export function dayLong(d: DayKey): string {
  return DAY_LABEL_LONG[d];
}

export function dbToUi(s: DbSchedule): UiSchedule {
  const days = s.sendDays.length > 0 ? s.sendDays : ["monday"];
  const firstDay = (DAY_ORDER.includes(days[0] as DayKey) ? days[0] : "monday") as DayKey;
  const hour = TIME_SLOTS.includes(s.sendHour as (typeof TIME_SLOTS)[number])
    ? s.sendHour
    : nearestSlot(s.sendHour);

  if (days.length === 7) {
    return { frequency: "daily", day: firstDay, hour };
  }
  if (s.intervalWeeks === 4) return { frequency: "monthly", day: firstDay, hour };
  if (s.intervalWeeks === 2) return { frequency: "biweekly", day: firstDay, hour };
  return { frequency: "weekly", day: firstDay, hour };
}

export function uiToDb(s: UiSchedule): DbSchedule {
  const base = { sendHour: s.hour, sendMinute: 0 };
  switch (s.frequency) {
    case "daily":
      return { ...base, sendDays: [...DAY_ORDER], intervalWeeks: 1 };
    case "weekly":
      return { ...base, sendDays: [s.day], intervalWeeks: 1 };
    case "biweekly":
      return { ...base, sendDays: [s.day], intervalWeeks: 2 };
    case "monthly":
      return { ...base, sendDays: [s.day], intervalWeeks: 4 };
  }
}

function nearestSlot(hour: number): number {
  let best: number = TIME_SLOTS[0];
  let bestDiff = Math.abs(hour - best);
  for (const t of TIME_SLOTS) {
    const d = Math.abs(hour - t);
    if (d < bestDiff) {
      best = t;
      bestDiff = d;
    }
  }
  return best;
}

export function formatTime(hour: number): string {
  const h = hour % 12 || 12;
  const period = hour >= 12 ? "PM" : "AM";
  return `${h}:00 ${period}`;
}

/** Human-readable schedule summary used by the inline pill and list rows. */
export function summarizeSchedule(s: UiSchedule): string {
  const t = formatTime(s.hour);
  switch (s.frequency) {
    case "daily":
      return `Daily at ${t}`;
    case "weekly":
      return `Every ${dayLong(s.day)} at ${t}`;
    case "biweekly":
      return `Every other ${dayLong(s.day)} at ${t}`;
    case "monthly":
      return `Every 4 weeks on ${dayLong(s.day)} at ${t}`;
  }
}
