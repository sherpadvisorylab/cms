"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Thin top progress bar that starts on any internal link click
 * and completes when the pathname changes (navigation done).
 * Drop once into admin/layout.tsx — no other changes needed.
 */
export function TopLoadingBar() {
  const pathname           = useRef(usePathname());
  const currentPathname    = usePathname();
  const [pct,    setPct]   = useState(0);
  const [visible,setVisible] = useState(false);
  const slowTimer          = useRef<ReturnType<typeof setTimeout>>();
  const hideTimer          = useRef<ReturnType<typeof setTimeout>>();

  // ── Start bar on any internal link click ──────────────────────────────────
  useEffect(() => {
    function onLinkClick(e: MouseEvent) {
      const a = (e.target as Element).closest("a[href]");
      if (!a) return;
      const href = a.getAttribute("href") ?? "";
      // Ignore external, anchor-only, or same-page links
      if (!href || href.startsWith("http") || href.startsWith("#") || href === pathname.current) return;

      clearTimeout(slowTimer.current);
      clearTimeout(hideTimer.current);
      setVisible(true);
      setPct(25);

      // Slowly creep toward 80% while waiting for server
      slowTimer.current = setTimeout(() => setPct(50), 250);
      slowTimer.current = setTimeout(() => setPct(70), 700);
    }

    document.addEventListener("click", onLinkClick);
    return () => document.removeEventListener("click", onLinkClick);
  }, []);

  // ── Complete bar when pathname changes (navigation done) ──────────────────
  useEffect(() => {
    if (currentPathname === pathname.current) return;
    pathname.current = currentPathname;

    clearTimeout(slowTimer.current);
    clearTimeout(hideTimer.current);
    setPct(100);

    // Fade out after the full-width animation
    hideTimer.current = setTimeout(() => {
      setVisible(false);
      setPct(0);
    }, 500);
  }, [currentPathname]);

  if (!visible) return null;

  return (
    <div style={{
      position:   "fixed",
      top:        0,
      left:       0,
      right:      0,
      zIndex:     9999,
      height:     3,
      pointerEvents: "none",
    }}>
      <div style={{
        height:     "100%",
        width:      `${pct}%`,
        background:         "var(--primary, #2E5A97)",
        borderRadius:       "0 2px 2px 0",
        boxShadow:          "0 0 10px rgba(46,90,151,0.6)",
        opacity:            pct >= 100 ? 0 : 1,
        // Use only individual transition properties — never mix with shorthand
        transitionProperty: pct >= 100 ? "width, opacity" : "width",
        transitionDuration: pct >= 100 ? "0.15s, 0.3s"   : pct >= 70 ? "0.4s" : "0.25s",
        transitionTimingFunction: "ease",
        transitionDelay:    pct >= 100 ? "0s, 0.15s"     : "0s",
      }} />
    </div>
  );
}
