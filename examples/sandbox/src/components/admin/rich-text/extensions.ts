import BulletList from "@tiptap/extension-bullet-list";
import Image from "@tiptap/extension-image";
import OrderedList from "@tiptap/extension-ordered-list";
import Link from "@tiptap/extension-link";
import { Node } from "@tiptap/core";
import TextAlign from "@tiptap/extension-text-align";
import StarterKit from "@tiptap/starter-kit";

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

export const richTextExtensions = [
  StarterKit.configure({
    bulletList: false,
    orderedList: false,
  }),
  StyledBulletList,
  StyledOrderedList,
  Image,
  VideoNode,
  Link.configure({
    openOnClick: false,
    HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
  }),
  TextAlign.configure({ types: ["heading", "paragraph"] }),
];
