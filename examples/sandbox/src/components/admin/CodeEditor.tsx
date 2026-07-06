"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Completion, CompletionContext } from "@codemirror/autocomplete";
import { autocompletion, startCompletion } from "@codemirror/autocomplete";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, drawSelection } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { javascript } from "@codemirror/lang-javascript";
import { indentOnInput, bracketMatching, syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language";
import type { CmsSettings, CmsTranslationEntry } from "@sherpacms/domain";
import { VariablePickerPopup } from "./VariablePickerPopup";
import { TranslationUsageModal } from "./TranslationUsageModal";
import {
  buildVariablePickerSections,
  getPickerContextConfig,
  type VariablePickerContext,
} from "@/lib/variables/registry";
import { extractUsedTranslationKeys, resolveConfiguredLocales } from "@/lib/variables/translationUsage";

export type CodeEditorLanguage = "html" | "css" | "js" | "liquid";
export type FormEmbed = { variable: string; name: string };
export type ComponentEmbed = { id: string; name: string; namespace: string | null; type: string };
export type NavEmbed = { id: string; name: string };
export type LocalVar = { key: string; label: string; type: string };

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: CodeEditorLanguage;
  pickerContext: VariablePickerContext;
  settings?: CmsSettings | null;
  formEmbeds?: FormEmbed[];
  componentEmbeds?: ComponentEmbed[];
  navEmbeds?: NavEmbed[];
  localVars?: LocalVar[];
  localVarsLabel?: string;
  translationEntries?: CmsTranslationEntry[];
  minHeight?: number;
}

function getLanguageExtension(lang: CodeEditorLanguage) {
  switch (lang) {
    case "css":
      return css();
    case "js":
      return javascript();
    default:
      return html();
  }
}

