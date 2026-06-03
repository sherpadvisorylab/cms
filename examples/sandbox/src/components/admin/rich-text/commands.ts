import type { Editor } from "@tiptap/react";
import type { AlignmentValue, AssetKind, BulletListStyle, OrderedListStyle, TextStyleValue } from "./types";

function runFocused(editor: Editor, operation: (editor: Editor) => boolean) {
  editor.commands.focus();
  return operation(editor);
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function slugifyFilename(name: string): string {
  const dotIdx = name.lastIndexOf(".");
  const ext = dotIdx >= 0 ? name.slice(dotIdx + 1).toLowerCase() : "";
  const base = dotIdx >= 0 ? name.slice(0, dotIdx) : name;
  const slug = base
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "file";
  return ext ? `${slug}.${ext}` : slug;
}

export async function uploadAsset(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("filename", slugifyFilename(file.name));
  const response = await fetch("/api/admin/upload-asset", { method: "POST", body: form });
  const data = await response.json() as { error?: string; url?: string };
  if (!response.ok || !data.url) {
    throw new Error(data.error ?? `Upload failed (${response.status})`);
  }
  return data.url;
}

export function toggleBold(editor: Editor) {
  return runFocused(editor, (instance) => instance.chain().toggleBold().run());
}

export function toggleItalic(editor: Editor) {
  return runFocused(editor, (instance) => instance.chain().toggleItalic().run());
}

export function toggleStrike(editor: Editor) {
  return runFocused(editor, (instance) => instance.chain().toggleStrike().run());
}

export function insertDivider(editor: Editor) {
  return runFocused(editor, (instance) => instance.chain().setHorizontalRule().run());
}

export function toggleBlockquote(editor: Editor) {
  return runFocused(editor, (instance) => instance.chain().toggleBlockquote().run());
}

export function toggleCodeBlock(editor: Editor) {
  return runFocused(editor, (instance) => instance.chain().toggleCodeBlock().run());
}

export function setTextStyle(editor: Editor, next: TextStyleValue) {
  return runFocused(editor, (instance) => {
    if (next === "paragraph") {
      return instance.chain().setParagraph().run();
    }
    return instance.chain().toggleHeading({ level: Number(next) as 1 | 2 | 3 | 4 | 5 | 6 }).run();
  });
}

export function setOrderedListStyle(editor: Editor, next: OrderedListStyle) {
  return runFocused(editor, (instance) => {
    const chain = instance.chain();
    if (!instance.isActive("orderedList")) {
      chain.toggleOrderedList();
    }
    return chain.updateAttributes("orderedList", { listStyleType: next }).run();
  });
}

export function setBulletListStyle(editor: Editor, next: BulletListStyle) {
  return runFocused(editor, (instance) => {
    const chain = instance.chain();
    if (!instance.isActive("bulletList")) {
      chain.toggleBulletList();
    }
    return chain.updateAttributes("bulletList", { listStyleType: next }).run();
  });
}

export function setTextAlignment(editor: Editor, next: AlignmentValue) {
  return runFocused(editor, (instance) => instance.chain().setTextAlign(next).run());
}

export function setLink(editor: Editor) {
  if (editor.isActive("link")) {
    return runFocused(editor, (instance) =>
      instance.chain().extendMarkRange("link").unsetLink().run(),
    );
  }

  const previousHref = editor.getAttributes("link").href as string | undefined;
  const url = window.prompt("URL", previousHref ?? "https://");
  if (url === null) return false;

  return runFocused(editor, (instance) => {
    const chain = instance.chain().extendMarkRange("link");
    if (!url) {
      return chain.unsetLink().run();
    }
    return chain.setLink({ href: url }).run();
  });
}

export function insertCustomHtml(editor: Editor) {
  const snippet = window.prompt("Custom HTML", "<div>Custom block</div>");
  if (!snippet) return false;
  return runFocused(editor, (instance) => instance.chain().insertContent(snippet).run());
}

export function insertEmoji(editor: Editor, emoji: string) {
  return runFocused(editor, (instance) => instance.chain().insertContent(emoji).run());
}

export function insertAssetFromLibrary(
  editor: Editor,
  kind: AssetKind,
  url: string,
  suggestedLabel?: string,
) {
  if (kind === "image") {
    const alt = suggestedLabel ?? "";
    runFocused(editor, (instance) =>
      instance.chain().insertContent({ type: "image", attrs: { src: url, alt } }).run(),
    );
    return;
  }

  if (kind === "video") {
    runFocused(editor, (instance) =>
      instance.chain().insertContent({
        type: "video",
        attrs: { src: url, controls: true, style: "max-width:100%;height:auto;" },
      }).run(),
    );
    return;
  }

  const label = suggestedLabel?.trim() || "Attachment";
  runFocused(editor, (instance) =>
    instance.chain().insertContent(
      `<p><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" data-attachment="true">${escapeHtml(label)}</a></p>`,
    ).run(),
  );
}

export async function insertUploadedAsset(
  editor: Editor,
  kind: AssetKind,
  file: File,
) {
  const url = await uploadAsset(file);
  const fallbackLabel = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
  insertAssetFromLibrary(editor, kind, url, fallbackLabel);
}
