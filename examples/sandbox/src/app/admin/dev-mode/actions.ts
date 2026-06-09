"use server";

import { enableDevMode, disableDevMode, getDevModeUntil } from "@/lib/devMode";

export async function getDevModeStatus(): Promise<{ until: number | null }> {
  return { until: getDevModeUntil() };
}

export async function setDevModeEnabled(
  enabled: boolean,
  durationMinutes = 60,
): Promise<{ until: number | null }> {
  if (enabled) {
    const until = enableDevMode(durationMinutes);
    return { until };
  }
  disableDevMode();
  return { until: null };
}
