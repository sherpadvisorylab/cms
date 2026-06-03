export type AssetKind = "image" | "video" | "file";
export type MenuKind = "ordered" | "bullet" | "insert" | "emoji" | "align" | null;

export type TextStyleValue = "paragraph" | "2" | "3" | "4" | "5";
export type OrderedListStyle = "decimal" | "lower-alpha" | "upper-alpha";
export type BulletListStyle = "disc" | "circle" | "square";
export type AlignmentValue = "left" | "center" | "right" | "justify";

export type RichTextToolbarState = {
  marks: {
    bold: boolean;
    italic: boolean;
    strike: boolean;
    link: boolean;
  };
  blocks: {
    textStyle: TextStyleValue;
    blockquote: boolean;
    codeBlock: boolean;
  };
  lists: {
    ordered: boolean;
    orderedStyle: OrderedListStyle;
    bullet: boolean;
    bulletStyle: BulletListStyle;
  };
  alignment: AlignmentValue;
  editor: {
    empty: boolean;
    focused: boolean;
  };
  selection: {
    empty: boolean;
  };
};
