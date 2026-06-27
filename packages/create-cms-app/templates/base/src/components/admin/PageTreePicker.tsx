"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";

export type PagePickerItem = {
  id: string;
  title: string;
  permalink: string;
  locale?: string;
  parentId?: string | null;
};

type Props = {
  items: PagePickerItem[];
  value: string;
  onChange: (id: string) => void;
  /** Label for the "no selection" option. Pass null to hide it. */
  emptyLabel?: string | null;
  placeholder?: string;
  showLocale?: boolean;
};

type TreeNode = PagePickerItem & { depth: number };

function buildTree(items: PagePickerItem[]): TreeNode[] {
  const byParent = new Map<string | null, PagePickerItem[]>();
  for (const item of items) {
    const key = item.parentId ?? null;
    const list = byParent.get(key) ?? [];
    list.push(item);
    byParent.set(key, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: "base", numeric: true }),
    );
  }
  const result: TreeNode[] = [];
  function walk(parentId: string | null, depth: number) {
    for (const child of byParent.get(parentId) ?? []) {
      result.push({ ...child, depth });
      walk(child.id, depth + 1);
    }
  }
  walk(null, 0);
  return result;
}

type DropdownPos = { top: number; left: number; width: number };

export function PageTreePicker({
  items,
  value,
  onChange,
  emptyLabel = "/ (Site root)",
  placeholder = "Select a page…",
  showLocale = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pos, setPos] = useState<DropdownPos | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const tree = useMemo(() => buildTree(items), [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tree;
    return tree
      .filter((n) => n.title.toLowerCase().includes(q) || n.permalink.toLowerCase().includes(q))
      .map((n) => ({ ...n, depth: 0 }));
  }, [tree, search]);

  const selectedItem = value ? items.find((i) => i.id === value) : undefined;
  const displayLabel = value === ""
    ? (emptyLabel ?? placeholder)
    : (selectedItem?.title ?? placeholder);

  function openDropdown() {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
      width: rect.width,
    });
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function onScroll() {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX, width: rect.width });
      }
    }
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      // Check if click is inside portal dropdown
      const portal = document.getElementById("page-tree-picker-portal");
      if (portal?.contains(target)) return;
      setOpen(false);
    }
    window.addEventListener("scroll", onScroll, true);
    document.addEventListener("mousedown", onMouseDown);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setSearch("");
      setTimeout(() => searchRef.current?.focus(), 30);
    }
  }, [open]);

  function select(id: string) {
    onChange(id);
    setOpen(false);
  }

  const dropdown = open && pos ? (
    <div
      id="page-tree-picker-portal"
      style={{
        position: "absolute",
        top: pos.top,
        left: pos.left,
        width: Math.max(pos.width, 340),
        zIndex: 99999,
        background: "var(--surface, #fff)",
        border: "1px solid var(--border, #d1d5db)",
        borderRadius: 8,
        boxShadow: "0 8px 28px rgba(0,0,0,0.14)",
        overflow: "hidden",
      }}
    >
      {/* Search */}
      <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)" }}>
        <input
          ref={searchRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cerca…"
          style={{
            width: "100%",
            border: "1px solid var(--border)",
            borderRadius: 5,
            padding: "5px 9px",
            fontSize: "0.82rem",
            background: "var(--bg-light, #f9fafb)",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* List */}
      <div style={{ maxHeight: 320, overflowY: "auto" }}>
        {/* Empty option */}
        {emptyLabel !== null && (
          <button
            type="button"
            onClick={() => select("")}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 12px",
              background: value === "" ? "rgba(59,130,246,0.07)" : "transparent",
              border: "none",
              borderBottom: "1px solid var(--border)",
              cursor: "pointer",
              fontSize: "0.82rem",
              color: "var(--text-muted)",
              textAlign: "left",
            }}
          >
            <span style={{ width: 14, flexShrink: 0, color: "#2563eb", fontWeight: 700 }}>
              {value === "" ? "✓" : ""}
            </span>
            <span>{emptyLabel}</span>
          </button>
        )}

        {filtered.length === 0 && (
          <div style={{ padding: "12px", fontSize: "0.82rem", color: "var(--text-muted)", textAlign: "center" }}>
            Nessuna pagina trovata
          </div>
        )}

        {filtered.map((node) => {
          const isSelected = node.id === value;
          return (
            <button
              key={node.id}
              type="button"
              onClick={() => select(node.id)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: `6px 12px`,
                paddingLeft: 12 + node.depth * 18,
                background: isSelected ? "rgba(59,130,246,0.07)" : "transparent",
                border: "none",
                borderBottom: "1px solid var(--border, #f3f4f6)",
                cursor: "pointer",
                fontSize: "0.82rem",
                color: "var(--text)",
                textAlign: "left",
              }}
              onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "var(--bg-light, #f9fafb)"; }}
              onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
            >
              {/* Check */}
              <span style={{ width: 14, flexShrink: 0, color: "#2563eb", fontWeight: 700, fontSize: "0.8rem" }}>
                {isSelected ? "✓" : ""}
              </span>

              {/* Locale badge */}
              {showLocale && node.locale && (
                <span style={{
                  fontFamily: "monospace", fontSize: "0.66rem", fontWeight: 700,
                  background: "var(--bg-light)", color: "var(--text-muted)",
                  border: "1px solid var(--border)", borderRadius: 3,
                  padding: "0 5px", flexShrink: 0,
                }}>
                  {node.locale.toUpperCase()}
                </span>
              )}

              {/* Tree guide */}
              {node.depth > 0 && !search && (
                <span style={{ color: "var(--border)", fontSize: "0.75rem", flexShrink: 0, userSelect: "none" }}>└</span>
              )}

              {/* Title */}
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: isSelected ? 600 : 400 }}>
                {node.title}
              </span>

              {/* Permalink */}
              <span style={{
                fontFamily: "monospace", fontSize: "0.7rem",
                color: "var(--text-muted)", flexShrink: 0,
                maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {node.permalink}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  ) : null;

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => open ? setOpen(false) : openDropdown()}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "7px 10px",
          background: "var(--surface, #fff)",
          border: "1px solid var(--border, #d1d5db)",
          borderRadius: 6,
          fontSize: "0.875rem",
          color: selectedItem || value === "" ? "var(--text)" : "var(--text-muted)",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
          {showLocale && selectedItem?.locale && (
            <span style={{
              fontFamily: "monospace", fontSize: "0.7rem", fontWeight: 700,
              background: "rgba(59,130,246,0.1)", color: "#2563eb",
              border: "1px solid rgba(59,130,246,0.25)", borderRadius: 3,
              padding: "0 5px", marginRight: 6,
            }}>
              {selectedItem.locale.toUpperCase()}
            </span>
          )}
          {displayLabel}
        </span>
        <span style={{ flexShrink: 0, color: "var(--text-muted)", fontSize: "0.7rem" }}>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {typeof document !== "undefined" && createPortal(dropdown, document.body)}
    </div>
  );
}
