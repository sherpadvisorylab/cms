import BulletList from "@tiptap/extension-bullet-list";
import Image from "@tiptap/extension-image";
import OrderedList from "@tiptap/extension-ordered-list";
import Link from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import { Node } from "@tiptap/core";
import TextAlign from "@tiptap/extension-text-align";
import StarterKit from "@tiptap/starter-kit";

function commonHtmlAttributes() {
  return {
    class: {
      default: null,
      parseHTML: (element: HTMLElement) => element.getAttribute("class"),
      renderHTML: (attributes: { class?: string | null }) =>
        attributes.class ? { class: attributes.class } : {},
    },
    style: {
      default: null,
      parseHTML: (element: HTMLElement) => element.getAttribute("style"),
      renderHTML: (attributes: { style?: string | null }) =>
        attributes.style ? { style: attributes.style } : {},
    },
    id: {
      default: null,
      parseHTML: (element: HTMLElement) => element.getAttribute("id"),
      renderHTML: (attributes: { id?: string | null }) =>
        attributes.id ? { id: attributes.id } : {},
    },
  };
}

export const StyledBulletList = BulletList.extend({
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

export const StyledOrderedList = OrderedList.extend({
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

export const VideoNode = Node.create({
  name: "video",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: { default: null },
      controls: { default: true },
      style: { default: "max-width:100%;height:auto;" },
    };
  },

  parseHTML() {
    return [{ tag: "video" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["video", HTMLAttributes];
  },
});

export const RichTable = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...commonHtmlAttributes(),
    };
  },
});

export const RichTableRow = TableRow.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...commonHtmlAttributes(),
    };
  },
});

export const RichTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...commonHtmlAttributes(),
    };
  },
});

export const RichTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...commonHtmlAttributes(),
    };
  },
});

export const richTextExtensions = [
  StarterKit.configure({
    bulletList: false,
    orderedList: false,
  }),
  StyledBulletList,
  StyledOrderedList,
  Image,
  VideoNode,
  RichTable.configure({
    resizable: true,
  }),
  RichTableRow,
  RichTableHeader,
  RichTableCell,
  Link.configure({
    openOnClick: false,
    HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
  }),
  TextAlign.configure({ types: ["heading", "paragraph"] }),
];
