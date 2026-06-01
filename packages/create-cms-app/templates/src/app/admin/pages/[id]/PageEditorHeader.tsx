"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminEditorHeader } from "@/components/admin/AdminEditorHeader";

const TABS = [
  { label: "✏ Content",   suffix: "/content"   },
  { label: "⊞ Structure", suffix: "/structure" },
  { label: "⚙ Settings",  suffix: ""           },
];

interface Props {
  id:          string;
  title?:      string;
  isPublished?: boolean;
  actions?:    React.ReactNode;
}

export function PageEditorHeader({ id, title, actions }: Props) {
  const pathname = usePathname();
  const base     = `/admin/pages/${id}`;

  return (
    <AdminEditorHeader
      backHref="/admin/pages"
      backLabel="Pages"
      title={title}
      actions={actions}
      tabs={TABS.map((tab) => {
        const href     = `${base}${tab.suffix}`;
        const isActive = pathname === href;
        return (
          <Link key={href} href={href} prefetch={false} className={`tab ${isActive ? "active" : ""}`}>
            {tab.label}
          </Link>
        );
      })}
    />
  );
}