export function CodeEditor({
  value,
  onChange,
  language = "html",
  pickerContext,
  settings = null,
  formEmbeds = [],
  componentEmbeds = [],
  navEmbeds = [],
  localVars = [],
  localVarsLabel = "Local Variables",
  translationEntries = [],
  minHeight = 200,
}: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const pickerContextRef = useRef(pickerContext);
  const settingsRef = useRef(settings);
  const formEmbedsRef = useRef(formEmbeds);
  const componentEmbedsRef = useRef(componentEmbeds);
  const navEmbedsRef = useRef(navEmbeds);
  const localVarsRef = useRef(localVars);
  const localVarsLabelRef = useRef(localVarsLabel);
  const translationEntriesRef = useRef(translationEntries);
  const helperConfigRef = useRef(getPickerContextConfig(pickerContext));

  onChangeRef.current = onChange;
  pickerContextRef.current = pickerContext;
  settingsRef.current = settings;
  formEmbedsRef.current = formEmbeds;
  componentEmbedsRef.current = componentEmbeds;
  navEmbedsRef.current = navEmbeds;
  localVarsRef.current = localVars;
  localVarsLabelRef.current = localVarsLabel;
  translationEntriesRef.current = translationEntries;
  helperConfigRef.current = getPickerContextConfig(pickerContext);

  const [picker, setPicker] = useState<{
    open: boolean;
    top: number;
    left: number;
    search: string;
    replaceFrom: number;
    cursor: number;
  } | null>(null);

  const closePicker = useCallback(() => setPicker(null), []);

  const [usageModalOpen, setUsageModalOpen] = useState(false);
  const { locales: translationLocales, defaultLocale: translationDefaultLocale } = resolveConfiguredLocales(settings);

  function insertAtCursor(text: string) {
    const view = viewRef.current;
    if (!view) return;
    const pos = view.state.selection.main.head;
    view.dispatch({
      changes: { from: pos, to: pos, insert: text },
      selection: { anchor: pos + text.length },
    });
    view.focus();
  }

  function buildSections() {
    const currentDoc = viewRef.current?.state.doc.toString() ?? "";
    const currentCursor = picker?.cursor ?? viewRef.current?.state.selection.main.head ?? 0;
    return buildVariablePickerSections(pickerContextRef.current, {
      settings: settingsRef.current,
      localVars: getContextualLocalVars(
        pickerContextRef.current,
        localVarsRef.current,
        currentDoc,
        currentCursor,
      ),
      localVarsLabel: localVarsLabelRef.current,
      formEmbeds: formEmbedsRef.current,
      navEmbeds: navEmbedsRef.current,
      componentEmbeds: componentEmbedsRef.current,
      translationEntries: translationEntriesRef.current,
    });
  }

  function handlePickerSelect(apply: string) {
    const view = viewRef.current;
    if (!view || !picker) return;
    const cursor = view.state.selection.main.head;
    view.dispatch({
      changes: { from: picker.replaceFrom, to: cursor, insert: apply },
      selection: { anchor: picker.replaceFrom + apply.length },
    });
    view.focus();
    closePicker();
  }

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
      autocompletion({
        override: [
          (context: CompletionContext) =>
            buildInlineHelperCompletions(context, {
              helperConfig: helperConfigRef.current,
              pickerContext: pickerContextRef.current,
              localVars: localVarsRef.current,
              globalSections: buildSections(),
            }),
        ],
      }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChangeRef.current(update.state.doc.toString());
        }

        if (update.docChanged) {
          const doc = update.state.doc;
          const cursor = update.state.selection.main.head;
          const textBeforeCursor = doc.sliceString(0, cursor);
          if (cursor >= 2 && doc.sliceString(cursor - 2, cursor) === "{{") {
            const coords = update.view.coordsAtPos(cursor);
            if (coords) {
              setPicker({
                open: true,
                top: coords.bottom + 4,
                left: coords.left,
                search: "",
                replaceFrom: cursor - 2,
                cursor,
              });
            }
            return;
          }

          setPicker((current) => {
            if (!current) return current;
            const searchStart = current.replaceFrom + 2;
            if (cursor < searchStart) return null;
            return {
              ...current,
              search: doc.sliceString(searchStart, cursor),
              cursor,
            };
          });

          if (
            isInlineHelperTrigger(textBeforeCursor, helperConfigRef.current) ||
            isDotPropertyTrigger(textBeforeCursor)
          ) {
            startCompletion(update.view);
          }
        }
      }),
      EditorView.theme({
        "&": {
          minHeight: `${minHeight}px`,
          fontFamily: "'JetBrains Mono','Fira Code','Courier New',monospace",
          fontSize: "13px",
          width: "100%",
        },
        ".cm-content": { minHeight: `${minHeight}px`, padding: "8px 0" },
        ".cm-gutters": { background: "#f8f9fa", borderRight: "1px solid #e5e7eb", color: "#9ca3af" },
        ".cm-activeLineGutter": { background: "#eff6ff" },
        "&.cm-editor": { border: "1px solid var(--border,#e5e7eb)", borderRadius: "6px", overflow: "hidden" },
        "&.cm-editor.cm-focused": { outline: "2px solid var(--primary,#2E5A97)", outlineOffset: "-1px" },
        ".cm-scroller": { overflow: "auto" },
        ".cm-tooltip-autocomplete ul li": { alignItems: "center" },
        ".cm-tooltip-autocomplete ul li .cm-completionIcon": {
          width: "1rem",
          minWidth: "1rem",
          marginRight: "0.35rem",
          opacity: 1,
          color: "#64748b",
          fontFamily: "system-ui,sans-serif",
        },
        ".cm-tooltip-autocomplete ul li .cm-completionIcon:after": {
          opacity: 1,
          color: "#64748b",
        },
      }),
    ];

    const view = new EditorView({
      state: EditorState.create({ doc: value, extensions }),
      parent: containerRef.current,
    });

    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [language, minHeight]);

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

      <button
        type="button"
        onClick={() => setUsageModalOpen(true)}
        title="View translation keys used in this template"
        style={{
          position: "absolute",
          top: 6,
          right: 6,
          zIndex: 10,
          background: "white",
          border: "1px solid var(--border,#e5e7eb)",
          borderRadius: 6,
          padding: "3px 8px",
          fontSize: "0.72rem",
          cursor: "pointer",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        }}
      >
        🌍 Translations
      </button>

      {picker?.open && (
        <VariablePickerPopup
          sections={buildSections()}
          position={{ top: picker.top, left: picker.left }}
          searchTerm={picker.search}
          onSelect={handlePickerSelect}
          onClose={closePicker}
        />
      )}

      {usageModalOpen && (
        <TranslationUsageModal
          onClose={() => setUsageModalOpen(false)}
          onInsert={(token) => {
            insertAtCursor(token);
            setUsageModalOpen(false);
          }}
          usedKeys={extractUsedTranslationKeys(viewRef.current?.state.doc.toString() ?? value)}
          entries={translationEntries}
          locales={translationLocales}
          defaultLocale={translationDefaultLocale}
        />
      )}
    </div>
  );
}

