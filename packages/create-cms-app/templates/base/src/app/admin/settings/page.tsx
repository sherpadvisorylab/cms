import { cms } from "@/lib/cms";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const settings = await cms.settings.get().catch(() => null);
  return <SettingsClient initialSettings={settings} />;
}
