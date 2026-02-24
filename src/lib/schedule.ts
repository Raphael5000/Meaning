/** Utilities for custom alert schedules. */

const DAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type DayOfWeek = (typeof DAY_ORDER)[number];

const DAY_SHORT: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

export const VALID_DAYS = new Set<string>(DAY_ORDER);

/**
 * Build a human-readable description of the schedule.
 *
 * Examples:
 *  - Daily at 9:00 AM
 *  - Every Mon, Wed, Fri at 9:00 AM
 *  - Weekly on Monday at 9:00 AM
 *  - Every 2 weeks on Monday at 9:00 AM
 */
export function describeSchedule(
  sendDays: string[],
  sendHour: number,
  sendMinute: number,
  intervalWeeks: number
): string {
  const time = formatTime(sendHour, sendMinute);
  const sorted = sortDays(sendDays);

  if (sorted.length === 7) {
    return intervalWeeks === 1
      ? `Daily at ${time}`
      : `Every ${intervalWeeks} weeks, daily at ${time}`;
  }

  const dayList = sorted.map((d) => DAY_SHORT[d] || d).join(", ");

  if (sorted.length === 1) {
    const dayName = sorted[0].charAt(0).toUpperCase() + sorted[0].slice(1);
    if (intervalWeeks === 1) return `Weekly on ${dayName} at ${time}`;
    return `Every ${intervalWeeks} weeks on ${dayName} at ${time}`;
  }

  if (intervalWeeks === 1) return `Every ${dayList} at ${time}`;
  return `Every ${intervalWeeks} weeks on ${dayList} at ${time}`;
}

/**
 * Produce a short label for the AI prompt context
 * (e.g. "weekly", "daily", "biweekly").
 */
export function frequencyLabel(
  sendDays: string[],
  intervalWeeks: number
): string {
  if (sendDays.length === 7 && intervalWeeks === 1) return "daily";
  if (intervalWeeks === 1) return "weekly";
  if (intervalWeeks === 2) return "biweekly";
  return `every ${intervalWeeks} weeks`;
}

/** Sort days by week order (Monday first). */
export function sortDays(days: string[]): string[] {
  return [...days].sort(
    (a, b) => DAY_ORDER.indexOf(a as DayOfWeek) - DAY_ORDER.indexOf(b as DayOfWeek)
  );
}

function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  const m = minute.toString().padStart(2, "0");
  return `${h}:${m} ${period} UTC`;
}

/**
 * Check whether an alert is due to be sent right now.
 *
 * @param sendDays      - Days the alert should fire
 * @param sendHour      - Hour (UTC) the alert should fire
 * @param intervalWeeks - Repeat interval in weeks
 * @param lastSentAt    - When the alert was last sent (null if never)
 * @param now           - Current time (default: new Date())
 */
export function isAlertDue(
  sendDays: string[],
  sendHour: number,
  intervalWeeks: number,
  lastSentAt: Date | null,
  now: Date = new Date()
): boolean {
  // Check if current day matches
  const currentDay = now
    .toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" })
    .toLowerCase();
  if (!sendDays.includes(currentDay)) return false;

  // Check if current hour matches
  const currentHour = now.getUTCHours();
  if (currentHour !== sendHour) return false;

  // Check interval: skip if sent too recently
  if (lastSentAt) {
    const msSinceLast = now.getTime() - lastSentAt.getTime();
    const daysSinceLast = msSinceLast / (1000 * 60 * 60 * 24);
    // Allow some buffer (subtract 1 day) to avoid skipping due to timing drift
    const minDaysGap = intervalWeeks * 7 - 1;
    if (daysSinceLast < minDaysGap) return false;
  }

  return true;
}
