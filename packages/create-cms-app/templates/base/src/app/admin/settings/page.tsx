import { cms } from "@/lib/cms";
import { SettingsClient } from "./SettingsClient";
import { buildAdminMetadata } from "@/lib/adminMetadata";

export const metadata = buildAdminMetadata(
  "Settings",
  "Configure branding, variables, integrations, and global CMS settings.",
);

export default async function SettingsPage() {
  const settings = await cms.settings.get().catch(() => null);
  return <SettingsClient initialSettings={settings} />;
}
