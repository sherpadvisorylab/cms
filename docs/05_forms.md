# CMS – Forms

This document describes the Form Generator and how forms are embedded in the CMS (e.g. `{{form:id}}` in components and area templates). For the overall CMS logic and concepts, see [01 – Overview](./01_overview.md).

---

## 1. Overview

The **Form Generator** is a generic form builder: it lets you visually define the structure of a form (groups and fields) and which inputs each field exposes.

For **each generated field** it accepts two kinds of input configuration:

1. **Field-level input array** — inputs that describe the **field itself**: label, type, required, width, validator, and any other custom field-level controls. These are laid out next to the label (e.g. validator) or in the field grid (type, required, width, etc.).

2. **Value-level input array** — inputs that describe the **value(s)** of the field: default value, options (for select/radio/checkbox) with optional default selected, rating min/max, and any other custom value-level controls. These are laid out next to “Default value” or “Options”.

The component is embeddable: you include CSS and JS, provide a DOM container, and call `FormGenerator.init(containerId, options)`. The API will also support callbacks such as **onsubmit** and other lifecycle/event methods in its signature.

---

## 2. Role and use as a library

- The Form Generator is a **reusable form-builder module**, not tied to a specific use case.
- **Library-style integration**: include the component files, initialise on an element, and optionally pass **fieldInputs** / **valueInputs** (or equivalent): arrays of **JSX elements** (input, select, React components, etc.) that define which controls appear per field.
- **Configuration**: via `options` you pass the field-level and value-level input **elements** (JSX: input, select, custom React components, etc.), optional **defaultValues** (recordset to pre-fill the form), **sorting**, **feature toggles**, and callbacks (e.g. `onsubmit` when implemented).

---

## 3. Architecture and files

| File | Role |
|------|------|
| `prototype/assets/css/form-generator.css` | Component styles (scoped under `.form-generator`). Defines layout for field grid (e.g. `.field-row-1`, `.field-row-2`), groups, fields, options, validator. |
| `prototype/assets/js/form-generator.js` | Logic: state, add/remove/order groups and fields, type and options handling. Used by pages that build fields via JS (e.g. questionnaire editor). **Note:** Program Structure (`pmp_admin_program_structure.html`) uses its own implementation (`program-structure.js`), not the Form Generator; see `docs/programs.md` §2.1. |

The JS is an IIFE that exposes **`window.FormGenerator`**. After `init`, action functions (e.g. `addGroup`, `addField`) are attached to `window` for use by `onclick` in the generated markup.

**Implementation note:** The prototype currently uses a **fixed** set of field-level controls (Label, Type, Required, Validator, Width) and value-level controls (Default value, Options, Rating). The two-row layout (first row: Label, Width; second row: Type, Required, Validator) is implemented via CSS classes (`.field-row-1`, `.field-row-2`) when the host page structures the markup accordingly. The **fieldInputs** / **valueInputs** API described below is the target design for library-style extensibility; the prototype may inject a fixed structure rather than rendering from those arrays.

---

## 4. Data model and logic

### 4.1 Internal state

- **`containerId`**: id of the div that holds the groups.
- **`fieldCount`** / **`groupCount`**: counters for field and group ids.
- **`groups`**: map `groupId` → `{ label, description, fields: [fieldId, …] }`.
- **`options`**: configuration passed to `init`, including **fieldInputs** and **valueInputs** (arrays of JSX elements: input, select, React components, etc.), optional **defaultValues** (recordset to populate groups, fields, and values), and (when implemented) callbacks like `onsubmit`.

Display order follows DOM order; state is kept in sync with add/remove/move.

### 4.2 Groups

- **Structure**: each group has order strip (up/down arrows) if sorting is enabled, delete, header (Group Label, Description), and a fields container (list of field cards + “Add Field”). Sorting of groups can be enabled or disabled via options.
- **Functions**: addGroup, removeGroup, moveGroupUp, moveGroupDown, updateGroupLabel, updateGroupDescription.

### 4.3 Fields — two input arrays

Each generated field is built from:

