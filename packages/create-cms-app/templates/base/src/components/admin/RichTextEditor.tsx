"use client";

import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import TextAlign from "@tiptap/extension-text-align";

const StyledBulletList = BulletList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      listStyleType: {
        default: "disc",
        parseHTML: (element) => element.style.listStyleType || element.getAttribute("data-list-style") || "disc",
        renderHTML: (attributes) => ({
          "data-list-style": attributes.listStyleType,
          style: `list-style-type: ${attributes.listStyleType};`,
        }),
      },
    };
  },
});

const StyledOrderedList = OrderedList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      listStyleType: {
        default: "decimal",
        parseHTML: (element) => element.style.listStyleType || element.getAttribute("data-list-style") || "decimal",
        renderHTML: (attributes) => ({
          "data-list-style": attributes.listStyleType,
          style: `list-style-type: ${attributes.listStyleType};`,
        }),
      },
    };
  },
});

const EMOJIS = ["😀", "😉", "😍", "👏", "🔥", "✅", "⭐", "🚀", "🎯", "💡", "📌", "📎"];

const TEXT_STYLE_OPTIONS = [
  { value: "paragraph", label: "Paragraph" },
  { value: "2", label: "Heading 2" },
  { value: "3", label: "Heading 3" },
  { value: "4", label: "Heading 4" },
  { value: "5", label: "Heading 5" },
] as const;

const ORDERED_LIST_OPTIONS = [
  { value: "decimal", label: "1. 2. 3." },
  { value: "lower-alpha", label: "a. b. c." },
  { value: "upper-alpha", label: "A. B. C." },
] as const;

const BULLET_LIST_OPTIONS = [
  { value: "disc", label: "Disc bullets" },
  { value: "circle", label: "Circle bullets" },
  { value: "square", label: "Square bullets" },
] as const;

const ALIGN_OPTIONS = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
  { value: "justify", label: "Justify" },
] as const;

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

type AssetKind = "image" | "video" | "file";
type MenuKind = "ordered" | "bullet" | "insert" | "emoji" | "align" | null;

