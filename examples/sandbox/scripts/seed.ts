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

const ADMIN_EMAIL = "admin@sandbox.local";

async function main(): Promise<void> {
  // Dynamic imports: evaluated AFTER dotenv has populated process.env
  const { createClient } = await import("@supabase/supabase-js");
  const { cms } = await import("../src/lib/cms");

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  console.log("Seeding sandbox...\n");

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
  console.log("Done. CMS bootstrapped with default area, menus, and settings.");

  // Close the Postgres connection pool so the process exits cleanly
  const { client } = await import("../src/lib/db/index");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