- **Field-level input array** (the field itself):  
  Label; Type; Required; **Validator** (autocomplete: preset None/Email/URL/Phone or custom regexp in the same field); Width; and any extra field-level inputs passed via **fieldInputs**.  
  **Layout**: typically a first row (e.g. Label, Width) and a second row (e.g. Type, Required, Validator plus any additional field-level inputs). The exact layout is determined by the **fieldInputs** configuration passed at init.

- **Value-level input array** (the value(s)):  
  Default value (for single-value types), Options with optional default selected (for select/radio/checkbox), Rating min/max, and any extra value-level inputs configured via **valueInputs**.  
  **Layout**: value-level inputs are rendered next to “Default value” or “Options” (e.g. Default value section, Default selected in the Options block).

**Supported field types**: Text, Textarea, Email, Number, Date, Time, Date & Time, URL, Phone, Select, Radio, Checkbox, Yes/No, Rating (Scale), File Upload.

**Main functions**: addField, removeField, moveFieldUp, moveFieldDown (if sorting of fields is enabled), handleFieldTypeChange (shows/hides Default value section, Options, Rating by type).

### 4.4 Default value and Options (value-level)

- **Default value**: for single-value types, a section with one input “Default value (optional)”. Value-level custom inputs are placed next to this or next to Options.
- **Options** (select/radio/checkbox): list of option rows. Each row has option text, a **per-option default switch** (inline), any value-level inputs per option, and delete. There is no separate “Default selected” field; the default is chosen by toggling the switch on one option. For **select** and **radio**, only one option can be default at a time (the component unchecks the others when one is selected).
- addOption(fieldId), removeOption(optionId).

### 4.5 Order visibility

- **updateOrderButtonVisibility()**: sets is-first / is-last / is-only for groups and fields (order arrows; strip hidden when only one group or one field).

### 4.6 Consent fields (form submission view)

When the form is **rendered for submission** (public/fill view), optional **consent fields** can be displayed **before the submit button**. They are not edited in the form builder; they are passed as input when rendering the form.

- **consentFields** (optional): array of objects `{ label: string, text: string, link?: string, required?: boolean }`.
  - **label**: short label for the checkbox (e.g. "I accept the …").
  - **text**: full text of the consent (e.g. policy or terms); if **link** is set, clicking the link opens a modal (or new page) with this text.
  - **link**: optional anchor text (e.g. "Privacy Policy", "Terms & Conditions"); when present, the consent is shown as a link that opens the full **text**.
  - **required**: if true, the checkbox is required.
- **Usage**: **Base (primary) form**: Privacy and Terms & Conditions are not configured in the questionnaire editor; they are fixed in the public form view. **Integrative forms**: the public view (when the startup is identified) shows a consent block before submit (e.g. Program Terms & Conditions); clicking the link opens a modal with the full text. Consent fields are **not** shown in the integrative form preview (token-only view).

---

## 5. UI features (configurable via options)

- **Groups**: add, remove; **reorder** (if `sortGroups` is enabled); editable label and description.
- **Fields**: add (inside group or at end), remove; **reorder** (if `sortFields` is enabled); label; **validator** (if enabled); **type** (if type selector enabled, optionally restricted by `allowedTypes`); **required** (if enabled); width.
- **Validator** (if enabled): single input with autocomplete/datalist for presets (None, Email, URL, Phone) or custom regexp in the same field; placeholder (e.g. “Preset or regexp”).
- **Default value** (value-level): one input for single-value types. **Options**: per-option default switch (inline with each option row); no separate "Default selected" field.
- **Order strip**: up/down arrows on the left, visible on hover when sorting is enabled; hidden when sorting is disabled or when only one group or one field.
- **Delete**: trash icons on group and field (and option row) visible on hover.
- **Collapse** (configurable via **options.collapse**, see §7.5): the form block (title + body), each group, and each field can be collapsed/expanded. When collapsed, the group shows only its label and action icons (toggle, delete) on one line; the field shows only its label (or “(No label)”) and action icons. Collapse can be enabled/disabled per level (form, group, field) and each level can start expanded or collapsed.

---

## 6. Field-level vs value-level inputs