export function RichTextEditor({ value, onChange, placeholder, minHeight = 160 }: RichTextEditorProps) {
  const [sourceMode, setSourceMode] = useState(false);
  const [sourceValue, setSourceValue] = useState(value || "");
  const [activeMenu, setActiveMenu] = useState<MenuKind>(null);
  const [uploading, setUploading] = useState<AssetKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toolbarRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
      }),
      StyledBulletList,
      StyledOrderedList,
      Link.configure({ openOnClick: false, HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setSourceValue(html);
      onChange(html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (current !== value) {
      editor.commands.setContent(value || "", { emitUpdate: false });
      setSourceValue(value || "");
    }
  }, [editor, value]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!toolbarRef.current?.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  if (!editor) return null;
  const editorInstance = editor;

  async function uploadAsset(file: File): Promise<string> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/admin/upload-asset", { method: "POST", body: form });
    const data = await res.json() as { url?: string; error?: string };
    if (!res.ok || !data.url) {
      throw new Error(data.error ?? "Upload failed");
    }
    return data.url;
  }

  async function handleAssetSelection(kind: AssetKind, file: File | null) {
    if (!file) return;
    setError(null);
    setUploading(kind);
    try {
      const url = await uploadAsset(file);
      if (kind === "image") {
        const alt = window.prompt("Alt text", "") ?? "";
        editorInstance.chain().focus().insertContent(`<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" style="max-width:100%;height:auto;" />`).run();
      } else if (kind === "video") {
        editorInstance.chain().focus().insertContent(`<video controls src="${escapeHtml(url)}" style="max-width:100%;height:auto;"></video>`).run();
      } else {
        const label = window.prompt("Attachment label", file.name) ?? file.name;
        editorInstance.chain().focus().insertContent(`<p><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" data-attachment="true">${escapeHtml(label)}</a></p>`).run();
      }
      setActiveMenu(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(null);
      if (imageInputRef.current) imageInputRef.current.value = "";
      if (videoInputRef.current) videoInputRef.current.value = "";
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function setLink() {
    const prev = editorInstance.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL", prev ?? "https://");
    if (url === null) return;
    if (!url) {
      editorInstance.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editorInstance.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  function applyTextStyle(next: string) {
    const chain = editorInstance.chain().focus();
    if (next === "paragraph") {
      chain.setParagraph().run();
      return;
    }
    chain.toggleHeading({ level: Number(next) as 1 | 2 | 3 | 4 | 5 | 6 }).run();
  }

  function applyOrderedListStyle(next: string) {
    const chain = editorInstance.chain().focus();
    if (!editorInstance.isActive("orderedList")) {
      chain.toggleOrderedList();
    }
    chain.updateAttributes("orderedList", { listStyleType: next }).run();
    setActiveMenu(null);
  }

  function applyBulletListStyle(next: string) {
    const chain = editorInstance.chain().focus();
    if (!editorInstance.isActive("bulletList")) {
      chain.toggleBulletList();
    }
    chain.updateAttributes("bulletList", { listStyleType: next }).run();
    setActiveMenu(null);
  }

  function applyAlign(next: string) {
    editorInstance.chain().focus().setTextAlign(next).run();
    setActiveMenu(null);
  }

  function insertCustomHtml() {
    const snippet = window.prompt("Custom HTML", "<div>Custom block</div>");
    if (!snippet) return;
    editorInstance.chain().focus().insertContent(snippet).run();
    setActiveMenu(null);
  }

  function toggleSourceMode() {
    if (sourceMode) {
      editorInstance.commands.setContent(sourceValue || "", { emitUpdate: false });
      onChange(sourceValue || "");
    } else {
      setSourceValue(editorInstance.getHTML());
      setActiveMenu(null);
    }
    setSourceMode((current) => !current);
  }

  function handleSourceChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const next = event.target.value;
    setSourceValue(next);
    onChange(next);
  }

  function toggleMenu(menu: Exclude<MenuKind, null>) {
    setActiveMenu((current) => (current === menu ? null : menu));
  }

  const currentTextStyle =
    editor.isActive("heading", { level: 2 }) ? "2" :
    editor.isActive("heading", { level: 3 }) ? "3" :
    editor.isActive("heading", { level: 4 }) ? "4" :
    editor.isActive("heading", { level: 5 }) ? "5" :
    "paragraph";

  const currentOrderedStyle = (editorInstance.getAttributes("orderedList").listStyleType as string | undefined) ?? "decimal";
  const currentBulletStyle = (editorInstance.getAttributes("bulletList").listStyleType as string | undefined) ?? "disc";
  const currentAlignment =
    editor.isActive({ textAlign: "justify" }) ? "justify" :
    editor.isActive({ textAlign: "right" }) ? "right" :
    editor.isActive({ textAlign: "center" }) ? "center" :
    "left";

  const currentOrderedLabel = ORDERED_LIST_OPTIONS.find((option) => option.value === currentOrderedStyle)?.label ?? "1. 2. 3.";
  const currentBulletLabel = BULLET_LIST_OPTIONS.find((option) => option.value === currentBulletStyle)?.label ?? "Disc bullets";
  const currentAlignLabel = ALIGN_OPTIONS.find((option) => option.value === currentAlignment)?.label ?? "Left";

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", position: "relative", background: "#fff" }}>
      <style>{`
        .rich-editor .ProseMirror { min-height: ${minHeight}px; outline: none; }
        .rich-editor .ProseMirror p { margin: 0 0 0.9rem; }
        .rich-editor .ProseMirror h2,
        .rich-editor .ProseMirror h3,
        .rich-editor .ProseMirror h4,
        .rich-editor .ProseMirror h5 { margin: 1.2rem 0 0.7rem; line-height: 1.2; }
        .rich-editor .ProseMirror ul,
        .rich-editor .ProseMirror ol { padding-left: 1.5rem; margin: 0.7rem 0; }
        .rich-editor .ProseMirror blockquote { border-left: 3px solid var(--border); margin: 1rem 0; padding-left: 1rem; color: var(--text-muted); }
        .rich-editor .ProseMirror pre { background: #0f172a; color: #e2e8f0; padding: 0.85rem 1rem; border-radius: 8px; overflow-x: auto; }
        .rich-editor .ProseMirror hr { border: 0; border-top: 1px solid var(--border); margin: 1rem 0; }
        .rich-editor .ProseMirror img,
        .rich-editor .ProseMirror video { display: block; max-width: 100%; border-radius: 6px; margin: 0.8rem 0; }
        .rich-editor .ProseMirror a[data-attachment="true"] { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.35rem 0.55rem; border: 1px solid var(--border); border-radius: 999px; text-decoration: none; }
      `}</style>

      <div
        ref={toolbarRef}
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          padding: "10px 12px",
          borderBottom: "1px solid var(--border)",
          background: "linear-gradient(180deg, #fbfdff 0%, #f3f7fb 100%)",
          alignItems: "center",
        }}
      >
        <ToolbarGroup grow>
          <select
            value={currentTextStyle}
            onChange={(event) => applyTextStyle(event.target.value)}
            className="form-control"
            style={{
              ...menuButtonStyle(false),
              width: 156,
              border: "1px solid rgba(148, 163, 184, 0.28)",
              background: "rgba(255,255,255,0.94)",
              boxShadow: "none",
            }}
          >
            {TEXT_STYLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </ToolbarGroup>

        <ToolbarGroup>
          <ToolbarButton active={editor.isActive("bold")} label="Bold" onMouseDown={(event) => { event.preventDefault(); editor.chain().focus().toggleBold().run(); }}>
            <BoldIcon />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive("italic")} label="Italic" onMouseDown={(event) => { event.preventDefault(); editor.chain().focus().toggleItalic().run(); }}>
            <ItalicIcon />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive("strike")} label="Strike" onMouseDown={(event) => { event.preventDefault(); editor.chain().focus().toggleStrike().run(); }}>
            <StrikeIcon />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive("link")} label="Link" onMouseDown={(event) => { event.preventDefault(); setLink(); }}>
            <LinkIcon />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarGroup>
          <ToolbarMenu
            active={activeMenu === "ordered" || editor.isActive("orderedList")}
            label={currentOrderedLabel}
            icon={<OrderedListIcon />}
            onToggle={() => toggleMenu("ordered")}
          >
            {ORDERED_LIST_OPTIONS.map((option) => (
              <MenuOptionButton
                key={option.value}
                active={editor.isActive("orderedList") && currentOrderedStyle === option.value}
                onMouseDown={(event) => {
                  event.preventDefault();
                  applyOrderedListStyle(option.value);
                }}
              >
                <MenuRow icon={<OrderedListIcon />} label={option.label} />
              </MenuOptionButton>
            ))}
          </ToolbarMenu>

          <ToolbarMenu
            active={activeMenu === "bullet" || editor.isActive("bulletList")}
            label={currentBulletLabel}
            icon={<BulletListIcon />}
            onToggle={() => toggleMenu("bullet")}
          >
            {BULLET_LIST_OPTIONS.map((option) => (
              <MenuOptionButton
                key={option.value}
                active={editor.isActive("bulletList") && currentBulletStyle === option.value}
                onMouseDown={(event) => {
                  event.preventDefault();
                  applyBulletListStyle(option.value);
                }}
              >
                <MenuRow icon={<BulletListIcon />} label={option.label} />
              </MenuOptionButton>
            ))}
          </ToolbarMenu>

          <ToolbarButton active={false} label="Divider" onMouseDown={(event) => { event.preventDefault(); editor.chain().focus().setHorizontalRule().run(); }}>
            <DividerIcon />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarGroup>
          <ToolbarButton active={editor.isActive("blockquote")} label="Quote" onMouseDown={(event) => { event.preventDefault(); editor.chain().focus().toggleBlockquote().run(); }}>
            <QuoteIcon />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive("codeBlock")} label="Code block" onMouseDown={(event) => { event.preventDefault(); editor.chain().focus().toggleCodeBlock().run(); }}>
            <CodeIcon />
          </ToolbarButton>
          <ToolbarButton active={sourceMode} label="Source mode" onMouseDown={(event) => { event.preventDefault(); toggleSourceMode(); }}>
            <SourceIcon />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarGroup>
          <ToolbarMenu
            active={activeMenu === "insert" || uploading !== null}
            label="Insert"
            icon={<InsertIcon />}
            onToggle={() => toggleMenu("insert")}
          >
            <MenuOptionButton
              active={false}
              onMouseDown={(event) => {
                event.preventDefault();
                imageInputRef.current?.click();
              }}
            >
              <MenuRow icon={<ImageIcon />} label={uploading === "image" ? "Uploading image..." : "Image"} />
            </MenuOptionButton>
            <MenuOptionButton
              active={false}
              onMouseDown={(event) => {
                event.preventDefault();
                videoInputRef.current?.click();
              }}
            >
              <MenuRow icon={<VideoIcon />} label={uploading === "video" ? "Uploading video..." : "Video"} />
            </MenuOptionButton>
            <MenuOptionButton
              active={false}
              onMouseDown={(event) => {
                event.preventDefault();
                fileInputRef.current?.click();
              }}
            >
              <MenuRow icon={<AttachmentIcon />} label={uploading === "file" ? "Uploading file..." : "Attachment"} />
            </MenuOptionButton>
            <MenuOptionButton
              active={false}
              onMouseDown={(event) => {
                event.preventDefault();
                insertCustomHtml();
              }}
            >
              <MenuRow icon={<SourceIcon />} label="Custom HTML" />
            </MenuOptionButton>
          </ToolbarMenu>

          <ToolbarMenu
            active={activeMenu === "emoji"}
            label="Emoji"
            icon={<EmojiIcon />}
            onToggle={() => toggleMenu("emoji")}
            panelStyle={{ width: 228 }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 6 }}>
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  title={emoji}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    editorInstance.chain().focus().insertContent(emoji).run();
                    setActiveMenu(null);
                  }}
                  style={{
                    border: "1px solid rgba(148, 163, 184, 0.22)",
                    borderRadius: 10,
                    background: "#fff",
                    cursor: "pointer",
                    fontSize: "1.05rem",
                    padding: "7px 0",
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </ToolbarMenu>

          <ToolbarMenu
            active={activeMenu === "align" || currentAlignment !== "left"}
            label={currentAlignLabel}
            icon={<AlignIcon />}
            onToggle={() => toggleMenu("align")}
          >
            {ALIGN_OPTIONS.map((option) => (
              <MenuOptionButton
                key={option.value}
                active={currentAlignment === option.value}
                onMouseDown={(event) => {
                  event.preventDefault();
                  applyAlign(option.value);
                }}
              >
                <MenuRow icon={<AlignIcon />} label={option.label} />
              </MenuOptionButton>
            ))}
          </ToolbarMenu>
        </ToolbarGroup>
      </div>

      <input ref={imageInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(event) => void handleAssetSelection("image", event.target.files?.[0] ?? null)} />
      <input ref={videoInputRef} type="file" accept="video/*" style={{ display: "none" }} onChange={(event) => void handleAssetSelection("video", event.target.files?.[0] ?? null)} />
      <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={(event) => void handleAssetSelection("file", event.target.files?.[0] ?? null)} />

      {error && (
        <div style={{ padding: "8px 12px", color: "var(--danger)", fontSize: "0.78rem", borderBottom: "1px solid var(--border)" }}>
          {error}
        </div>
      )}

      <div className="rich-editor" style={{ position: "relative" }}>
        {sourceMode ? (
          <textarea
            className="form-control"
            value={sourceValue}
            onChange={handleSourceChange}
            placeholder={placeholder}
            style={{ minHeight, border: 0, borderRadius: 0, padding: "12px", fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace", fontSize: "0.82rem", resize: "vertical" }}
          />
        ) : (
          <div style={{ position: "relative" }}>
            {editor.isEmpty && placeholder && (
              <span style={{ position: "absolute", top: 10, left: 12, color: "var(--text-muted, #9ca3af)", fontSize: "0.9rem", pointerEvents: "none", userSelect: "none" }}>
                {placeholder}
              </span>
            )}
            <EditorContent editor={editorInstance} style={{ minHeight, padding: "12px", outline: "none", fontSize: "0.9rem" }} />
          </div>
        )}
      </div>
    </div>
  );
}

function ToolbarGroup({ children, grow = false }: { children: ReactNode; grow?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        flexWrap: "wrap",
        marginRight: 2,
        flexGrow: grow ? 1 : 0,
      }}
    >
      {children}
    </div>
  );
}

