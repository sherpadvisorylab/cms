"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getAdminFaviconState, setAdminFavicon } from "@/lib/adminMetadata";

export function AdminFaviconManager() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  useEffect(() => {
    const state = getAdminFaviconState(pathname || "/admin", searchParams);
    setAdminFavicon(state.sectionIcon, state.badgeIcon);
  }, [pathname, search, searchParams]);

  return null;
}