type LoopScope = {
  alias: string;
  collection: string;
  depth: number;
};

type InlineHelperSources = {
  helperConfig: ReturnType<typeof getPickerContextConfig>;
  pickerContext: VariablePickerContext;
  localVars: LocalVar[];
  globalSections: ReturnType<typeof buildVariablePickerSections>;
};

function isInlineHelperTrigger(
  textBeforeCursor: string,
  helperConfig: ReturnType<typeof getPickerContextConfig>,
) {
  const helperMatch = textBeforeCursor.match(/\b(for|if)\s*$/);
  if (!helperMatch) {
    return false;
  }

  const keyword = helperMatch[1] as "for" | "if";
  if (keyword === "for") {
    return helperConfig.allowForHelper;
  }
  return helperConfig.allowIfHelper;
}

function isDotPropertyTrigger(textBeforeCursor: string) {
  return /([a-zA-Z_][\w]*(?:\.[a-zA-Z_][\w]*)*)\.$/.test(textBeforeCursor);
}

function buildInlineHelperCompletions(
  context: CompletionContext,
  sources: InlineHelperSources,
) {
  const docBeforeCursor = context.state.doc.sliceString(0, context.pos);
  const contextualLocalVars = getContextualLocalVars(
    sources.pickerContext,
    sources.localVars,
    context.state.doc.toString(),
    context.pos,
  );
  const dotCompletions = buildDotPropertyCompletions(context, docBeforeCursor, sources);
  if (dotCompletions) {
    return dotCompletions;
  }

  const helperMatch = docBeforeCursor.match(/\b(for|if)\s*$/);
  if (!helperMatch) {
    return null;
  }

  const keyword = helperMatch[1] as "for" | "if";
  if (keyword === "for" && !sources.helperConfig.allowForHelper) return null;
  if (keyword === "if" && !sources.helperConfig.allowIfHelper) return null;

  const keywordStart = context.pos - helperMatch[0].length;
  const scopeStack = extractLoopScopeStack(docBeforeCursor);
  const options =
    keyword === "for"
      ? buildForCompletions(context, keywordStart, context.pos, scopeStack, contextualLocalVars)
      : buildIfCompletions(
          context,
          keywordStart,
          context.pos,
          scopeStack,
          contextualLocalVars,
          sources.globalSections,
        );

  if (options.length === 0) return null;

  return {
    from: keywordStart,
    to: context.pos,
    options,
    filter: false,
  };
}

function buildDotPropertyCompletions(
  context: CompletionContext,
  docBeforeCursor: string,
  sources: InlineHelperSources,
) {
  const dotMatch = docBeforeCursor.match(/([a-zA-Z_][\w]*(?:\.[a-zA-Z_][\w]*)*)\.([a-zA-Z_]*)$/);
  if (!dotMatch) {
    return null;
  }

  const [, basePath, fragment] = dotMatch;
  const from = context.pos - fragment.length;
  const scopeStack = extractLoopScopeStack(docBeforeCursor);
  const contextualLocalVars = getContextualLocalVars(
    sources.pickerContext,
    sources.localVars,
    context.state.doc.toString(),
    context.pos,
  );
  const properties = getObjectPropertyCandidates(
    basePath,
    scopeStack,
    contextualLocalVars,
    sources.globalSections,
  );
  if (properties.length === 0) {
    return null;
  }

  return {
    from,
    to: context.pos,
    options: properties.map((property) => ({
      label: property.key,
      detail: property.detail,
      type: property.type === "list" ? "class" : "property",
      apply: property.key,
    })),
    validFor: /^[a-zA-Z_][\w]*$/,
    filter: true,
  };
}

