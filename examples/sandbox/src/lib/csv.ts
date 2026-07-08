import type { ComponentSchemaField } from "@sherpacms/domain";
import { getImageUrl, type ImageValue } from "@/components/admin/ImageUploadField";

// ── Generic CSV parse/serialize (RFC4180-lite: quoting, embedded commas/newlines) ──────

export function toCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function toCsvRow(cells: string[]): string {
  return cells.map(toCsvCell).join(",");
}

/** Parses CSV text into rows of raw string cells. Handles quoted fields with embedded commas/newlines/escaped quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  // Normalize CRLF so \r doesn't leak into unquoted cell values.
  const input = text.replace(/\r\n/g, "\n");

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  // Flush the last cell/row (handles files with or without a trailing newline).
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ""));
}

/** Normalizes a CSV header or a field key/label for fuzzy matching (case/punctuation-insensitive). */
export function normalizeHeader(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

// ── Per-field-type CSV cell conversion ──────────────────────────────────────────────────

/** Field types that can be round-tripped through a single flat CSV cell. `list` is excluded — too nested to flatten. */
export function isCsvSupportedField(field: ComponentSchemaField): boolean {
  return field.type !== "list";
}

/** Converts a stored field value into the string that goes in a CSV cell. */
export function fieldValueToCsvString(value: unknown, field: ComponentSchemaField): string {
  if (value === undefined || value === null) return "";
  switch (field.type) {
    case "relation":
      return Array.isArray(value) ? (value as unknown[]).filter((v) => typeof v === "string").join(",") : "";
    case "image_url":
    case "video_url":
      return getImageUrl(value as ImageValue);
    case "toggle":
      return value ? "true" : "false";
    default:
      return String(value);
  }
}

/** Converts a CSV cell string back into the value shape the field expects for storage. */
export function csvStringToFieldValue(raw: string, field: ComponentSchemaField): unknown {
  const trimmed = raw.trim();
  switch (field.type) {
    case "relation":
      return trimmed ? trimmed.split(",").map((s) => s.trim()).filter(Boolean) : [];
    case "toggle":
      return trimmed.toLowerCase() === "true";
    case "number":
      return trimmed === "" ? undefined : Number(trimmed);
    case "image_url":
    case "video_url":
      return trimmed;
    default:
      return raw;
  }
}