- **Field-level input array** (`fieldInputs`) — relative to the **field itself**. It is an array of **JSX elements** (not strings): e.g. `<input>`, `<select>`, or custom React components. Rendered in the field grid (e.g. first row: Label, Width; second row: Type, Required, Validator, plus any additional field-level inputs). Each entry can be an input, select, or any React component.

- **Value-level input array** (`valueInputs`) — relative to the **value(s)** of the field. It is an array of **JSX elements** (not strings): e.g. `<input>`, `<select>`, or custom React components. Rendered next to Default value or Options. Each entry can be an input, select, or any React component.

The generator accepts these two input arrays per field (via options); **fieldInputs** and **valueInputs** are arrays of JSX elements (input, select, React components, etc.), not string identifiers. Extensibility is by adding elements to the field-level and/or value-level arrays.

---

## 7. Configuration and initialisation

### 7.1 Including the component

```html
<link rel="stylesheet" href="assets/css/form-generator.css">
<script src="assets/js/form-generator.js"></script>
```

### 7.2 Container markup

The groups container must be inside a wrapper with class `form-generator`. Optional modifier classes (e.g. to hide a given custom input) can be added as needed:

```html
<div class="form-generator">
  <div class="card">
    <div class="card-header">
      <h2 class="card-title">Form structure</h2>
      <button class="btn btn-outline btn-sm" onclick="addGroup()">
        <i class="fa-solid fa-layer-group"></i> Add Group
      </button>
    </div>
    <div id="myFormContainer"></div>
  </div>
</div>
```

### 7.3 init(containerId, options)

| Parameter    | Type   | Description |
|-------------|--------|-------------|
| `containerId` | string | Id of the div that will contain the groups. |
| `options`     | object | Configuration: field-level and value-level input configuration, initial state, and (when implemented) callbacks such as `onsubmit`. |

**options** (conceptual):

- **title** (string, optional) — Title shown at the top of the form generator. If **titleEditable** is true, this is the initial value of the title input; otherwise it is displayed as static text. Omit or empty to hide the title block when **titleEditable** is false.
- **titleEditable** (boolean, optional) — If true, the title is rendered as an editable input; the value is stored in the instance state (`inst.title`) and can be read via `FormGenerator.getState().instances[containerId].title`. If false and **title** is set, the title is shown as static text.
- **fieldInputs** — array of **JSX elements** (input, select, React components, etc.) for the field itself. Rendered next to the label or in the field grid.
- **valueInputs** — array of **JSX elements** (input, select, React components, etc.) for the value(s) of the field. Rendered next to Default value or Options.
- **defaultValues** — recordset to pre-fill the form. Same structure as the form: array of groups, each with fields and their values. Omit for an empty form.
- **Sorting**: **sortGroups** (boolean) — allow reordering groups (up/down arrows). **sortFields** (boolean) — allow reordering fields within each group. When false, the order strip is hidden.
- **Feature toggles**: **showValidator** (boolean) — show validator (preset or regexp) per field. **showRequired** (boolean) — show required toggle per field. **showType** (boolean) — show type selector per field. **allowedTypes** (string[] | undefined) — when type selector is shown, optional list of allowed types (e.g. `['text', 'email', 'select']`); if omitted, all supported types are available.
- **collapse** (object, optional) — controls collapse behaviour for the whole form, groups, and fields (see §7.5).
- **consentFields** — optional array of consent items to be rendered **before the submit button** when the form is displayed for submission (see §4.6). Not used in the form builder editor.
- **onsubmit** (and other lifecycle/event methods) — to be supported in the API signature.

After `init`, action functions are exposed on `window` (addGroup, addField, moveGroupUp, moveGroupDown, moveFieldUp, moveFieldDown, removeGroup, removeField, handleFieldTypeChange, handleValidatorChange, addOption, removeOption, updateGroupLabel, updateGroupDescription) for use by the generated markup or other scripts.

### 7.4 options.labels (customising text)

A **single parameter** `options.labels` lets you customise all labels, placeholders and button text of the component. It is a **flat** (non-nested) object with keys in **dot notation**: keys indicate the context (group or field) and the type of text.

The component defines a default object `DEFAULT_LABELS`; values passed in `options.labels` are merged (override). Keys not passed keep the default.

