"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function PageTabNav({ id }: { id: string }) {
  const pathname = usePathname();

  const tabs = [
    { label: "⚙ Settings",  href: `/admin/pages/${id}` },
    { label: "⊞ Structure", href: `/admin/pages/${id}/structure` },
    { label: "✏ Content",   href: `/admin/pages/${id}/content` },
  ];

  return (
    <div className="tabs" style={{ marginBottom: 20 }}>
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`tab ${isActive ? "active" : ""}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
