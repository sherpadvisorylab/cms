/**
 * Seed script for provider infrastructure concerns only.
 * Content defaults now live under seed/* and are loaded by scripts/seed-pages-runner.ts.
 *
 * Usage: npm run seed
 */
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { CMS } from "@sherpacms/cms";
import { FirebaseAdapter } from "../src/lib/db/adapter";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

const cms = new CMS(new FirebaseAdapter());

async function seed() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "changeme123!";
  const name = process.env.SEED_ADMIN_NAME ?? "Admin";

  console.log("Seeding Firebase infrastructure...\n");

  console.log(`[ 1/2 ] Firebase Auth user: ${email}`);
  const existingAuth = await getAuth().getUserByEmail(email).catch(() => null);
  if (existingAuth) {
    console.log("        Already exists -> skipped.");
  } else {
    const fbUser = await getAuth().createUser({ email, password, displayName: name });
    await getAuth().setCustomUserClaims(fbUser.uid, { role: "admin" });
    console.log("        Created.");
  }

  console.log(`[ 2/2 ] CMS user profile: ${email}`);
  const allUsers = await cms.users.findAll();
  const existingCms = allUsers.find((user) => user.email === email);
  if (existingCms) {
    console.log("        Already exists -> skipped.");
  } else {
    await cms.users.create({ name, email, role: "admin", status: "active" });
    console.log("        Created.");
  }

  console.log("\nSeed complete.\n");
  console.log(`    Email:    ${email}`);
  console.log(`    Password: ${password}`);
  console.log("\n    Change the password after first login.\n");
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
