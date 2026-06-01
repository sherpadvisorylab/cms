/**
 * Firebase seed — idempotent bootstrap + admin user + starter navigation components.
 * Safe to run multiple times: existing records are skipped, not duplicated.
 * Run with: npx tsx scripts/seed.ts
 */
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { CMS } from "@cms/cms";
import { FirebaseAdapter } from "../src/lib/db/adapter";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

const cms = new CMS(new FirebaseAdapter());

const STARTER_NAV_COMPONENTS = [
  {
    name: "Navbar — Horizontal Simple",
    category: "Navbar",
    templateLiquid: `<nav class="ns-nav">
  <div class="ns-inner">
    {% for item in menu %}
    <a class="ns-link" href="{{ item.url }}">{{ item.label }}</a>
    {% endfor %}
  </div>
</nav>`,
    schema: [],
    css: `
.ns-nav { background: var(--bg-surface, #fff); border-bottom: 1px solid var(--border, #e5e7eb); }
.ns-inner { max-width: 1200px; margin: 0 auto; padding: 0 1.5rem; height: 64px; display: flex; align-items: center; gap: 2rem; }
.ns-link { color: var(--text-secondary, #4b5563); text-decoration: none; font-size: 0.9rem; font-weight: 500; transition: color .15s; }
.ns-link:hover { color: var(--primary, #2563eb); }`,
    js: "",
  },
  {
    name: "Navbar — Logo + Links + CTA",
    category: "Navbar",
    templateLiquid: `<nav class="nl-nav">
  <div class="nl-inner">
    <a class="nl-brand" href="/">{{ siteName }}</a>
    <div class="nl-links">
      {% for item in menu %}
        {% if item.isButton %}
        <a class="nl-cta" href="{{ item.url }}">{{ item.label }}</a>
        {% else %}
        <a class="nl-link" href="{{ item.url }}">{{ item.label }}</a>
        {% endif %}
      {% endfor %}
    </div>
  </div>
</nav>`,
    schema: [{ key: "siteName", label: "Site Name", type: "text" }],
    css: `
.nl-nav { background: var(--bg-surface, #fff); border-bottom: 1px solid var(--border, #e5e7eb); position: sticky; top: 0; z-index: 100; }
.nl-inner { max-width: 1200px; margin: 0 auto; padding: 0 1.5rem; height: 64px; display: flex; align-items: center; justify-content: space-between; }
.nl-brand { font-size: 1.15rem; font-weight: 700; color: var(--text-primary, #111827); text-decoration: none; }
.nl-links { display: flex; align-items: center; gap: 1.75rem; }
.nl-link { color: var(--text-secondary, #4b5563); text-decoration: none; font-size: 0.9rem; font-weight: 500; transition: color .15s; }
.nl-link:hover { color: var(--primary, #2563eb); }
.nl-cta { background: var(--primary, #2563eb); color: #fff; padding: .45rem 1rem; border-radius: 6px; font-size: 0.875rem; font-weight: 600; text-decoration: none; transition: opacity .15s; }
.nl-cta:hover { opacity: .85; }`,
    js: "",
  },
  {
    name: "Navbar — Sticky Responsive",
    category: "Navbar",
    templateLiquid: `<nav class="nr-nav" id="nr-nav">
  <div class="nr-inner">
    <a class="nr-brand" href="/">{{ siteName }}</a>
    <button class="nr-toggle" id="nr-toggle" aria-label="Toggle menu" onclick="document.getElementById('nr-menu').classList.toggle('nr-open')">
      <span></span><span></span><span></span>
    </button>
    <ul class="nr-menu" id="nr-menu">
      {% for item in menu %}
      <li>
        {% if item.isButton %}
        <a class="nr-cta" href="{{ item.url }}">{{ item.label }}</a>
        {% else %}
        <a class="nr-link" href="{{ item.url }}">{{ item.label }}</a>
        {% endif %}
      </li>
      {% endfor %}
    </ul>
  </div>
</nav>`,
    schema: [{ key: "siteName", label: "Site Name", type: "text" }],
    css: `
.nr-nav { background: var(--bg-surface, #fff); border-bottom: 1px solid var(--border, #e5e7eb); position: sticky; top: 0; z-index: 100; }
.nr-inner { max-width: 1200px; margin: 0 auto; padding: 0 1.5rem; height: 64px; display: flex; align-items: center; justify-content: space-between; }
.nr-brand { font-size: 1.15rem; font-weight: 700; color: var(--text-primary, #111827); text-decoration: none; }
.nr-toggle { display: none; flex-direction: column; gap: 5px; background: none; border: none; cursor: pointer; padding: 4px; }
.nr-toggle span { display: block; width: 22px; height: 2px; background: var(--text-primary, #111827); border-radius: 2px; }
.nr-menu { list-style: none; margin: 0; padding: 0; display: flex; align-items: center; gap: 1.75rem; }
.nr-link { color: var(--text-secondary, #4b5563); text-decoration: none; font-size: 0.9rem; font-weight: 500; transition: color .15s; }
.nr-link:hover { color: var(--primary, #2563eb); }
.nr-cta { background: var(--primary, #2563eb); color: #fff; padding: .45rem 1rem; border-radius: 6px; font-size: 0.875rem; font-weight: 600; text-decoration: none; }
@media (max-width: 768px) {
  .nr-toggle { display: flex; }
  .nr-menu { display: none; flex-direction: column; align-items: flex-start; gap: 0; position: absolute; top: 64px; left: 0; right: 0; background: var(--bg-surface, #fff); border-bottom: 1px solid var(--border, #e5e7eb); padding: 1rem 1.5rem; }
  .nr-menu.nr-open { display: flex; }
  .nr-menu li { width: 100%; padding: .5rem 0; border-bottom: 1px solid var(--border, #f3f4f6); }
  .nr-menu li:last-child { border-bottom: none; }
}`,
    js: `
document.addEventListener('click', function(e) {
  var nav = document.getElementById('nr-nav');
  var menu = document.getElementById('nr-menu');
  if (nav && menu && !nav.contains(e.target)) menu.classList.remove('nr-open');
});`,
  },
  {
    name: "Sidebar — Vertical with Icons",
    category: "Sidebar",
    templateLiquid: `<nav class="sb-nav">
  {% for item in menu %}
  <a class="sb-link{% if item.isActive %} sb-active{% endif %}" href="{{ item.url }}">
    {% if item.icon %}<i class="{{ item.icon }} sb-icon"></i>{% endif %}
    <span>{{ item.label }}</span>
    {% if item.badge %}<span class="sb-badge">{{ item.badge }}</span>{% endif %}
  </a>
  {% endfor %}
</nav>`,
    schema: [],
    css: `
.sb-nav { display: flex; flex-direction: column; gap: 2px; padding: .75rem; }
.sb-link { display: flex; align-items: center; gap: .75rem; padding: .6rem .9rem; border-radius: 7px; color: var(--text-secondary, #4b5563); text-decoration: none; font-size: 0.9rem; font-weight: 500; transition: background .12s, color .12s; }
.sb-link:hover { background: var(--bg-light, #f3f4f6); color: var(--text-primary, #111827); }
.sb-active { background: var(--bg-light, #eff6ff); color: var(--primary, #2563eb) !important; font-weight: 600; }
.sb-icon { width: 18px; text-align: center; font-size: 1rem; flex-shrink: 0; }
.sb-badge { margin-left: auto; background: var(--primary, #2563eb); color: #fff; font-size: .7rem; font-weight: 700; padding: 1px 7px; border-radius: 99px; }`,
    js: "",
  },
  {
    name: "Footer — Multi-column",
    category: "Footer nav",
    templateLiquid: `<footer class="fm-footer">
  <div class="fm-inner">
    <div class="fm-brand">
      <a class="fm-name" href="/">{{ siteName }}</a>
      <p class="fm-tagline">Building great experiences.</p>
    </div>
    <nav class="fm-links">
      {% for item in menu %}
      <a class="fm-link" href="{{ item.url }}">{{ item.label }}</a>
      {% endfor %}
    </nav>
  </div>
  <div class="fm-bottom">
    <span>&copy; 2025 {{ siteName }}. All rights reserved.</span>
  </div>
</footer>`,
    schema: [{ key: "siteName", label: "Site Name", type: "text" }],
    css: `
.fm-footer { background: var(--bg-surface, #111827); color: #e5e7eb; }
.fm-inner { max-width: 1200px; margin: 0 auto; padding: 3rem 1.5rem 2rem; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 2rem; }
.fm-brand { max-width: 260px; }
.fm-name { font-size: 1.2rem; font-weight: 700; color: #fff; text-decoration: none; }
.fm-tagline { margin-top: .5rem; font-size: .85rem; color: #9ca3af; line-height: 1.6; }
.fm-links { display: flex; flex-wrap: wrap; gap: .6rem 2.5rem; }
.fm-link { color: #9ca3af; text-decoration: none; font-size: .875rem; transition: color .15s; }
.fm-link:hover { color: #fff; }
.fm-bottom { max-width: 1200px; margin: 0 auto; padding: 1.25rem 1.5rem; border-top: 1px solid #1f2937; font-size: .8rem; color: #6b7280; }`,
    js: "",
  },
  {
    name: "Footer — Single Row",
    category: "Footer nav",
    templateLiquid: `<footer class="fs-footer">
  <div class="fs-inner">
    <span class="fs-copy">&copy; {{ page.year | default: '2025' }} {{ siteName }}. All rights reserved.</span>
    <nav class="fs-links">
      {% for item in menu %}
      <a class="fs-link" href="{{ item.url }}">{{ item.label }}</a>
      {% endfor %}
    </nav>
  </div>
</footer>`,
    schema: [{ key: "siteName", label: "Site Name", type: "text" }],
    css: `
.fs-footer { background: var(--bg-surface, #f9fafb); border-top: 1px solid var(--border, #e5e7eb); }
.fs-inner { max-width: 1200px; margin: 0 auto; padding: 1.25rem 1.5rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; }
.fs-copy { font-size: .82rem; color: var(--text-muted, #6b7280); }
.fs-links { display: flex; flex-wrap: wrap; gap: 1.25rem; }
.fs-link { font-size: .82rem; color: var(--text-muted, #6b7280); text-decoration: none; transition: color .15s; }
.fs-link:hover { color: var(--primary, #2563eb); }`,
    js: "",
  },
] as const;

