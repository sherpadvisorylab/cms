import type { Editor } from "@tiptap/react";
import type { AlignmentValue, BulletListStyle, OrderedListStyle, RichTextToolbarState, TextStyleValue } from "./types";

export const DEFAULT_TOOLBAR_STATE: RichTextToolbarState = {
  marks: {
    bold: false,
    italic: false,
    strike: false,
    link: false,
  },
  blocks: {
    textStyle: "paragraph",
    blockquote: false,
    codeBlock: false,
  },
  lists: {
    ordered: false,
    orderedStyle: "decimal",
    bullet: false,
    bulletStyle: "disc",
  },
  alignment: "left",
  editor: {
    empty: true,
    focused: false,
  },
  selection: {
    empty: true,
  },
};

function resolveTextStyle(editor: Editor): TextStyleValue {
  if (editor.isActive("heading", { level: 2 })) return "2";
  if (editor.isActive("heading", { level: 3 })) return "3";
  if (editor.isActive("heading", { level: 4 })) return "4";
  if (editor.isActive("heading", { level: 5 })) return "5";
  return "paragraph";
}

function resolveAlignment(editor: Editor): AlignmentValue {
  if (editor.isActive({ textAlign: "justify" })) return "justify";
  if (editor.isActive({ textAlign: "right" })) return "right";
  if (editor.isActive({ textAlign: "center" })) return "center";
  return "left";
}

function resolveOrderedListStyle(editor: Editor): OrderedListStyle {
  const style = editor.getAttributes("orderedList").listStyleType;
  return style === "lower-alpha" || style === "upper-alpha" ? style : "decimal";
}

function resolveBulletListStyle(editor: Editor): BulletListStyle {
  const style = editor.getAttributes("bulletList").listStyleType;
  return style === "circle" || style === "square" ? style : "disc";
}

export function resolveToolbarState(editor: Editor | null): RichTextToolbarState {
  if (!editor) return DEFAULT_TOOLBAR_STATE;

  return {
    marks: {
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      strike: editor.isActive("strike"),
      link: editor.isActive("link"),
    },
    blocks: {
      textStyle: resolveTextStyle(editor),
      blockquote: editor.isActive("blockquote"),
      codeBlock: editor.isActive("codeBlock"),
    },
    lists: {
      ordered: editor.isActive("orderedList"),
      orderedStyle: resolveOrderedListStyle(editor),
      bullet: editor.isActive("bulletList"),
      bulletStyle: resolveBulletListStyle(editor),
    },
    alignment: resolveAlignment(editor),
    editor: {
      empty: editor.isEmpty,
      focused: editor.isFocused,
    },
    selection: {
      empty: editor.state.selection.empty,
    },
  };
}
