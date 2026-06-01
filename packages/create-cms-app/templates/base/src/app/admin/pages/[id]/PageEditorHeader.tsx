"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminEditorHeader } from "@/components/admin/AdminEditorHeader";

const TABS = [
  { label: "✏ Content",   suffix: "/content"   },
  { label: "⚙ Settings",  suffix: ""           },
];

interface Props {
  id:          string;
  title?:      string;
  isPublished?: boolean;
  badge?:      React.ReactNode;
  actions?:    React.ReactNode;
}

export function PageEditorHeader({ id, title, badge, actions }: Props) {
  const pathname = usePathname();
  const base     = `/admin/pages/${id}`;

  return (
    <AdminEditorHeader
      backHref="/admin/pages"
      backLabel="Pages"
      title={title}
      badge={badge}
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
