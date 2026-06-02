"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, drawSelection } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { javascript } from "@codemirror/lang-javascript";
import { indentOnInput, bracketMatching, syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language";
import { VariablePickerPopup, type PickerSection } from "./VariablePickerPopup";

export type CodeEditorLanguage = "html" | "css" | "js" | "liquid";
export type AutocompleteVar = { key: string; description: string };
export type FormEmbed = { variable: string; name: string };
export type ComponentEmbed = { id: string; name: string; namespace: string | null; type: string };
export type NavEmbed = { id: string; name: string };
export type LocalVar = { key: string; label: string; type: string };

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: CodeEditorLanguage;
  /** Style/custom variables from Settings → System Variables (keys include system: prefix) */
  styleVars?: AutocompleteVar[];
  formEmbeds?: FormEmbed[];
  componentEmbeds?: ComponentEmbed[];
  /** Navigation blocks — shown as {{navigation:id}} embeds */
  navEmbeds?: NavEmbed[];
  /** Component-local variables (from the Variables panel schema fields) */
  localVars?: LocalVar[];
  /** Override the label for the localVars section (default: "Component Variables") */
  localVarsLabel?: string;
  /** Split component embeds into "UI Components" + "Navigation Components" sections */
  splitComponentsByType?: boolean;
  /** Hide the Components (embed) section — useful in schema editors */
  hideComponentEmbeds?: boolean;
  /** Hide the Form (embed) section */
  hideFormEmbeds?: boolean;
  minHeight?: number;
}

function getLanguageExtension(lang: CodeEditorLanguage) {
  switch (lang) {
    case "css": return css();
    case "js":  return javascript();
    default:    return html();
  }
}

