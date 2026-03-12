export type FieldType =
  | "text"
  | "textarea"
  | "email"
  | "number"
  | "date"
  | "time"
  | "datetime"
  | "url"
  | "phone"
  | "select"
  | "radio"
  | "checkbox"
  | "yes_no"
  | "rating"
  | "file_upload";

export type Validator =
  | "none"
  | "email"
  | "url"
  | "phone"
  | { pattern: string; message: string };

export type FieldWidth =
  | "col-auto"
  | "col-1"
  | "col-2"
  | "col-3"
  | "col-4"
  | "col-5"
  | "col-6"
  | "col-7"
  | "col-8"
  | "col-9"
  | "col-10"
  | "col-11"
  | "col-12";

export interface FieldOption {
  id: string;
  label: string;
  value: string;
  isDefault: boolean;
  orderIndex: number;
}

// --- Visibility & Conditional Logic ---

export type VisibilityOperator = "equals" | "not_equals" | "in" | "not_in";

export interface VisibilityRule {
  dependsOn: string;
  operator: VisibilityOperator;
  value: string | string[];
}

export interface ConditionalOptions {
  dependsOn: string;
  optionSets: Record<string, FieldOption[]>;
}

// --- Field & Group Definitions ---

export interface FieldDefinition {
  id: string;
  groupId: string;
  label: string;
  type: FieldType;
  required: boolean;
  width: FieldWidth;
  validator: Validator;
  orderIndex: number;

  // Value-level inputs (conditional based on type)
  defaultValue?: string | boolean | number;
  options?: FieldOption[]; // For select/radio/checkbox
  minValue?: number; // For rating
  maxValue?: number; // For rating

  // Extended: visibility & conditional logic
  visibilityRules?: VisibilityRule[];
  conditionalOptions?: ConditionalOptions;
  alertText?: string;
  alertCondition?: VisibilityRule;
  maxLength?: number;
  placeholder?: string;
  helpText?: string;
}

export interface GroupDefinition {
  id: string;
  label: string;
  description?: string;
  orderIndex: number;
  collapsed?: boolean;
  fields: FieldDefinition[];
  visibilityRules?: VisibilityRule[];
}

export interface ConsentField {
  label: string;
  text: string;
  link?: string;
  required: boolean;
}

export interface FormSchema {
  groups: GroupDefinition[];
  consentFields?: ConsentField[];
}

export interface FormBuilderOptions {
  sortGroups?: boolean;
  sortFields?: boolean;
  showValidator?: boolean;
  showRequired?: boolean;
  showType?: boolean;
  allowedTypes?: FieldType[];
  collapse?: {
    form?: { enabled: boolean; startExpanded: boolean };
    group?: { enabled: boolean; startExpanded: boolean };
    field?: { enabled: boolean; startExpanded: boolean };
  };
  labels?: Record<string, string>; // Dot-notation customization
}
