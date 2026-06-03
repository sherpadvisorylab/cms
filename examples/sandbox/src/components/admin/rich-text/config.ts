import type { AlignmentValue, BulletListStyle, OrderedListStyle, TextStyleValue } from "./types";

export const EMOJIS = ["😀", "😉", "😍", "👏", "🔥", "✅", "⭐", "🚀", "🎯", "💡", "📌", "📎"] as const;

export const TEXT_STYLE_OPTIONS: ReadonlyArray<{ value: TextStyleValue; label: string }> = [
  { value: "paragraph", label: "Paragraph" },
  { value: "2", label: "Heading 2" },
  { value: "3", label: "Heading 3" },
  { value: "4", label: "Heading 4" },
  { value: "5", label: "Heading 5" },
];

export const ORDERED_LIST_OPTIONS: ReadonlyArray<{ value: OrderedListStyle; label: string }> = [
  { value: "decimal", label: "1. 2. 3." },
  { value: "lower-alpha", label: "a. b. c." },
  { value: "upper-alpha", label: "A. B. C." },
];

export const BULLET_LIST_OPTIONS: ReadonlyArray<{ value: BulletListStyle; label: string }> = [
  { value: "disc", label: "Disc bullets" },
  { value: "circle", label: "Circle bullets" },
  { value: "square", label: "Square bullets" },
];

export const ALIGN_OPTIONS: ReadonlyArray<{ value: AlignmentValue; label: string }> = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
  { value: "justify", label: "Justify" },
];