export function CodeEditor({
  value,
  onChange,
  language = "html",
  styleVars = [],
  formEmbeds = [],
  componentEmbeds = [],
  navEmbeds = [],
  localVars = [],
  localVarsLabel = "Component Variables",
  splitComponentsByType = false,
  hideComponentEmbeds = false,
  hideFormEmbeds = false,
  minHeight = 200,
}: CodeEditorProps) {
  const containerRef     = useRef<HTMLDivElement>(null);
  const viewRef          = useRef<EditorView | null>(null);
  const onChangeRef      = useRef(onChange);
  const styleVarsRef         = useRef(styleVars);
  const formEmbedsRef        = useRef(formEmbeds);
  const componentEmbeds_     = useRef(componentEmbeds);
  const navEmbedsRef         = useRef(navEmbeds);
  const localVarsRef         = useRef(localVars);
  const hideComponentEmbedsR  = useRef(hideComponentEmbeds);
  const hideFormEmbedsR       = useRef(hideFormEmbeds);
  const splitByTypeRef        = useRef(splitComponentsByType);
  const localVarsLabelRef     = useRef(localVarsLabel);

  onChangeRef.current            = onChange;
  styleVarsRef.current           = styleVars;
  formEmbedsRef.current          = formEmbeds;
  componentEmbeds_.current       = componentEmbeds;
  navEmbedsRef.current           = navEmbeds;
  localVarsRef.current           = localVars;
  hideComponentEmbedsR.current   = hideComponentEmbeds;
  hideFormEmbedsR.current        = hideFormEmbeds;
  splitByTypeRef.current         = splitComponentsByType;
  localVarsLabelRef.current      = localVarsLabel;

  // ── Picker state ────────────────────────────────────────────────────────────
  const [picker, setPicker] = useState<{
    open: boolean;
    top: number;
    left: number;
    search: string;
    replaceFrom: number; // position in doc to replace from (start of {{)
  } | null>(null);

  const closePicker = useCallback(() => setPicker(null), []);

  // ── Build sections for the picker ─────────────────────────────────────────
  function buildSections(): PickerSection[] {
    const sv     = styleVarsRef.current;
    const fe     = formEmbedsRef.current;
    const ce     = componentEmbeds_.current;
    const ne     = navEmbedsRef.current;
    const lv     = localVarsRef.current;
    const hideCE    = hideComponentEmbedsR.current;
    const splitType = splitByTypeRef.current;

    const sections: PickerSection[] = [];

    // Local/page variables
    sections.push({
      id:    "local",
      icon:  "⬡",
      label: localVarsLabelRef.current,
      items: lv.map((v) => ({
        label:  `{{${v.key}}}`,
        apply:  `{{${v.key}}}`,
        detail: v.label + (v.type !== "text" ? ` (${v.type})` : ""),
      })),
    });

    // Component embeds
    if (!hideCE) {
      if (splitType) {
        // Always show both sections (empty → "No items yet")
        sections.push({
          id:    "components-ui",
          icon:  "🧩",
          label: "UI Components",
          items: ce
            .filter((c) => c.type !== "navigation")
            .map((c) => ({
              label:  `{{component:${c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}}}`,
              apply:  `{{component:${c.id}}}`,
              detail: c.name + (c.namespace ? ` · ${c.namespace}` : ""),
            })),
        });
        sections.push({
          id:    "components-nav",
          icon:  "🗂️",
          label: "Navigation Components",
          items: ce
            .filter((c) => c.type === "navigation")
            .map((c) => ({
              label:  `{{component:${c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}}}`,
              apply:  `{{component:${c.id}}}`,
              detail: c.name + (c.namespace ? ` · ${c.namespace}` : ""),
            })),
        });
      } else {
        sections.push({
          id:    "components",
          icon:  "🧩",
          label: "Components (embed)",
          items: ce.map((c) => ({
            label:  `{{component:${c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}}}`,
            apply:  `{{component:${c.id}}}`,
            detail: c.name + (c.namespace ? ` · ${c.namespace}` : ""),
          })),
        });
      }
    }

    // Navigation embeds — use normalized name as key (e.g. {{navigation:navbar}})
    sections.push({
      id:    "navigations",
      icon:  "🧭",
      label: "Navigation (embed)",
      items: ne.map((n) => {
        const key = n.name.toLowerCase().replace(/\s+/g, "-");
        return {
          label:  `{{navigation:${key}}}`,
          apply:  `{{navigation:${key}}}`,
          detail: n.name,
        };
      }),
    });

    // Form embeds
    if (!hideFormEmbedsR.current) {
      sections.push({
        id:    "forms",
        icon:  "📋",
        label: "Form (embed)",
        items: fe.map((f) => ({
          label:  `{{form:${f.variable}}}`,
          apply:  `{{form:${f.variable}}}`,
          detail: f.name,
        })),
      });
    }

    // Style/system variables — always last
    sections.push({
      id:    "style",
      icon:  "🎨",
      label: "Style Variables",
      items: sv.map((v) => ({
        label:  `{{${v.key}}}`,
        apply:  `{{${v.key}}}`,
        detail: v.description,
      })),
    });

    return sections;
  }

  // ── Handle selection from picker ──────────────────────────────────────────
  function handlePickerSelect(apply: string) {
    const view = viewRef.current;
    if (!view || !picker) return;
    const cursor = view.state.selection.main.head;
    // Replace from replaceFrom (start of `{{`) to current cursor
    view.dispatch({
      changes: { from: picker.replaceFrom, to: cursor, insert: apply },
      selection: { anchor: picker.replaceFrom + apply.length },
    });
    view.focus();
    closePicker();
  }

  // ── Init CodeMirror ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const extensions = [
      lineNumbers(),
      highlightActiveLineGutter(),
      drawSelection(),
      history(),
      indentOnInput(),
      bracketMatching(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      getLanguageExtension(language),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChangeRef.current(update.state.doc.toString());
        }

        // Detect `{{` being typed to show the variable picker
        // Works for any language — liquid templates, HTML templates, etc.
        if (update.docChanged) {
          const doc    = update.state.doc;
          const cursor = update.state.selection.main.head;
          if (cursor < 2) return;
          const before2 = doc.sliceString(cursor - 2, cursor);
          if (before2 === "{{") {
            const coords = update.view.coordsAtPos(cursor);
            if (coords) {
              setPicker({
                open:        true,
                top:         coords.bottom + 4,
                left:        coords.left,
                search:      "",
                replaceFrom: cursor - 2,
              });
            }
          } else if (picker) {
            // Update search term if picker is open
            const start = picker.replaceFrom + 2;
            if (cursor >= start) {
              const typed = doc.sliceString(start, cursor);
              // Close if user backspaced past the `{{`
              if (cursor < picker.replaceFrom) {
                setPicker(null);
              } else {
                setPicker((prev) => prev ? { ...prev, search: typed } : null);
              }
            }
          }
        }
      }),
      EditorView.theme({
        "&": {
          minHeight:  `${minHeight}px`,
          fontFamily: "'JetBrains Mono','Fira Code','Courier New',monospace",
          fontSize:   "13px",
          width:      "100%",
        },
        ".cm-content":   { minHeight: `${minHeight}px`, padding: "8px 0" },
        ".cm-gutters":   { background: "#f8f9fa", borderRight: "1px solid #e5e7eb", color: "#9ca3af" },
        ".cm-activeLineGutter": { background: "#eff6ff" },
        "&.cm-editor":   { border: "1px solid var(--border,#e5e7eb)", borderRadius: "6px", overflow: "hidden" },
        "&.cm-editor.cm-focused": { outline: "2px solid var(--primary,#2E5A97)", outlineOffset: "-1px" },
        ".cm-scroller":  { overflow: "auto" },
      }),
    ];

    const view = new EditorView({
      state: EditorState.create({ doc: value, extensions }),
      parent: containerRef.current,
    });
    viewRef.current = view;
    return () => { view.destroy(); viewRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, minHeight]);

  // ── Sync external value changes ────────────────────────────────────────────
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
    }
  }, [value]);

  return (
    <div style={{ position: "relative", minWidth: 0, overflow: "hidden", width: "100%" }}>
      <div ref={containerRef} style={{ width: "100%" }} />

      {picker?.open && (
        <VariablePickerPopup
          sections={buildSections()}
          position={{ top: picker.top, left: picker.left }}
          searchTerm={picker.search}
          onSelect={handlePickerSelect}
          onClose={closePicker}
        />
      )}
    </div>
  );
}
