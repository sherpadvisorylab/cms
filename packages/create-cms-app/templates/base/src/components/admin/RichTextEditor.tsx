"use client";

import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import { MediaLibraryModal } from "./MediaLibraryModal";
import {
  ALIGN_OPTIONS,
  BULLET_LIST_OPTIONS,
  EMOJIS,
  ORDERED_LIST_OPTIONS,
  TEXT_STYLE_OPTIONS,
} from "./rich-text/config";
import {
  insertAssetFromLibrary,
  insertCustomHtml,
  insertDivider,
  insertEmoji,
  insertUploadedAsset,
  setBulletListStyle,
  setLink,
  setOrderedListStyle,
  setTextAlignment,
  setTextStyle,
  toggleBlockquote,
  toggleBold,
  toggleCodeBlock,
  toggleItalic,
  toggleStrike,
} from "./rich-text/commands";
import { richTextExtensions } from "./rich-text/extensions";
import { DEFAULT_TOOLBAR_STATE, resolveToolbarState } from "./rich-text/state";
import type {
  AssetKind,
  MenuKind,
  OrderedListStyle,
  BulletListStyle,
  TextStyleValue,
  AlignmentValue,
} from "./rich-text/types";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export function RichTextEditor({ value, onChange, placeholder, minHeight = 160 }: RichTextEditorProps) {
  const [sourceMode, setSourceMode] = useState(false);
  const [sourceValue, setSourceValue] = useState(value || "");
  const [activeMenu, setActiveMenu] = useState<MenuKind>(null);
  const [assetBrowserKind, setAssetBrowserKind] = useState<AssetKind | null>(null);
  const [uploadingKind, setUploadingKind] = useState<AssetKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toolbarRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    // Monorepo installs can duplicate Tiptap type declarations across workspaces.
    // The runtime extensions are valid; we narrow the type here to keep the shared editor portable.
    extensions: richTextExtensions as never[],
    content: value || "",
    editorProps: {
      handleClick(_view, _pos, event) {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return false;

        const anchor = target.closest("a[href]");
        if (!(anchor instanceof HTMLAnchorElement)) return false;

        event.preventDefault();

        if (event.ctrlKey || event.metaKey) {
          window.open(anchor.href, "_blank", "noopener,noreferrer");
        }

        return true;
      },
    },
    onUpdate: ({ editor: instance }) => {
      const html = instance.getHTML();
      setSourceValue(html);
      onChange(html);
    },
  });

  const toolbarState = useEditorState({
    editor,
    selector: ({ editor: instance }) => resolveToolbarState(instance),
  }) ?? DEFAULT_TOOLBAR_STATE;

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
  const activeEditor = editor;

  function closeMenu() {
    setActiveMenu(null);
  }

  function openAssetBrowser(kind: AssetKind) {
    setError(null);
    setAssetBrowserKind(kind);
    closeMenu();
  }

  function handleAssetLibrarySelect(url: string, label?: string) {
    if (!assetBrowserKind) return;
    insertAssetFromLibrary(activeEditor, assetBrowserKind, url, label);
    setAssetBrowserKind(null);
  }

  async function handleAssetUpload(kind: AssetKind, file: File | null) {
    if (!file) return;
    setError(null);
    setUploadingKind(kind);
    try {
      await insertUploadedAsset(activeEditor, kind, file);
      closeMenu();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingKind(null);
      if (imageInputRef.current) imageInputRef.current.value = "";
      if (videoInputRef.current) videoInputRef.current.value = "";
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function toggleSourceMode() {
    if (sourceMode) {
      activeEditor.commands.setContent(sourceValue || "", { emitUpdate: false });
      onChange(sourceValue || "");
    } else {
      setSourceValue(activeEditor.getHTML());
      closeMenu();
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

  const currentOrderedLabel =
    ORDERED_LIST_OPTIONS.find((option) => option.value === toolbarState.lists.orderedStyle)?.label ?? "1. 2. 3.";
  const currentBulletLabel =
    BULLET_LIST_OPTIONS.find((option) => option.value === toolbarState.lists.bulletStyle)?.label ?? "Disc bullets";
  const currentAlignLabel =
    ALIGN_OPTIONS.find((option) => option.value === toolbarState.alignment)?.label ?? "Left";
  const showPlaceholder = Boolean(placeholder) && activeEditor.isEmpty;

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", position: "relative", background: "#fff" }}>
      <style>{`
        .rich-editor .ProseMirror {
          min-height: ${minHeight}px;
          outline: none;
          color: #0f172a;
          line-height: 1.65;
          font-size: 1rem;
          text-rendering: optimizeLegibility;
        }
        .rich-editor .ProseMirror > *:first-child { margin-top: 0; }
        .rich-editor .ProseMirror > *:last-child { margin-bottom: 0; }
        .rich-editor .ProseMirror p {
          margin: 0 0 0.9rem;
          font-size: 1rem;
          line-height: 1.75;
          font-weight: 400;
        }
        .rich-editor .ProseMirror h1,
        .rich-editor .ProseMirror h2,
        .rich-editor .ProseMirror h3,
        .rich-editor .ProseMirror h4,
        .rich-editor .ProseMirror h5 { margin: 1.2rem 0 0.7rem; line-height: 1.2; font-weight: 700; letter-spacing: -0.02em; color: #0f172a; }
        .rich-editor .ProseMirror h1 { font-size: 2.25rem; line-height: 1.05; margin-top: 1.8rem; }
        .rich-editor .ProseMirror h2 { font-size: 1.875rem; line-height: 1.1; margin-top: 1.6rem; }
        .rich-editor .ProseMirror h3 { font-size: 1.5rem; line-height: 1.2; margin-top: 1.4rem; }
        .rich-editor .ProseMirror h4 { font-size: 1.25rem; line-height: 1.3; margin-top: 1.2rem; }
        .rich-editor .ProseMirror h5 { font-size: 1.075rem; line-height: 1.4; margin-top: 1.05rem; text-transform: uppercase; letter-spacing: 0.03em; }
        .rich-editor .ProseMirror strong { font-weight: 700; color: #020617; }
        .rich-editor .ProseMirror em { font-style: italic; }
        .rich-editor .ProseMirror s { opacity: 0.8; }
        .rich-editor .ProseMirror ul,
        .rich-editor .ProseMirror ol { padding-left: 1.65rem; margin: 0.8rem 0 1rem; }
        .rich-editor .ProseMirror ul ul,
        .rich-editor .ProseMirror ul ol,
        .rich-editor .ProseMirror ol ul,
        .rich-editor .ProseMirror ol ol { margin: 0.45rem 0 0.35rem; }
        .rich-editor .ProseMirror li { margin: 0.3rem 0; padding-left: 0.15rem; }
        .rich-editor .ProseMirror li > p { margin: 0.2rem 0 0.45rem; }
        .rich-editor .ProseMirror blockquote {
          border-left: 4px solid color-mix(in srgb, var(--primary, #2563eb) 45%, #cbd5e1 55%);
          margin: 1.15rem 0;
          padding: 0.1rem 0 0.1rem 1rem;
          color: #475569;
          background: linear-gradient(90deg, rgba(37, 99, 235, 0.06) 0%, rgba(255,255,255,0) 100%);
        }
        .rich-editor .ProseMirror code {
          font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
          font-size: 0.9em;
          background: #eff3f8;
          color: #0f172a;
          border: 1px solid #dbe4ee;
          border-radius: 6px;
          padding: 0.12rem 0.38rem;
        }
        .rich-editor .ProseMirror pre {
          background: #0f172a;
          color: #e2e8f0;
          padding: 0.95rem 1.05rem;
          border-radius: 10px;
          overflow-x: auto;
          margin: 1rem 0 1.15rem;
          box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.14);
        }
        .rich-editor .ProseMirror pre code {
          background: transparent;
          color: inherit;
          border: 0;
          padding: 0;
          font-size: 0.92rem;
        }
        .rich-editor .ProseMirror hr { border: 0; border-top: 1px solid var(--border); margin: 1rem 0; }
        .rich-editor .ProseMirror img,
        .rich-editor .ProseMirror video {
          display: block;
          max-width: min(100%, 860px);
          height: auto;
          border-radius: 10px;
          margin: 1rem 0 1.15rem;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06), 0 0 0 1px rgba(148, 163, 184, 0.18);
          background: #f8fafc;
        }
        .rich-editor .ProseMirror .tableWrapper { margin: 0.9rem 0; overflow-x: auto; }
        .rich-editor .ProseMirror table { width: 100%; border-collapse: collapse; }
        .rich-editor .ProseMirror th,
        .rich-editor .ProseMirror td { border: 1px solid var(--border); padding: 0.55rem 0.7rem; vertical-align: top; }
        .rich-editor .ProseMirror th { background: #f8fafc; font-weight: 700; }
        .rich-editor .ProseMirror a[href]:not([data-attachment="true"]) {
          color: color-mix(in srgb, var(--primary, #2563eb) 86%, #0f172a 14%);
          text-decoration: underline;
          text-decoration-thickness: 1.5px;
          text-underline-offset: 0.16em;
          text-decoration-color: color-mix(in srgb, var(--primary, #2563eb) 45%, transparent 55%);
          font-weight: 500;
        }
        .rich-editor .ProseMirror a[href]:not([data-attachment="true"]):hover {
          color: color-mix(in srgb, var(--primary, #2563eb) 100%, #020617 0%);
          text-decoration-thickness: 2px;
        }
        .rich-editor .ProseMirror a[data-attachment="true"] {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.35rem 0.55rem;
          border: 1px solid var(--border);
          border-radius: 999px;
          text-decoration: none;
          background: #f8fafc;
          color: #0f172a;
          font-weight: 600;
        }
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
            value={toolbarState.blocks.textStyle}
            onChange={(event) => setTextStyle(activeEditor, event.target.value as TextStyleValue)}
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
          <ToolbarButton active={toolbarState.marks.bold} label="Bold" onMouseDown={(event) => { event.preventDefault(); toggleBold(activeEditor); }}>
            <BoldIcon />
          </ToolbarButton>
          <ToolbarButton active={toolbarState.marks.italic} label="Italic" onMouseDown={(event) => { event.preventDefault(); toggleItalic(activeEditor); }}>
            <ItalicIcon />
          </ToolbarButton>
          <ToolbarButton active={toolbarState.marks.strike} label="Strike" onMouseDown={(event) => { event.preventDefault(); toggleStrike(activeEditor); }}>
            <StrikeIcon />
          </ToolbarButton>
          <ToolbarButton active={toolbarState.marks.link} label="Link" onMouseDown={(event) => { event.preventDefault(); setLink(activeEditor); }}>
            <LinkIcon />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarGroup>
          <ToolbarMenu
            active={toolbarState.lists.ordered}
            open={activeMenu === "ordered"}
            label={currentOrderedLabel}
            icon={<OrderedListIcon />}
            onToggle={() => toggleMenu("ordered")}
          >
            {ORDERED_LIST_OPTIONS.map((option) => (
              <MenuOptionButton
                key={option.value}
                active={toolbarState.lists.ordered && toolbarState.lists.orderedStyle === option.value}
                onMouseDown={(event) => {
                  event.preventDefault();
                  setOrderedListStyle(activeEditor, option.value as OrderedListStyle);
                  closeMenu();
                }}
              >
                <MenuRow icon={<OrderedListIcon />} label={option.label} />
              </MenuOptionButton>
            ))}
          </ToolbarMenu>

          <ToolbarMenu
            active={toolbarState.lists.bullet}
            open={activeMenu === "bullet"}
            label={currentBulletLabel}
            icon={<BulletListIcon />}
            onToggle={() => toggleMenu("bullet")}
          >
            {BULLET_LIST_OPTIONS.map((option) => (
              <MenuOptionButton
                key={option.value}
                active={toolbarState.lists.bullet && toolbarState.lists.bulletStyle === option.value}
                onMouseDown={(event) => {
                  event.preventDefault();
                  setBulletListStyle(activeEditor, option.value as BulletListStyle);
                  closeMenu();
                }}
              >
                <MenuRow icon={<BulletListIcon />} label={option.label} />
              </MenuOptionButton>
            ))}
          </ToolbarMenu>

          <ToolbarButton active={false} label="Divider" onMouseDown={(event) => { event.preventDefault(); insertDivider(activeEditor); }}>
            <DividerIcon />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarGroup>
          <ToolbarButton active={toolbarState.blocks.blockquote} label="Quote" onMouseDown={(event) => { event.preventDefault(); toggleBlockquote(activeEditor); }}>
            <QuoteIcon />
          </ToolbarButton>
          <ToolbarButton active={toolbarState.blocks.codeBlock} label="Code block" onMouseDown={(event) => { event.preventDefault(); toggleCodeBlock(activeEditor); }}>
            <CodeIcon />
          </ToolbarButton>
          <ToolbarButton active={sourceMode} label="Source mode" onMouseDown={(event) => { event.preventDefault(); toggleSourceMode(); }}>
            <SourceIcon />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarGroup>
          <ToolbarMenu
            active={assetBrowserKind !== null || uploadingKind !== null}
            open={activeMenu === "insert"}
            label="Insert"
            icon={<InsertIcon />}
            onToggle={() => toggleMenu("insert")}
          >
            <MenuActionRow
              label={uploadingKind === "image" ? "Uploading image..." : "Image"}
              icon={<ImageIcon />}
              onPrimaryMouseDown={(event) => {
                event.preventDefault();
                imageInputRef.current?.click();
              }}
              onSecondaryMouseDown={(event) => {
                event.preventDefault();
                openAssetBrowser("image");
              }}
            />
            <MenuActionRow
              label={uploadingKind === "video" ? "Uploading video..." : "Video"}
              icon={<VideoIcon />}
              onPrimaryMouseDown={(event) => {
                event.preventDefault();
                videoInputRef.current?.click();
              }}
              onSecondaryMouseDown={(event) => {
                event.preventDefault();
                openAssetBrowser("video");
              }}
            />
            <MenuActionRow
              label={uploadingKind === "file" ? "Uploading attachment..." : "Attachment"}
              icon={<AttachmentIcon />}
              onPrimaryMouseDown={(event) => {
                event.preventDefault();
                fileInputRef.current?.click();
              }}
              onSecondaryMouseDown={(event) => {
                event.preventDefault();
                openAssetBrowser("file");
              }}
            />
            <MenuOptionButton
              active={false}
              onMouseDown={(event) => {
                event.preventDefault();
                insertCustomHtml(activeEditor);
                closeMenu();
              }}
            >
              <MenuRow icon={<SourceIcon />} label="Custom HTML" />
            </MenuOptionButton>
          </ToolbarMenu>

          <ToolbarMenu
            active={false}
            open={activeMenu === "emoji"}
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
                    insertEmoji(activeEditor, emoji);
                    closeMenu();
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
            active={toolbarState.alignment !== "left"}
            open={activeMenu === "align"}
            label={currentAlignLabel}
            icon={<AlignIcon />}
            onToggle={() => toggleMenu("align")}
          >
            {ALIGN_OPTIONS.map((option) => (
              <MenuOptionButton
                key={option.value}
                active={toolbarState.alignment === option.value}
                onMouseDown={(event) => {
                  event.preventDefault();
                  setTextAlignment(activeEditor, option.value as AlignmentValue);
                  closeMenu();
                }}
              >
                <MenuRow icon={<AlignIcon />} label={option.label} />
              </MenuOptionButton>
            ))}
          </ToolbarMenu>
        </ToolbarGroup>
      </div>

      <input ref={imageInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(event) => void handleAssetUpload("image", event.target.files?.[0] ?? null)} />
      <input ref={videoInputRef} type="file" accept="video/*" style={{ display: "none" }} onChange={(event) => void handleAssetUpload("video", event.target.files?.[0] ?? null)} />
      <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={(event) => void handleAssetUpload("file", event.target.files?.[0] ?? null)} />

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
            {showPlaceholder && (
              <span style={{ position: "absolute", top: 10, left: 12, color: "var(--text-muted, #9ca3af)", fontSize: "0.9rem", pointerEvents: "none", userSelect: "none" }}>
                {placeholder}
              </span>
            )}
            <EditorContent editor={activeEditor} style={{ minHeight, padding: "12px", outline: "none", fontSize: "0.9rem" }} />
          </div>
        )}
      </div>

      {assetBrowserKind && (
        <MediaLibraryModal
          filter={assetBrowserKind}
          onSelect={handleAssetLibrarySelect}
          onClose={() => setAssetBrowserKind(null)}
        />
      )}
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
  open,
  children,
  label,
  icon,
  onToggle,
  panelStyle,
}: {
  active: boolean;
  open: boolean;
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
        aria-expanded={open}
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
      {open && (
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

function MenuActionRow({
  icon,
  label,
  onPrimaryMouseDown,
  onSecondaryMouseDown,
}: {
  icon: ReactNode;
  label: string;
  onPrimaryMouseDown: (event: MouseEvent<HTMLButtonElement>) => void;
  onSecondaryMouseDown: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 40px", gap: 6 }}>
      <MenuOptionButton active={false} onMouseDown={onPrimaryMouseDown}>
        <MenuRow icon={icon} label={label} />
      </MenuOptionButton>
      <button
        type="button"
        title="Browse media"
        aria-label="Browse media"
        onMouseDown={onSecondaryMouseDown}
        style={{
          height: 40,
          border: "1px solid rgba(148, 163, 184, 0.2)",
          borderRadius: 9,
          background: "#fff",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text)",
        }}
      >
        <BrowseMediaIcon />
      </button>
    </div>
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

function BrowseMediaIcon() {
  return <IconBase><rect x="3.5" y="4.5" width="13" height="11" rx="2" /><path d="m6 12 2.5-2.5L11 12l2-2 1.5 1.5" /><circle cx="8" cy="8" r="1.2" /></IconBase>;
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
