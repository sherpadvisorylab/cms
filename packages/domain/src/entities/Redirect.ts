export type RedirectStatusCode = 301 | 302 | 307 | 308 | 410 | 503;

export const REDIRECT_STATUS_CODES: { code: RedirectStatusCode; label: string }[] = [
  { code: 301, label: "301 – Moved Permanently" },
  { code: 302, label: "302 – Found (Temporary)" },
  { code: 307, label: "307 – Temporary Redirect" },
  { code: 308, label: "308 – Permanent Redirect" },
  { code: 410, label: "410 – Gone" },
  { code: 503, label: "503 – Service Unavailable" },
];

export interface CmsRedirect {
  id: string;
  /** Source URL pattern. Supports * (single segment), ** (multi-segment), ?param=* (query capture). */
  source: string;
  /** Destination URL. Supports $1, $2… substitution for captured segments. */
  destination: string;
  statusCode: RedirectStatusCode;
  /** Append original query string to destination after matching. */
  preserveQuery: boolean;
  active: boolean;
  /** Processing order — lower numbers are evaluated first. */
  order: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}
