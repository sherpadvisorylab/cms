/**
 * Seed script — creates the preset admin user in Supabase Auth
 * and bootstraps the CMS with default areas/menus/settings.
 *
 * Usage: npm run db:seed  (from inside the project directory)
 * Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL
 */
import { config } from "dotenv";
import { randomBytes } from "crypto";
import { WebSocket } from "ws";

// Polyfill WebSocket for Node.js < 22 (required by @supabase/supabase-js)
if (!("WebSocket" in globalThis)) {
  // @ts-ignore
  globalThis.WebSocket = WebSocket;
}

// Load env BEFORE importing any module that reads process.env at initialisation time.
// Static imports are hoisted by the JS engine, so dotenv must run here — before
// the dynamic imports below — to guarantee env vars are available when those
// modules initialise their database connections.
config({ path: ".env.local" });

const ADMIN_EMAIL = "admin@__PROJECT_NAME__.local";

async function main(): Promise<void> {
  // Dynamic imports: evaluated AFTER dotenv has populated process.env
  const { createClient } = await import("@supabase/supabase-js");
  const { cms } = await import("../src/lib/cms");

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  console.log("Seeding __PROJECT_NAME__...\n");

  // ── Admin user ─────────────────────────────────────────────────────────────
  const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
  const alreadyExists = existing?.users?.some((u) => u.email === ADMIN_EMAIL);

  if (alreadyExists) {
    console.log(`Admin user already exists: ${ADMIN_EMAIL}`);
  } else {
    const password = randomBytes(14).toString("base64url");

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password,
      email_confirm: true,
      user_metadata: { name: "Admin", role: "admin" },
    });

    if (error) throw new Error(`Failed to create admin user: ${error.message}`);

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("  Admin user created — save these credentials:");
    console.log(`  Email:    ${data.user?.email}`);
    console.log(`  Password: ${password}`);
    console.log("  These will NOT be shown again.");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  }

  // ── CMS bootstrap ──────────────────────────────────────────────────────────
  console.log("Bootstrapping CMS defaults...");
  await cms.bootstrap();
  console.log("✓ CMS bootstrapped with default area, menus, and settings.");

  // ── Navigation components ───────────────────────────────────────────────────
  console.log("\nSeeding navigation components...");
  await seedNavigationComponents(cms);
  console.log("✓ Navigation components ready.");

  // ── Layout templates ────────────────────────────────────────────────────────
  console.log("\nSeeding layout templates...");
  const { seedLayoutTemplates } = await import("./seed-layouts");
  await seedLayoutTemplates(cms);
  console.log("✓ Layout templates ready.");

  // Close the Postgres connection pool so the process exits cleanly
  const { client } = await import("../src/lib/db/index");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// ── Navigation component seed data ─────────────────────────────────────────────
async function seedNavigationComponents(cms: unknown) {
  return _seedNavComponents(cms as any);
}

