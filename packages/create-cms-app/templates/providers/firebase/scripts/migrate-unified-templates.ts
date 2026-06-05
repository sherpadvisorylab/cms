import { config } from "dotenv";
import { initAdmin } from "../src/lib/firebase/admin";
import { getFirestore } from "firebase-admin/firestore";

config({ path: ".env.local" });

initAdmin();

const TYPE_MAP = {
  head: "area_head",
  body: "area_body",
  navigation: "navigation",
} as const;

type LegacyLayoutType = keyof typeof TYPE_MAP;

async function migrate() {
  const db = getFirestore();

  const [templateSnap, layoutSnap, pageTemplateSnap] = await Promise.all([
    db.collection("templates").get(),
    db.collection("layoutTemplates").get().catch(() => null),
    db.collection("pageTemplates").get().catch(() => null),
  ]);

  let updatedExisting = 0;
  for (const doc of templateSnap.docs) {
    const data = doc.data() as Record<string, unknown>;
    if (typeof data.type === "string") continue;

    await doc.ref.set(
      {
        type: "page",
        html: typeof data.html === "string" ? data.html : "",
        css: data.css ?? null,
        js: data.js ?? null,
        updatedAt: data.updatedAt ?? data.createdAt ?? new Date().toISOString(),
      },
      { merge: true },
    );
    updatedExisting += 1;
  }

  let migratedLayouts = 0;
  if (layoutSnap) {
    for (const doc of layoutSnap.docs) {
      const data = doc.data() as Record<string, unknown>;
      const mappedType = TYPE_MAP[String(data.type ?? "") as LegacyLayoutType];
      if (!mappedType) continue;

      const target = db.collection("templates").doc(doc.id);
      const targetSnap = await target.get();
      if (!targetSnap.exists) {
        await target.set({
          name: typeof data.name === "string" ? data.name : doc.id,
          description: typeof data.description === "string" ? data.description : "",
          type: mappedType,
          html: typeof data.html === "string" ? data.html : "",
          css: data.css ?? null,
          js: data.js ?? null,
          structure: [],
          createdAt: data.createdAt ?? new Date().toISOString(),
          updatedAt: data.updatedAt ?? data.createdAt ?? new Date().toISOString(),
        });
      }

      await doc.ref.delete();
      migratedLayouts += 1;
    }
  }

  let migratedPageTemplates = 0;
  if (pageTemplateSnap) {
    for (const doc of pageTemplateSnap.docs) {
      const data = doc.data() as Record<string, unknown>;
      const target = db.collection("templates").doc(doc.id);
      const targetSnap = await target.get();
      if (!targetSnap.exists) {
        await target.set({
          name: typeof data.name === "string" ? data.name : doc.id,
          description: typeof data.description === "string" ? data.description : "",
          type: "page",
          html: "",
          css: null,
          js: null,
          structure: Array.isArray(data.structure) ? data.structure : [],
          createdAt: data.createdAt ?? new Date().toISOString(),
          updatedAt: data.updatedAt ?? data.createdAt ?? new Date().toISOString(),
        });
      }

      await doc.ref.delete();
      migratedPageTemplates += 1;
    }
  }

  console.log("Unified templates migration complete:");
  console.log(`  normalized existing template docs: ${updatedExisting}`);
  console.log(`  migrated legacy layout templates: ${migratedLayouts}`);
  console.log(`  migrated legacy page templates: ${migratedPageTemplates}`);
}

migrate().catch((error) => {
  console.error("Template migration failed:", error);
  process.exit(1);
});