**Convention**: three-level notation `context.element.property` — e.g. `group.label.label` (label of the "group name" input), `group.label.placeholder`, `field.option.removeTitle`. This distinguishes the element (label, description, option, …) from the property (label, placeholder, title, text, icon).

| Key | Default | Description |
|--------|---------|-------------|
| `title.placeholder` | Title | Placeholder for the title input when **titleEditable** is true. |
| `group.addButton.text` | Add Group | Button text to add a group (also used by the host page for the header/card button). |
| `group.addButton.icon` | fa-layer-group | Font Awesome icon class for the add-group button (without `fa-solid` prefix). |
| `group.label.label` | Group Label | Label for the group name input. |
| `group.label.placeholder` | e.g. Contact Information | Placeholder for the group name input. |
| `group.description.label` | Description (Optional) | Label for the group description area. |
| `group.description.placeholder` | Brief description of this group... | Placeholder for the group description. |
| `group.empty.message` | No fields in this group yet... | Message when there are no fields in the group. |
| `group.moveUp.title` | Move group up | Title (tooltip) for the move-group-up button. |
| `group.moveDown.title` | Move group down | Title for the move-group-down button. |
| `field.addButton.text` | Add Field | Button text to add a field inside each group. |
| `field.addButtonIcon` | fa-plus | Icon for the add-field button. |
| `field.label.label` | Label | Label for the field label input. |
| `field.label.placeholder` | Enter question label... | Placeholder for the field label input. |
| `field.width.label` | Width | Label for the width select. |
| `field.requiredLabel` | Required | Label toggle required. |
| `field.validator.label` | Validator | Label for the validator select/input. |
| `field.validator.placeholder` | e.g. ^[A-Z]+$ | Placeholder validator custom regexp. |
| `field.type.label` | Type | Label for the field type select. |
| `field.defaultValue.label` | Default value | Label for the default value section. |
| `field.defaultValue.placeholder` | Default value (optional) | Placeholder for default value. |
| `field.optionsLabel` | Options | Label for the options section (select/radio/checkbox). |
| `field.addOptionButton.text` | Add Option | Button text to add an option. |
| `field.rating.min.label` | Min Value | Label for min rating. |
| `field.rating.max.label` | Max Value | Label for max rating. |
| `field.option.label` | Option | Label for the option row. |
| `field.option.placeholder` | Enter option text... | Placeholder for option text. |
| `field.optionDefaultTitle` | Default selected | Title switch “default selected”. |
| `field.option.removeTitle` | Remove option | Title for the remove-option button. |
| `field.moveUp.title` | Move field up | Title for the move-field-up button. |
| `field.moveDown.title` | Move field down | Title for the move-field-down button. |
| `group.collapse.title` | Collapse/expand group | Title for the group collapse toggle. |
| `field.collapse.title` | Collapse/expand field | Title for the field collapse toggle. |

**Example (questionnaire / section–point style):**

This example shows label customisation for a form with section/point-style groups and fields. The **Program Structure** admin page does not use the Form Generator; see **docs/programs.md** §2.1. Evaluation (signal weight / program points) and other custom fields (e.g. “Program evaluation”, “Select scorable”) are not part of the Form Generator; they are added in the **implementation** (business logic) via fieldInputs/valueInputs or page-specific logic (e.g. questionnaire editor).

```js
FormGenerator.init('programFieldsContainer', {
  labels: {
    'group.addButton.text': 'Add Section',
    'group.addButton.icon': 'fa-layer-group',
    'group.label.label': 'Sub-section',
    'group.label.placeholder': 'e.g. Management Team, Board',
    'group.description.label': 'Section / Phase',
    'group.description.placeholder': 'e.g. Team, Market',
    'group.empty.message': 'No points in this sub-section yet. Use the button below to add points.',
    'field.addButton.text': 'Add Point',
    'field.addButton.icon': 'fa-plus',
    'field.label.label': 'Point of observation',
    'field.label.placeholder': 'Enter point text...'
  }
});
```

### 7.5 options.collapse (collapse behaviour)

The **collapse** parameter is an object that controls collapse separately for **form** (title block + body), **groups** and **fields**. Each level can be enabled/disabled and can start expanded or collapsed.