async function _seedNavComponents(cms: any) {
  const existing = await cms.components.findAll();
  const existingNames = new Set(existing.map((c: any) => c.name));

  const NAV_COMPONENTS = [
    {
      name: "Navbar — Horizontal Simple",
      category: "Navbar",
      template: `<nav class="ns-nav">
  <div class="ns-inner">
    {% for item in menu %}
    <a class="ns-link" href="{{ item.url }}">{{ item.label }}</a>
    {% endfor %}
  </div>
</nav>`,
      css: `.ns-nav{background:var(--bg-surface,#fff);border-bottom:1px solid var(--border,#e5e7eb)}.ns-inner{max-width:1200px;margin:0 auto;padding:0 1.5rem;height:64px;display:flex;align-items:center;gap:2rem}.ns-link{color:var(--text-secondary,#4b5563);text-decoration:none;font-size:.9rem;font-weight:500;transition:color .15s}.ns-link:hover{color:var(--primary,#2563eb)}`,
      js: "",
    },
    {
      name: "Navbar — Logo + Links + CTA",
      category: "Navbar",
      template: `<nav class="nl-nav">
  <div class="nl-inner">
    <a class="nl-brand" href="/">{{ siteName }}</a>
    <div class="nl-links">
      {% for item in menu %}
        {% if item.isButton %}<a class="nl-cta" href="{{ item.url }}">{{ item.label }}</a>
        {% else %}<a class="nl-link" href="{{ item.url }}">{{ item.label }}</a>
        {% endif %}
      {% endfor %}
    </div>
  </div>
</nav>`,
      css: `.nl-nav{background:var(--bg-surface,#fff);border-bottom:1px solid var(--border,#e5e7eb);position:sticky;top:0;z-index:100}.nl-inner{max-width:1200px;margin:0 auto;padding:0 1.5rem;height:64px;display:flex;align-items:center;justify-content:space-between}.nl-brand{font-size:1.15rem;font-weight:700;color:var(--text-primary,#111827);text-decoration:none}.nl-links{display:flex;align-items:center;gap:1.75rem}.nl-link{color:var(--text-secondary,#4b5563);text-decoration:none;font-size:.9rem;font-weight:500;transition:color .15s}.nl-link:hover{color:var(--primary,#2563eb)}.nl-cta{background:var(--primary,#2563eb);color:#fff;padding:.45rem 1rem;border-radius:6px;font-size:.875rem;font-weight:600;text-decoration:none;transition:opacity .15s}.nl-cta:hover{opacity:.85}`,
      js: "",
    },
    {
      name: "Navbar — Sticky Responsive",
      category: "Navbar",
      template: `<nav class="nr-nav" id="nr-nav">
  <div class="nr-inner">
    <a class="nr-brand" href="/">{{ siteName }}</a>
    <button class="nr-toggle" aria-label="Toggle menu" onclick="document.getElementById('nr-menu').classList.toggle('nr-open')">
      <span></span><span></span><span></span>
    </button>
    <ul class="nr-menu" id="nr-menu">
      {% for item in menu %}
      <li>{% if item.isButton %}<a class="nr-cta" href="{{ item.url }}">{{ item.label }}</a>
      {% else %}<a class="nr-link" href="{{ item.url }}">{{ item.label }}</a>{% endif %}</li>
      {% endfor %}
    </ul>
  </div>
</nav>`,
      css: `.nr-nav{background:var(--bg-surface,#fff);border-bottom:1px solid var(--border,#e5e7eb);position:sticky;top:0;z-index:100}.nr-inner{max-width:1200px;margin:0 auto;padding:0 1.5rem;height:64px;display:flex;align-items:center;justify-content:space-between}.nr-brand{font-size:1.15rem;font-weight:700;color:var(--text-primary,#111827);text-decoration:none}.nr-toggle{display:none;flex-direction:column;gap:5px;background:none;border:none;cursor:pointer;padding:4px}.nr-toggle span{display:block;width:22px;height:2px;background:var(--text-primary,#111827);border-radius:2px}.nr-menu{list-style:none;margin:0;padding:0;display:flex;align-items:center;gap:1.75rem}.nr-link{color:var(--text-secondary,#4b5563);text-decoration:none;font-size:.9rem;font-weight:500;transition:color .15s}.nr-link:hover{color:var(--primary,#2563eb)}.nr-cta{background:var(--primary,#2563eb);color:#fff;padding:.45rem 1rem;border-radius:6px;font-size:.875rem;font-weight:600;text-decoration:none}@media(max-width:768px){.nr-toggle{display:flex}.nr-menu{display:none;flex-direction:column;align-items:flex-start;gap:0;position:absolute;top:64px;left:0;right:0;background:var(--bg-surface,#fff);border-bottom:1px solid var(--border,#e5e7eb);padding:1rem 1.5rem}.nr-menu.nr-open{display:flex}.nr-menu li{width:100%;padding:.5rem 0;border-bottom:1px solid var(--border,#f3f4f6)}}`,
      js: `document.addEventListener('click',function(e){var n=document.getElementById('nr-nav'),m=document.getElementById('nr-menu');if(n&&m&&!n.contains(e.target))m.classList.remove('nr-open')});`,
    },
    {
      name: "Sidebar — Vertical with Icons",
      category: "Sidebar",
      template: `<nav class="sb-nav">
  {% for item in menu %}
  <a class="sb-link" href="{{ item.url }}">
    {% if item.icon %}<i class="{{ item.icon }} sb-icon"></i>{% endif %}
    <span>{{ item.label }}</span>
    {% if item.badge %}<span class="sb-badge">{{ item.badge }}</span>{% endif %}
  </a>
  {% endfor %}
</nav>`,
      css: `.sb-nav{display:flex;flex-direction:column;gap:2px;padding:.75rem}.sb-link{display:flex;align-items:center;gap:.75rem;padding:.6rem .9rem;border-radius:7px;color:var(--text-secondary,#4b5563);text-decoration:none;font-size:.9rem;font-weight:500;transition:background .12s,color .12s}.sb-link:hover{background:var(--bg-light,#f3f4f6);color:var(--text-primary,#111827)}.sb-icon{width:18px;text-align:center;font-size:1rem;flex-shrink:0}.sb-badge{margin-left:auto;background:var(--primary,#2563eb);color:#fff;font-size:.7rem;font-weight:700;padding:1px 7px;border-radius:99px}`,
      js: "",
    },
    {
      name: "Footer — Single Row",
      category: "Footer",
      template: `<footer class="fs-footer">
  <div class="fs-inner">
    <span class="fs-copy">&copy; 2025 {{ siteName }}. All rights reserved.</span>
    <nav class="fs-links">
      {% for item in menu %}<a class="fs-link" href="{{ item.url }}">{{ item.label }}</a>{% endfor %}
    </nav>
  </div>
</footer>`,
      css: `.fs-footer{background:var(--bg-surface,#f9fafb);border-top:1px solid var(--border,#e5e7eb)}.fs-inner{max-width:1200px;margin:0 auto;padding:1.25rem 1.5rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem}.fs-copy{font-size:.82rem;color:var(--text-muted,#6b7280)}.fs-links{display:flex;flex-wrap:wrap;gap:1.25rem}.fs-link{font-size:.82rem;color:var(--text-muted,#6b7280);text-decoration:none;transition:color .15s}.fs-link:hover{color:var(--primary,#2563eb)}`,
      js: "",
    },
    {
      name: "Footer — Multi-column",
      category: "Footer",
      template: `<footer class="fm-footer">
  <div class="fm-inner">
    <div class="fm-brand">
      <a class="fm-name" href="/">{{ siteName }}</a>
      <p class="fm-tagline">Building great experiences.</p>
    </div>
    <nav class="fm-links">
      {% for item in menu %}<a class="fm-link" href="{{ item.url }}">{{ item.label }}</a>{% endfor %}
    </nav>
  </div>
  <div class="fm-bottom"><span>&copy; 2025 {{ siteName }}. All rights reserved.</span></div>
</footer>`,
      css: `.fm-footer{background:var(--bg-surface,#111827);color:#e5e7eb}.fm-inner{max-width:1200px;margin:0 auto;padding:3rem 1.5rem 2rem;display:flex;justify-content:space-between;flex-wrap:wrap;gap:2rem}.fm-brand{max-width:260px}.fm-name{font-size:1.2rem;font-weight:700;color:#fff;text-decoration:none}.fm-tagline{margin-top:.5rem;font-size:.85rem;color:#9ca3af;line-height:1.6}.fm-links{display:flex;flex-wrap:wrap;gap:.6rem 2.5rem}.fm-link{color:#9ca3af;text-decoration:none;font-size:.875rem;transition:color .15s}.fm-link:hover{color:#fff}.fm-bottom{max-width:1200px;margin:0 auto;padding:1.25rem 1.5rem;border-top:1px solid #1f2937;font-size:.8rem;color:#6b7280}`,
      js: "",
    },
  ];

  for (const comp of NAV_COMPONENTS) {
    if (existingNames.has(comp.name)) {
      console.log(`  ↳ skip (exists): ${comp.name}`);
      continue;
    }
    const component = await cms.components.create({
      name:     comp.name,
      type:     "navigation",
      category: comp.category,
      status:   "active",
    });
    await cms.componentVersions.createVersion(component.id, {
      templateLiquid: comp.template,
      css:            comp.css,
      js:             comp.js,
      schema:         [],
    });
    console.log(`  ✓ ${comp.name}`);
  }
}