function buildForCompletions(
  context: CompletionContext,
  from: number,
  to: number,
  scopeStack: LoopScope[],
  localVars: LocalVar[],
): Completion[] {
  const currentScope = scopeStack[scopeStack.length - 1] ?? null;
  const candidates = getIterableCandidates(currentScope, localVars, context.state.doc.toString());

  return candidates.map((candidate) => ({
    label: candidate.expression,
    detail: candidate.detail,
    type: "keyword",
    apply(view) {
      const lineIndent = getLineIndentation(view.state.doc, from);
      const block = buildLoopBlock(candidate.expression, lineIndent);
      view.dispatch({
        changes: { from, to, insert: block.text },
        selection: { anchor: from + block.cursorOffset },
      });
    },
  }));
}

function buildIfCompletions(
  context: CompletionContext,
  from: number,
  to: number,
  scopeStack: LoopScope[],
  localVars: LocalVar[],
  globalSections: ReturnType<typeof buildVariablePickerSections>,
): Completion[] {
  const currentScope = scopeStack[scopeStack.length - 1] ?? null;
  const expressions = new Map<string, string>();

  if (currentScope) {
    const prototypePrefix = getPrototypePrefix(scopeStack.length);
    for (const variable of localVars) {
      if (!variable.key.startsWith(`${prototypePrefix}.`)) continue;
      const suffix = variable.key.slice(prototypePrefix.length + 1);
      const expression = `${currentScope.alias}.${suffix}`;
      expressions.set(expression, variable.label);
    }
    expressions.set(currentScope.alias, `Current ${currentScope.alias} object`);
  } else {
    for (const variable of localVars) {
      expressions.set(variable.key, variable.label);
    }

    for (const section of globalSections) {
      for (const item of section.items) {
        const expression = unwrapLiquidExpression(item.apply);
        if (!expression) continue;
        expressions.set(expression, item.detail);
      }
    }
  }

  return [...expressions.entries()].map(([expression, detail]) => ({
    label: expression,
    detail,
    type: "keyword",
    apply(view) {
      const lineIndent = getLineIndentation(view.state.doc, from);
      const block = buildIfBlock(expression, lineIndent);
      view.dispatch({
        changes: { from, to, insert: block.text },
        selection: { anchor: from + block.cursorOffset },
      });
    },
  }));
}

function extractLoopScopeStack(text: string): LoopScope[] {
  const stack: LoopScope[] = [];
  const loopPattern = /\{%\s*(for\s+([a-zA-Z_][\w]*)\s+in\s+([a-zA-Z_][\w.]*?)|endfor)\s*%\}/g;
  let match: RegExpExecArray | null;

  while ((match = loopPattern.exec(text)) !== null) {
    if (match[2] && match[3]) {
      stack.push({
        alias: match[2],
        collection: match[3],
        depth: stack.length + 1,
      });
      continue;
    }
    stack.pop();
  }

  return stack;
}

function getIterableCandidates(currentScope: LoopScope | null, localVars: LocalVar[], documentText: string) {
  const expressions = new Map<string, string>();

  if (currentScope) {
    const prototypePrefix = getPrototypePrefix(currentScope.depth);
    for (const variable of localVars) {
      if (variable.type !== "list") continue;
      if (!variable.key.startsWith(`${prototypePrefix}.`)) continue;
      const suffix = variable.key.slice(prototypePrefix.length + 1);
      const expression = `${currentScope.alias}.${suffix}`;
      expressions.set(expression, variable.label);
    }
  } else {
    for (const variable of localVars) {
      if (variable.type !== "list") continue;
      expressions.set(variable.key, variable.label);
    }

    const existingCollections = documentText.matchAll(/\{%\s*for\s+[a-zA-Z_][\w]*\s+in\s+([a-zA-Z_][\w.]*?)\s*%\}/g);
    for (const match of existingCollections) {
      const expression = match[1];
      if (expression.startsWith("menu.")) {
        expressions.set(expression, `Existing collection: ${expression}`);
      }
    }
  }

  return [...expressions.entries()].map(([expression, detail]) => ({ expression, detail }));
}

