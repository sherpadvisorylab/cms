/**
 * Seed script for sandbox infrastructure concerns only.
 * Content defaults now live under seed/* and are loaded by scripts/seed-pages-runner.ts.
 *
 * Usage: npm run seed
 */
import { config } from "dotenv";
import { randomBytes } from "crypto";
import { WebSocket } from "ws";

if (!("WebSocket" in globalThis)) {
  // @ts-ignore
  globalThis.WebSocket = WebSocket;
}

config({ path: ".env.local" });

const ADMIN_EMAIL = "admin@sandbox.local";

async function main(): Promise<void> {
  const { createClient } = await import("@supabase/supabase-js");

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  console.log("Seeding sandbox infrastructure...\n");

  const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
  const alreadyExists = existing?.users?.some((user) => user.email === ADMIN_EMAIL);

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

    if (error) {
      throw new Error(`Failed to create admin user: ${error.message}`);
    }

    console.log("Admin user created. Save these credentials:");
    console.log(`  Email:    ${data.user?.email}`);
    console.log(`  Password: ${password}`);
    console.log("These will not be shown again.\n");
  }

  const { client } = await import("../src/lib/db/index");
  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