**Structure**:

```js
collapse: {
  form:  { enabled: true, startExpanded: true },
  group: { enabled: true, startExpanded: true },
  field: { enabled: true, startExpanded: true }
}
```

- **form** — Applies to the form generator title block (when `title` is present and the title with toggle is created).  
  - **enabled** (boolean, default `true`): if `false`, the collapse button/icon is not shown and the form body is not collapsible.  
  - **startExpanded** (boolean, default `true`): if `false`, the form body starts collapsed (only title visible).

- **group** — Applies to each group (field-group).  
  - **enabled** (boolean, default `true`): if `false`, the collapse icon and collapsed label are not shown; the group is not clickable to collapse.  
  - **startExpanded** (boolean, default `true`): if `false`, new groups created with **addGroup** start collapsed (only label + icons visible).

- **field** — Applies to each field (field-card).  
  - **enabled** (boolean, default `true`): if `false`, the collapse icon and collapsed label are not shown; the field is not clickable to collapse.  
  - **startExpanded** (boolean, default `true`): if `false`, new fields created with **addField** start collapsed (only label + icons visible).

When collapse is **disabled** for a level, the component adds a CSS class (e.g. `field-group--no-collapse`, `field-card--no-collapse`, `form-generator--form-no-collapse`) and styles hide the toggle and collapsed label; the cursor is not pointer on the header.

**Example** — Form always expanded, groups and fields collapsible but start collapsed:

```js
FormGenerator.init('fieldsContainer', {
  title: 'Form Fields',
  collapse: {
    form:  { enabled: false },
    group: { enabled: true, startExpanded: false },
    field: { enabled: true, startExpanded: false }
  }
});
```

**Exposed functions** (for use from markup or script): `toggleFormGeneratorCollapse(containerId)`, `toggleGroupCollapse(groupId)`, `toggleFieldCollapse(fieldId)`.

---

## 8. API signature (conceptual)

The Form Generator API is a form builder with:

- **init(containerId, options)** — initialises the component; `options` includes the two input arrays (field-level and value-level) and optional initial state.
- **Lifecycle / events** — the signature will include methods such as **onsubmit** and other callbacks for integration with the host page.

TypeScript-style sketch:

```typescript
/** defaultValues has the same structure as the form: groups → fields → values */

/** One group: label, description, and list of fields with their values */
interface FormGeneratorGroupDefault {
  label: string;
  description?: string;
  fields: FormGeneratorFieldDefault[];
}

/** One field in a group: field-level + value-level values. Default for options is per-option (each option may have default: true). */
interface FormGeneratorFieldDefault {
  label: string;
  type: string;
  required?: boolean;
  width?: string;
  validator?: string;
  validatorRegexp?: string;
  defaultValue?: string;
  options?: Array<{ text: string; value?: string; default?: boolean }>;
  ratingMin?: number;
  ratingMax?: number;
}

/** Supported field type identifiers (subset usable when allowedTypes is set) */
type FormGeneratorFieldType =
  | 'text' | 'textarea' | 'email' | 'number' | 'date' | 'time' | 'datetime'
  | 'url' | 'phone' | 'select' | 'radio' | 'checkbox' | 'yesno' | 'rating' | 'file';

interface FormGeneratorOptions {
  /** Customise text: flat object with dot-notation keys (see §7.4). Merged with defaults. */
  labels?: Record<string, string>;
  /** Field-level inputs: array of JSX elements (input, select, React components, etc.), not strings. */
  fieldInputs?: React.ReactNode[];
  /** Value-level inputs: array of JSX elements (input, select, React components, etc.), not strings. */
  valueInputs?: React.ReactNode[];
  /** Pre-fill: array of groups, each with fields and their values. Same structure as the form. Omit for empty form. */
  defaultValues?: FormGeneratorGroupDefault[];
  /** Allow reordering groups (up/down). Default true. */
  sortGroups?: boolean;
  /** Allow reordering fields within each group (up/down). Default true. */
  sortFields?: boolean;
  /** Show validator (preset or regexp) per field. Default true. */
  showValidator?: boolean;
  /** Show required toggle per field. Default true. */
  showRequired?: boolean;
  /** Show type selector per field. Default true. */
  showType?: boolean;
  /** When showType is true: restrict to these types only; omit for all types. */
  allowedTypes?: FormGeneratorFieldType[];
  /** Consent fields for form submission view: rendered before submit button (public/fill view only). Not edited in the builder. */
  consentFields?: Array<{ label: string; text: string; link?: string; required?: boolean }>;
  /** Collapse behaviour: enable/disable and initial open/closed state for form, groups, and fields (see §7.5). */
  collapse?: FormGeneratorCollapseOptions;
  /** Callbacks (to be implemented). */
  onsubmit?: (data: unknown) => void;
}

/** Per-level collapse: enabled (show toggle, allow collapse) and startExpanded (initial state). */
interface FormGeneratorCollapseLevel {
  enabled?: boolean;
  startExpanded?: boolean;
}

/** Collapse options: form (title block), group (field-group), field (field-card). Defaults: all enabled, all start expanded. */
interface FormGeneratorCollapseOptions {
  form?: FormGeneratorCollapseLevel;
  group?: FormGeneratorCollapseLevel;
  field?: FormGeneratorCollapseLevel;
}

interface FormGeneratorAPI {
  init(containerId: string, options?: FormGeneratorOptions): void;
  updateOrderButtonVisibility(): void;
  handleFieldTypeChange(select: HTMLSelectElement, fieldId: string): void;
  handleValidatorChange(select: HTMLSelectElement, fieldId: string): void;
  getState(): FormGeneratorState;
  // onsubmit and other lifecycle methods in the signature
}

declare const FormGenerator: FormGeneratorAPI;
```