function ToolbarButton({
  active,
  children,
  label,
  onMouseDown,
}: {
  active: boolean;
  children: ReactNode;
  label: string;
  onMouseDown: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button type="button" title={label} aria-label={label} style={toolbarButtonStyle(active)} onMouseDown={onMouseDown}>
      {children}
    </button>
  );
}

function ToolbarMenu({
  active,
  children,
  label,
  icon,
  onToggle,
  panelStyle,
}: {
  active: boolean;
  children: ReactNode;
  label: string;
  icon?: ReactNode;
  onToggle: () => void;
  panelStyle?: CSSProperties;
}) {
  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        title={label}
        aria-label={label}
        aria-expanded={active}
        style={menuButtonStyle(active)}
        onMouseDown={(event) => {
          event.preventDefault();
          onToggle();
        }}
      >
        {icon && <span style={{ display: "inline-flex", color: "currentColor" }}>{icon}</span>}
        <span>{label}</span>
        <span style={{ fontSize: "0.72rem", opacity: 0.72 }}>v</span>
      </button>
      {active && (
        <div style={{ ...menuPanelStyle, ...panelStyle }}>
          {children}
        </div>
      )}
    </div>
  );
}

function MenuOptionButton({
  active,
  children,
  onMouseDown,
}: {
  active: boolean;
  children: ReactNode;
  onMouseDown: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button type="button" style={menuOptionStyle(active)} onMouseDown={onMouseDown}>
      {children}
    </button>
  );
}

