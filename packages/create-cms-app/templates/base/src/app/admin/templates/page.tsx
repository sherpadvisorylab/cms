import { cms } from "@/lib/cms";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { TemplatesClient } from "./TemplatesClient";
import { initAdmin } from "@/lib/firebase/admin";
import { getFirestore } from "firebase-admin/firestore";

initAdmin();

async function fetchPageTemplates() {
  try {
    const snap = await getFirestore()
      .collection("pageTemplates")
      .orderBy("createdAt", "desc")
      .get();
    return snap.docs.map((doc) => {
      const d = doc.data();
      return {
        id:             doc.id,
        name:           d.name as string,
        componentCount: Array.isArray(d.structure) ? (d.structure as unknown[]).length : 0,
      };
    });
  } catch {
    return [];
  }
}

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "layouts" } = await searchParams;

  const [layoutTemplates, emailTemplates, pageTemplates] = await Promise.all([
    cms.layoutTemplates.findAll().catch(() => []),
    cms.emailTemplates.findAll().catch(() => []),
    fetchPageTemplates(),
  ]);

  return (
    <TemplatesClient
      initialTab={(tab as "layouts" | "email" | "page") ?? "layouts"}
      layoutTemplates={layoutTemplates}
      emailTemplates={emailTemplates}
      pageTemplates={pageTemplates}
    />
  );
}
