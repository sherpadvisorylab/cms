"use client";

import { useEffect } from "react";

interface SlideDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function SlideDrawer({ open, onClose, title, children }: SlideDrawerProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="slide-drawer-overlay" onClick={onClose} />
      <div className="slide-drawer">
        <div className="slide-drawer-header">
          <h2 className="slide-drawer-title">{title}</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="slide-drawer-body">{children}</div>
      </div>
    </>
  );
}
