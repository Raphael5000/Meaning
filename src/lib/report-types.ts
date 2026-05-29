/**
 * Report slide definitions.
 *
 * Each slide has:
 * - `htmlTemplate`: HTML/CSS that Claude designed from a natural language description
 *   Uses {{placeholder}} syntax for dynamic data
 * - `dataBindings`: maps placeholders to real data sources
 */

export interface DataBinding {
  placeholder: string;
  source: "bigquery" | "manual" | "goal" | "org" | "static";
  /** For bigquery: SQL query. For manual: metric name. For goal: kpi name. For org: field name. For static: literal value. */
  value: string;
}

export interface SlideDefinition {
  id: string;
  title: string;
  htmlTemplate: string;
  dataBindings: DataBinding[];
}
