import { initAdmin } from "@/lib/firebase/admin";
import { getAuth } from "firebase-admin/auth";
import { cms } from "@/lib/cms";

initAdmin();

export async function GET(req: Request) {
  const session = req.headers.get("cookie")?.match(/__session=([^;]+)/)?.[1];
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try { await getAuth().verifySessionCookie(session, true); }
  catch { return Response.json({ error: "Unauthorized" }, { status: 401 }); }

  const areas = await cms.areas.findAll().catch(() => []);
  return Response.json({
    areas: areas.map((a) => ({ name: a.name, displayName: a.displayName || a.name })),
  });
}
