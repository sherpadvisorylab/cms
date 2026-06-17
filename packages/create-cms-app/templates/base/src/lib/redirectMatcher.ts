import type { CmsRedirect } from "@sherpacms/domain";

export interface RedirectMatch {
  destination: string;
  statusCode: number;
}

function buildPathRegex(sourcePath: string): { regex: RegExp; captureCount: number } {
  let captureCount = 0;
  let pattern = "";
  let i = 0;

  while (i < sourcePath.length) {
    if (sourcePath[i] === "*" && sourcePath[i + 1] === "*") {
      captureCount++;
      pattern += "(.+)";
      i += 2;
    } else if (sourcePath[i] === "*") {
      captureCount++;
      pattern += "([^/]+)";
      i += 1;
    } else {
      const ch = sourcePath[i];
      if (".+^${}()|[]\\".includes(ch)) {
        pattern += "\\" + ch;
      } else {
        pattern += ch;
      }
      i += 1;
    }
  }

  return { regex: new RegExp(`^${pattern}$`), captureCount };
}

function buildLoosePathRegex(sourcePath: string): RegExp {
  let pattern = "";
  let i = 0;

  while (i < sourcePath.length) {
    if (sourcePath[i] === "*" && sourcePath[i + 1] === "*") {
      pattern += ".+";
      i += 2;
    } else if (sourcePath[i] === "*") {
      pattern += "[^/]+";
      i += 1;
    } else {
      const ch = sourcePath[i];
      if (".+^${}()|[]\\".includes(ch)) {
        pattern += "\\" + ch;
      } else {
        pattern += ch;
      }
      i += 1;
    }
  }

  return new RegExp(`^${pattern}$`);
}

function patternToSample(source: string): string {
  return source
    .split("?")[0]
    .replace(/\*\*/g, "x/y")
    .replace(/\*/g, "x");
}

export function matchRedirect(url: string, redirects: CmsRedirect[]): RedirectMatch | null {
  const qIdx = url.indexOf("?");
  const urlPath = qIdx >= 0 ? url.slice(0, qIdx) : url;
  const urlQuery = qIdx >= 0 ? url.slice(qIdx + 1) : "";
  const urlParams = new URLSearchParams(urlQuery);

  const active = redirects
    .filter((r) => r.active)
    .sort((a, b) => a.order - b.order);

  for (const redirect of active) {
    const sourceQIdx = redirect.source.indexOf("?");
    const sourcePath = sourceQIdx >= 0 ? redirect.source.slice(0, sourceQIdx) : redirect.source;
    const sourceQuery = sourceQIdx >= 0 ? redirect.source.slice(sourceQIdx + 1) : "";

    const { regex } = buildPathRegex(sourcePath);
    const pathMatch = urlPath.match(regex);
    if (!pathMatch) continue;

    const captures: string[] = pathMatch.slice(1);

    if (sourceQuery) {
      const sourceParams = new URLSearchParams(sourceQuery);
      for (const [key, val] of sourceParams) {
        if (val === "*") {
          captures.push(urlParams.get(key) ?? "");
        }
      }
    }

    let destination = redirect.destination;
    captures.forEach((capture, i) => {
      destination = destination.replace(new RegExp(`\\$${i + 1}`, "g"), capture);
    });

    if (redirect.preserveQuery && urlQuery) {
      const sep = destination.includes("?") ? "&" : "?";
      destination += sep + urlQuery;
    }

    return { destination, statusCode: redirect.statusCode };
  }

  return null;
}

export function detectConflicts(redirects: CmsRedirect[]): Set<string> {
  const conflictIds = new Set<string>();
  const active = redirects.filter((r) => r.active);

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i];
      const b = active[j];

      if (a.source === b.source) {
        conflictIds.add(a.id);
        conflictIds.add(b.id);
        continue;
      }

      const aPath = a.source.split("?")[0];
      const bPath = b.source.split("?")[0];
      const regexA = buildLoosePathRegex(aPath);
      const regexB = buildLoosePathRegex(bPath);
      const sampleA = patternToSample(a.source);
      const sampleB = patternToSample(b.source);

      if (regexA.test(sampleB) || regexB.test(sampleA)) {
        conflictIds.add(a.id);
        conflictIds.add(b.id);
      }
    }
  }

  return conflictIds;
}