function getObjectPropertyCandidates(
  basePath: string,
  scopeStack: LoopScope[],
  localVars: LocalVar[],
  globalSections: ReturnType<typeof buildVariablePickerSections>,
) {
  const properties = new Map<string, { detail: string; type: string }>();
  const aliases = new Map<string, string>();

  for (let index = 0; index < scopeStack.length; index += 1) {
    aliases.set(scopeStack[index].alias, getPrototypePrefix(index + 1));
  }

  const localPrefixes = new Set<string>([basePath]);
  const localAliasPrefix = aliases.get(basePath);
  if (localAliasPrefix) {
    localPrefixes.add(localAliasPrefix);
  }

  for (const prefix of localPrefixes) {
    for (const variable of localVars) {
      if (!variable.key.startsWith(`${prefix}.`)) continue;
      const suffix = variable.key.slice(prefix.length + 1);
      if (!suffix || suffix.includes(".")) continue;
      properties.set(suffix, { detail: variable.label, type: variable.type });
    }
  }

  for (const section of globalSections) {
    for (const item of section.items) {
      const expression = unwrapLiquidExpression(item.apply);
      if (!expression) continue;
      if (!expression.startsWith(`${basePath}.`)) continue;
      const suffix = expression.slice(basePath.length + 1);
      if (!suffix || suffix.includes(".")) continue;
      properties.set(suffix, { detail: item.detail, type: "text" });
    }
  }

  return [...properties.entries()].map(([key, value]) => ({
    key,
    detail: value.detail,
    type: value.type,
  }));
}

function getContextualLocalVars(
  pickerContext: VariablePickerContext,
  localVars: LocalVar[],
  documentText: string,
  cursor: number,
) {
  if (pickerContext !== "navigation_template") {
    return localVars;
  }

  const scopeStack = extractLoopScopeStack(documentText.slice(0, cursor));
  const currentScope = scopeStack[scopeStack.length - 1] ?? null;

  if (!currentScope) {
    return localVars.filter((variable) => !isNavigationLoopPrototypeVar(variable.key));
  }

  const prefix = `${getPrototypePrefix(currentScope.depth)}.`;
  return localVars.filter((variable) => variable.key.startsWith(prefix));
}

function isNavigationLoopPrototypeVar(key: string) {
  return /^(item|child|grandchild)\./.test(key);
}

function buildLoopBlock(expression: string, indentation: string) {
  const alias = singularize(lastSegment(expression));
  const innerIndent = `${indentation}  `;
  const text = `{% for ${alias} in ${expression} %}\n${innerIndent}\n${indentation}{% endfor %}`;
  return {
    text,
    cursorOffset: `{% for ${alias} in ${expression} %}\n${innerIndent}`.length,
  };
}

function buildIfBlock(expression: string, indentation: string) {
  const innerIndent = `${indentation}  `;
  const text = `{% if ${expression} %}\n${innerIndent}\n${indentation}{% endif %}`;
  return {
    text,
    cursorOffset: `{% if ${expression} %}\n${innerIndent}`.length,
  };
}

function getLineIndentation(doc: EditorState["doc"], position: number) {
  return doc.lineAt(position).text.match(/^\s*/)?.[0] ?? "";
}

function singularize(value: string) {
  if (value === "items") return "item";
  if (value.endsWith("ies")) return `${value.slice(0, -3)}y`;
  if (value.endsWith("s") && !value.endsWith("ss")) return value.slice(0, -1);
  return value;
}

function lastSegment(expression: string) {
  const segments = expression.split(".");
  return segments[segments.length - 1] ?? expression;
}

function getPrototypePrefix(depth: number) {
  if (depth <= 1) return "item";
  if (depth === 2) return "child";
  return "grandchild";
}

function unwrapLiquidExpression(value: string) {
  const match = value.match(/^\{\{(.+)\}\}$/);
  return match ? match[1] : null;
}