function MenuRow({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span style={{ display: "inline-flex", color: "currentColor" }}>{icon}</span>
      <span>{label}</span>
    </span>
  );
}

function toolbarButtonStyle(active: boolean): CSSProperties {
  return {
    minWidth: 40,
    width: 40,
    height: 40,
    padding: 0,
    fontSize: "0.78rem",
    fontWeight: active ? 700 : 600,
    cursor: "pointer",
    border: "1px solid rgba(148, 163, 184, 0.24)",
    borderRadius: 12,
    background: active ? "linear-gradient(180deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 78%, #0f172a 22%) 100%)" : "rgba(255,255,255,0.94)",
    color: active ? "#fff" : "var(--text)",
    boxShadow: active ? "0 8px 18px rgba(37, 99, 235, 0.18)" : "0 1px 2px rgba(15, 23, 42, 0.04)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };
}

function menuButtonStyle(active: boolean): CSSProperties {
  return {
    height: 36,
    padding: "0 12px",
    fontSize: "0.78rem",
    fontWeight: 600,
    cursor: "pointer",
    border: "1px solid rgba(148, 163, 184, 0.24)",
    borderRadius: 12,
    background: active ? "linear-gradient(180deg, rgba(37,99,235,0.12) 0%, rgba(37,99,235,0.04) 100%)" : "rgba(255,255,255,0.94)",
    color: "var(--text)",
    display: "inline-flex",
    alignItems: "center",
    gap: 9,
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
  };
}

const menuPanelStyle: CSSProperties = {
  position: "absolute",
  top: 42,
  left: 0,
  zIndex: 10,
  minWidth: 190,
  display: "grid",
  gap: 6,
  padding: 8,
  background: "#fff",
  border: "1px solid rgba(148, 163, 184, 0.2)",
  borderRadius: 12,
  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.14)",
};

