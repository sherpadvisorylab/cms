import type {
  FormSchema,
  GroupDefinition,
  FieldDefinition,
  FieldType,
  FormBuilderOptions,
} from "../types";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export class FormBuilder {
  private schema: FormSchema;
  private options: FormBuilderOptions;

  constructor(options?: FormBuilderOptions) {
    this.schema = { groups: [] };
    this.options = options ?? {};
  }

  /**
   * Add a new group to the form.
   */
  addGroup(label: string, description?: string): GroupDefinition {
    const group: GroupDefinition = {
      id: generateId(),
      label,
      description,
      orderIndex: this.schema.groups.length,
      collapsed: this.options.collapse?.group?.startExpanded === false,
      fields: [],
    };
    this.schema.groups.push(group);
    return group;
  }

  /**
   * Remove a group by ID.
   */
  removeGroup(groupId: string): void {
    this.schema.groups = this.schema.groups.filter((g) => g.id !== groupId);
    this.reorderGroups();
  }

  /**
   * Move a group up or down.
   */
  moveGroup(groupId: string, direction: "up" | "down"): void {
    const index = this.schema.groups.findIndex((g) => g.id === groupId);
    if (index === -1) return;

    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= this.schema.groups.length) return;

    // Swap
    [this.schema.groups[index], this.schema.groups[newIndex]] = [
      this.schema.groups[newIndex],
      this.schema.groups[index],
    ];
    this.reorderGroups();
  }

  /**
   * Add a field to a group.
   */
  addField(groupId: string, type: FieldType): FieldDefinition {
    const group = this.schema.groups.find((g) => g.id === groupId);
    if (!group) {
      throw new Error(`Group ${groupId} not found`);
    }

    const field: FieldDefinition = {
      id: generateId(),
      groupId,
      label: "",
      type,
      required: false,
      width: "col-6",
      validator: "none",
      orderIndex: group.fields.length,
    };
    group.fields.push(field);
    return field;
  }

  /**
   * Update a field by ID.
   */
  updateField(fieldId: string, updates: Partial<FieldDefinition>): void {
    for (const group of this.schema.groups) {
      const field = group.fields.find((f) => f.id === fieldId);
      if (field) {
        Object.assign(field, updates);
        return;
      }
    }
    throw new Error(`Field ${fieldId} not found`);
  }

  /**
   * Remove a field by ID.
   */
  removeField(fieldId: string): void {
    for (const group of this.schema.groups) {
      const index = group.fields.findIndex((f) => f.id === fieldId);
      if (index !== -1) {
        group.fields.splice(index, 1);
        this.reorderFields(group.id);
        return;
      }
    }
  }

  /**
   * Move a field up or down within its group.
   */
  moveField(fieldId: string, direction: "up" | "down"): void {
    for (const group of this.schema.groups) {
      const index = group.fields.findIndex((f) => f.id === fieldId);
      if (index === -1) continue;

      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= group.fields.length) return;

      // Swap
      [group.fields[index], group.fields[newIndex]] = [
        group.fields[newIndex],
        group.fields[index],
      ];
      this.reorderFields(group.id);
      return;
    }
  }

  /**
   * Export the schema as JSON (deep clone).
   */
  exportSchema(): FormSchema {
    return JSON.parse(JSON.stringify(this.schema));
  }

  /**
   * Import a schema.
   */
  importSchema(schema: FormSchema): void {
    this.schema = schema;
  }

  /**
   * Get current state summary.
   */
  getState() {
    return {
      groupCount: this.schema.groups.length,
      fieldCount: this.schema.groups.reduce(
        (sum, g) => sum + g.fields.length,
        0
      ),
      groups: this.schema.groups,
    };
  }

  /**
   * Update consent fields.
   */
  setConsentFields(consents: FormSchema["consentFields"]): void {
    this.schema.consentFields = consents;
  }

  private reorderGroups(): void {
    this.schema.groups.forEach((g, i) => {
      g.orderIndex = i;
    });
  }

  private reorderFields(groupId: string): void {
    const group = this.schema.groups.find((g) => g.id === groupId);
    if (group) {
      group.fields.forEach((f, i) => {
        f.orderIndex = i;
      });
    }
  }
}
