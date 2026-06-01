/**
 * Seed standard layout templates (head + body).
 * Called from seed.ts — can also be run standalone:
 *   npx tsx scripts/seed-layouts.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

export async function seedLayoutTemplates(cms: any) {
  const existing = await cms.layoutTemplates.findAll();
  const existingNames = new Set(existing.map((t: any) => t.name));

  for (const tpl of LAYOUT_TEMPLATES) {
    if (existingNames.has(tpl.name)) {
      console.log(`  ↳ skip (exists): ${tpl.name}`);
      continue;
    }
    await cms.layoutTemplates.create({
      name:        tpl.name,
      description: tpl.description,
      type:        tpl.type,
      html:        tpl.html,
    });
    console.log(`  ✓ ${tpl.name}`);
  }
}

// ── Layout templates ──────────────────────────────────────────────────────────

const LAYOUT_TEMPLATES = [

  // ── HEAD templates ──────────────────────────────────────────────────────────

  {
    name:        "Head — Standard",
    description: "Standard HTML head: meta, title, styles, scripts.",
    type:        "head" as const,
    html: `<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{pageTitle}} | {{siteName}}</title>
  {{metaTags}}
  {{styles}}
  {{scripts}}
</head>`,
  },

  {
    name:        "Head — Standard + Tailwind CDN",
    description: "Standard head with Tailwind CSS v3 loaded from CDN.",
    type:        "head" as const,
    html: `<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{pageTitle}} | {{siteName}}</title>
  {{metaTags}}
  <script src="https://cdn.tailwindcss.com"></script>
  {{styles}}
  {{scripts}}
</head>`,
  },

  {
    name:        "Head — Standard + Font Awesome",
    description: "Standard head with Font Awesome 6 Free icons (CDN). Use fa-solid, fa-regular classes.",
    type:        "head" as const,
    html: `<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{pageTitle}} | {{siteName}}</title>
  {{metaTags}}
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  {{styles}}
  {{scripts}}
</head>`,
  },

  {
    name:        "Head — Standard + Tailwind + Font Awesome",
    description: "Tailwind CDN + Font Awesome 6 Free. The all-in-one starter head.",
    type:        "head" as const,
    html: `<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{pageTitle}} | {{siteName}}</title>
  {{metaTags}}
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  {{styles}}
  {{scripts}}
</head>`,
  },

  // ── BODY templates ──────────────────────────────────────────────────────────

  {
    name:        "Body — Minimal",
    description: "Bare body: no navigation, no footer. Just content. Good for landing pages or apps.",
    type:        "body" as const,
    html: `<body style="margin:0;padding:0;font-family:inherit;">
  <main>
    {{content}}
  </main>
  {{trackingScripts}}
</body>`,
  },

  {
    name:        "Body — Classic Website",
    description: "Topbar navigation + max-width content area + footer. The standard public website layout.",
    type:        "body" as const,
    html: `<body style="margin:0;padding:0;font-family:inherit;display:flex;flex-direction:column;min-height:100vh;">

  {{navigation:navbar}}

  <main style="flex:1;width:100%;max-width:1200px;margin:0 auto;padding:2rem 1.5rem;">
    {{content}}
  </main>

  {{navigation:footer}}

  {{trackingScripts}}
</body>`,
  },

  {
    name:        "Body — Full Width",
    description: "Topbar + edge-to-edge content area + footer. No max-width constraint — good when components control their own width.",
    type:        "body" as const,
    html: `<body style="margin:0;padding:0;font-family:inherit;display:flex;flex-direction:column;min-height:100vh;">

  {{navigation:navbar}}

  <main style="flex:1;width:100%;">
    {{content}}
  </main>

  {{navigation:footer}}

  {{trackingScripts}}
</body>`,
  },

  {
    name:        "Body — Blog / Article",
    description: "Narrow centered column optimised for reading. Topbar + 720px content + footer.",
    type:        "body" as const,
    html: `<body style="margin:0;padding:0;font-family:inherit;display:flex;flex-direction:column;min-height:100vh;background:var(--bg-surface,#fff);">

  {{navigation:navbar}}

  <main style="flex:1;width:100%;max-width:720px;margin:0 auto;padding:3rem 1.5rem;">
    {{content}}
  </main>

  {{navigation:footer}}

  {{trackingScripts}}
</body>`,
  },

  {
    name:        "Body — Dashboard (Sidebar)",
    description: "Fixed sidebar navigation on the left + scrollable main content area. No footer.",
    type:        "body" as const,
    html: `<body style="margin:0;padding:0;font-family:inherit;display:flex;height:100vh;overflow:hidden;">

  <aside style="width:240px;flex-shrink:0;height:100vh;overflow-y:auto;background:var(--bg-surface,#1e293b);border-right:1px solid var(--border,#e2e8f0);">
    {{navigation:sidebar}}
  </aside>

  <div style="flex:1;display:flex;flex-direction:column;overflow:hidden;">
    <main style="flex:1;overflow-y:auto;padding:2rem;">
      {{content}}
    </main>
  </div>

  {{trackingScripts}}
</body>`,
  },

  {
    name:        "Body — Two Column (Content + Aside)",
    description: "Main content on the left (70%) + sticky sidebar/aside on the right (30%). Good for blog or docs.",
    type:        "body" as const,
    html: `<body style="margin:0;padding:0;font-family:inherit;display:flex;flex-direction:column;min-height:100vh;">

  {{navigation:navbar}}

  <div style="flex:1;width:100%;max-width:1200px;margin:0 auto;padding:2rem 1.5rem;display:grid;grid-template-columns:1fr 320px;gap:2rem;align-items:start;">
    <main>
      {{content}}
    </main>
    <aside style="position:sticky;top:80px;">
      <!-- Aside / sidebar content — add components here -->
    </aside>
  </div>

  {{navigation:footer}}

  {{trackingScripts}}
</body>`,
  },

  {
    name:        "Body — Landing Page",
    description: "Full-viewport landing page. No topbar — navigation is part of the hero component. Sections fill the viewport.",
    type:        "body" as const,
    html: `<body style="margin:0;padding:0;font-family:inherit;overflow-x:hidden;">

  {{content}}

  {{navigation:footer}}

  {{trackingScripts}}
</body>`,
  },

];

// ── Standalone entry point ────────────────────────────────────────────────────
async function main() {
  const { cms } = await import("../src/lib/cms");
  console.log("Seeding layout templates...");
  await seedLayoutTemplates(cms);
  console.log("Done.");
  try {
    const dbModulePath = "../src/lib/db/index";
    const dbModule = await import(dbModulePath);
    const client = (dbModule as { client?: { end?: () => Promise<void> } }).client;
    await client?.end?.();
  } catch {
    // Some providers do not expose a DB client module to close.
  }
}

if (require.main === module) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