function menuOptionStyle(active: boolean): CSSProperties {
  return {
    width: "100%",
    padding: "8px 10px",
    fontSize: "0.8rem",
    fontWeight: active ? 700 : 500,
    cursor: "pointer",
    border: "1px solid transparent",
    borderRadius: 9,
    background: active ? "rgba(37, 99, 235, 0.12)" : "#fff",
    color: "var(--text)",
    textAlign: "left",
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function IconBase({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

function BoldIcon() {
  return <IconBase><path d="M6 4h5a3 3 0 0 1 0 6H6z" /><path d="M6 10h6a3 3 0 0 1 0 6H6z" /></IconBase>;
}

function ItalicIcon() {
  return <IconBase><path d="M11 4h4" /><path d="M5 16h4" /><path d="M12 4 8 16" /></IconBase>;
}

function StrikeIcon() {
  return <IconBase><path d="M4 10h12" /><path d="M7 5.5c.6-1 1.8-1.5 3.2-1.5 2 0 3.3 1 3.3 2.5 0 3-6.5 1.7-6.5 5 0 1.4 1.3 2.5 3.5 2.5 1.6 0 2.9-.5 3.8-1.5" /></IconBase>;
}

function LinkIcon() {
  return <IconBase><path d="M8 12 6.5 13.5a3 3 0 1 1-4.2-4.2L5 6.6" /><path d="M12 8l1.5-1.5a3 3 0 1 1 4.2 4.2L15 13.4" /><path d="M7 13 13 7" /></IconBase>;
}

function OrderedListIcon() {
  return <IconBase><path d="M8 5h8" /><path d="M8 10h8" /><path d="M8 15h8" /><path d="M3.5 5h1v3" /><path d="M3 15h2" /><path d="M3.2 10.5c.2-.8.8-1.5 1.8-1.5 1 0 1.6.6 1.6 1.4 0 1.6-2.3 1.6-2.3 3.1H6.8" /></IconBase>;
}

function BulletListIcon() {
  return <IconBase><circle cx="4" cy="5" r="1.1" fill="currentColor" stroke="none" /><circle cx="4" cy="10" r="1.1" fill="currentColor" stroke="none" /><circle cx="4" cy="15" r="1.1" fill="currentColor" stroke="none" /><path d="M8 5h8" /><path d="M8 10h8" /><path d="M8 15h8" /></IconBase>;
}

function DividerIcon() {
  return <IconBase><path d="M3 10h14" /><path d="M6 6h8" /><path d="M6 14h8" /></IconBase>;
}

function QuoteIcon() {
  return <IconBase><path d="M6.5 7.5A2.5 2.5 0 0 0 4 10v2.5A1.5 1.5 0 0 0 5.5 14H8v-3H6.2c0-1.7 1-2.8 2.3-3.5z" /><path d="M13.5 7.5A2.5 2.5 0 0 0 11 10v2.5a1.5 1.5 0 0 0 1.5 1.5H15v-3h-1.8c0-1.7 1-2.8 2.3-3.5z" /></IconBase>;
}

function CodeIcon() {
  return <IconBase><path d="m7 6-4 4 4 4" /><path d="m13 6 4 4-4 4" /><path d="M11 4 9 16" /></IconBase>;
}

function SourceIcon() {
  return <IconBase><path d="M4 4h12v12H4z" /><path d="m7 8-2 2 2 2" /><path d="m13 8 2 2-2 2" /></IconBase>;
}

function InsertIcon() {
  return <IconBase><path d="M10 4v12" /><path d="M4 10h12" /></IconBase>;
}

function ImageIcon() {
  return <IconBase><rect x="3.5" y="4.5" width="13" height="11" rx="2" /><circle cx="8" cy="8" r="1.2" /><path d="m6 13 2.5-2.5L11 13l2-2 2 2" /></IconBase>;
}

function VideoIcon() {
  return <IconBase><rect x="3" y="5" width="10" height="10" rx="2" /><path d="m13 8 4-2v8l-4-2z" /></IconBase>;
}

function AttachmentIcon() {
  return <IconBase><path d="M7 10.5 11.8 5.7a2.5 2.5 0 1 1 3.5 3.5l-6 6a4 4 0 0 1-5.7-5.7l6-6" /></IconBase>;
}

function EmojiIcon() {
  return <IconBase><circle cx="10" cy="10" r="7" /><path d="M7.5 8h.01" /><path d="M12.5 8h.01" /><path d="M7.5 12.5c.8 1 1.8 1.5 2.5 1.5s1.7-.5 2.5-1.5" /></IconBase>;
}

function AlignIcon() {
  return <IconBase><path d="M4 5h12" /><path d="M6 8.5h8" /><path d="M3 12h14" /><path d="M5 15.5h10" /></IconBase>;
}