---

## 9. Embedding the component

1. **Include** `form-generator.css` and `form-generator.js` on the page.
2. **Insert** a wrapper with class `form-generator` and a div with a unique id for the groups container.
3. **Call** `FormGenerator.init('containerId', options)` when the DOM is ready.
4. **Optional**: pass **defaultValues** in `options` to start with a pre-filled form: array of **groups**, each with `label`, `description`, and **fields** (each field with its values). Same structure as the form. Read or persist state via `FormGenerator.getState()` (fieldCount, groupCount, groups).

---

## 10. API summary

- **FormGenerator.init(containerId, options)**  
  Initialises the form builder on a container. `options` defines **fieldInputs** and **valueInputs** (arrays of JSX elements: input, select, React components, etc.—not strings), optional **defaultValues** (array of groups, each with fields and their values), **sorting** (`sortGroups`, `sortFields`), **feature toggles** (`showValidator`, `showRequired`, `showType`, `allowedTypes`), optional **consentFields** (for form submission view; see §4.6), optional **collapse** (form/group/field: `enabled`, `startExpanded`; see §7.5), and (when implemented) callbacks such as `onsubmit`.

- **FormGenerator.updateOrderButtonVisibility()**  
  Recomputes order strips (arrows) for groups and fields.

- **FormGenerator.handleFieldTypeChange(select, fieldId)**  
  Shows/hides Default value section, Options, Rating (and any custom value-level blocks) by selected type.

- **FormGenerator.getState()**  
  Returns current state for persistence or integration.

Other actions (addGroup, addField, moveGroupUp, moveGroupDown, moveFieldUp, moveFieldDown, removeGroup, removeField, handleValidatorChange, addOption, removeOption, updateGroupLabel, updateGroupDescription) are exposed as global functions after `init` and are used by the component’s generated markup.

The API will include **onsubmit** and other event/lifecycle methods in its signature for form submission and integration.

---

## 11. Where the Form Generator is used

- **Questionnaire Editor** (`pmp_admin_questionnaire_editor.html`): edit questionnaire fields; evaluation (Signal weight / Program points) and protected fields are added in the page business logic.

**Note:** **Program Structure** (`pmp_admin_program_structure.html`) does **not** use the Form Generator. It uses a dedicated implementation (phases → sections → points of interest, with Quill WYSIWYG and links). See **docs/programs.md** §2.1 for the Program Structure implementation and full API.

---

## References

- **Overview and concepts**: [01 – Overview](./01_overview.md)
