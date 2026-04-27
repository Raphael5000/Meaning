/** Shape returned by GET /api/alerts (and the create/update endpoints). */
export interface AlertSummary {
  id: string;
  name: string | null;
  alertType: string;
  customPrompt: string | null;
  recipients: string;
  enabled: boolean;
  lastSentAt: string | null;
  createdAt: string;
  sendDays: string[];
  sendHour: number;
  sendMinute: number;
  intervalWeeks: number;
}

export const ALERT_TYPE_LABEL: Record<string, string> = {
  weekly_snapshot: "Weekly snapshot",
  traffic_report: "Traffic report",
  top_pages: "Top pages",
  custom: "Custom",
};

export const ALERT_TYPES = [
  { value: "weekly_snapshot", label: "Weekly snapshot" },
  { value: "traffic_report", label: "Traffic report" },
  { value: "top_pages", label: "Top pages" },
  { value: "custom", label: "Custom prompt" },
] as const;