async function seed() {
  const email    = process.env.SEED_ADMIN_EMAIL    ?? "admin@example.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "changeme123!";
  const name     = process.env.SEED_ADMIN_NAME     ?? "Admin";

  console.log("[ 1/4 ] Bootstrapping CMS defaults (areas, menus, settings)...");
  await cms.bootstrap();
  console.log("        Done.");

  console.log(`[ 2/4 ] Firebase Auth user: ${email}`);
  const existingAuth = await getAuth().getUserByEmail(email).catch(() => null);
  if (existingAuth) {
    console.log("        Already exists — skipped.");
  } else {
    const fbUser = await getAuth().createUser({ email, password, displayName: name });
    await getAuth().setCustomUserClaims(fbUser.uid, { role: "admin" });
    console.log("        Created.");
  }

  console.log(`[ 3/4 ] CMS user profile: ${email}`);
  const allUsers    = await cms.users.findAll();
  const existingCms = allUsers.find((u) => u.email === email);
  if (existingCms) {
    console.log("        Already exists — skipped.");
  } else {
    await cms.users.create({ name, email, role: "admin", status: "active" });
    console.log("        Created.");
  }

  console.log("[ 4/4 ] Starter navigation components...");
  const allComponents = await cms.components.findAll();
  const existingNames = new Set(allComponents.map((c) => c.name.toLowerCase()));

  for (const def of STARTER_NAV_COMPONENTS) {
    if (existingNames.has(def.name.toLowerCase())) {
      console.log(`        ${def.name} — skipped (exists).`);
      continue;
    }
    const component = await cms.components.create({
      name:     def.name,
      type:     "navigation",
      category: def.category,
      status:   "draft",
    });
    await cms.componentVersions.createVersion(component.id, {
      templateLiquid: def.templateLiquid,
      schema:         def.schema as never,
      css:            def.css || undefined,
      js:             def.js || undefined,
    });
    console.log(`        ${def.name} — created.`);
  }

  console.log("\n✅  Seed complete!\n");
  console.log(`    Email:    ${email}`);
  console.log(`    Password: ${password}`);
  console.log("\n    Change the password after first login.\n");
  process.exit(0);
}

seed().catch((err) => { console.error("Seed failed:", err); process.exit(1); });
