import { describe, it, expect, beforeEach } from "vitest";
import { FormBuilder } from "../core/FormBuilder";

describe("FormBuilder", () => {
  let builder: FormBuilder;

  beforeEach(() => {
    builder = new FormBuilder();
  });

  describe("addGroup", () => {
    it("adds a group and returns it", () => {
      const group = builder.addGroup("Personal Info", "Your details");
      expect(group.label).toBe("Personal Info");
      expect(group.description).toBe("Your details");
      expect(group.fields).toHaveLength(0);
      expect(group.orderIndex).toBe(0);
    });

    it("increments orderIndex for each group", () => {
      builder.addGroup("Group 1");
      const g2 = builder.addGroup("Group 2");
      expect(g2.orderIndex).toBe(1);
    });
  });

  describe("removeGroup", () => {
    it("removes a group by ID", () => {
      const g = builder.addGroup("ToRemove");
      builder.removeGroup(g.id);
      expect(builder.getState().groupCount).toBe(0);
    });

    it("reorders remaining groups after removal", () => {
      builder.addGroup("G1");
      const g2 = builder.addGroup("G2");
      builder.addGroup("G3");
      builder.removeGroup(g2.id);
      const state = builder.getState();
      expect(state.groups[0].orderIndex).toBe(0);
      expect(state.groups[1].orderIndex).toBe(1);
    });
  });

  describe("moveGroup", () => {
    it("moves a group down", () => {
      const g1 = builder.addGroup("G1");
      builder.addGroup("G2");
      builder.moveGroup(g1.id, "down");
      const state = builder.getState();
      expect(state.groups[0].label).toBe("G2");
      expect(state.groups[1].label).toBe("G1");
    });

    it("moves a group up", () => {
      builder.addGroup("G1");
      const g2 = builder.addGroup("G2");
      builder.moveGroup(g2.id, "up");
      const state = builder.getState();
      expect(state.groups[0].label).toBe("G2");
      expect(state.groups[1].label).toBe("G1");
    });

    it("does nothing when moving first group up", () => {
      const g1 = builder.addGroup("G1");
      builder.addGroup("G2");
      builder.moveGroup(g1.id, "up");
      expect(builder.getState().groups[0].label).toBe("G1");
    });

    it("does nothing when moving last group down", () => {
      builder.addGroup("G1");
      const g2 = builder.addGroup("G2");
      builder.moveGroup(g2.id, "down");
      expect(builder.getState().groups[1].label).toBe("G2");
    });
  });

  describe("addField", () => {
    it("adds a field to a group", () => {
      const g = builder.addGroup("Contact");
      const field = builder.addField(g.id, "text");
      expect(field.type).toBe("text");
      expect(field.groupId).toBe(g.id);
      expect(field.required).toBe(false);
      expect(field.validator).toBe("none");
      expect(field.orderIndex).toBe(0);
    });

    it("throws when group not found", () => {
      expect(() => builder.addField("nonexistent", "text")).toThrow();
    });

    it("increments field orderIndex within group", () => {
      const g = builder.addGroup("G");
      builder.addField(g.id, "text");
      const f2 = builder.addField(g.id, "email");
      expect(f2.orderIndex).toBe(1);
    });
  });

  describe("updateField", () => {
    it("updates a field's label and required", () => {
      const g = builder.addGroup("G");
      const f = builder.addField(g.id, "text");
      builder.updateField(f.id, { label: "First Name", required: true });
      const schema = builder.exportSchema();
      const updated = schema.groups[0].fields[0];
      expect(updated.label).toBe("First Name");
      expect(updated.required).toBe(true);
    });

    it("throws when field not found", () => {
      expect(() => builder.updateField("nonexistent", { label: "X" })).toThrow();
    });
  });

  describe("removeField", () => {
    it("removes a field by ID", () => {
      const g = builder.addGroup("G");
      const f = builder.addField(g.id, "text");
      builder.removeField(f.id);
      expect(builder.getState().fieldCount).toBe(0);
    });

    it("reorders remaining fields after removal", () => {
      const g = builder.addGroup("G");
      const f1 = builder.addField(g.id, "text");
      builder.addField(g.id, "text");
      builder.addField(g.id, "text");
      builder.removeField(f1.id);
      const schema = builder.exportSchema();
      expect(schema.groups[0].fields[0].orderIndex).toBe(0);
      expect(schema.groups[0].fields[1].orderIndex).toBe(1);
    });
  });

  describe("moveField", () => {
    it("moves a field down within its group", () => {
      const g = builder.addGroup("G");
      const f1 = builder.addField(g.id, "text");
      builder.updateField(f1.id, { label: "First" });
      const f2 = builder.addField(g.id, "text");
      builder.updateField(f2.id, { label: "Second" });
      builder.moveField(f1.id, "down");
      const schema = builder.exportSchema();
      expect(schema.groups[0].fields[0].label).toBe("Second");
      expect(schema.groups[0].fields[1].label).toBe("First");
    });
  });

  describe("exportSchema / importSchema", () => {
    it("exports a deep clone of the schema", () => {
      const g = builder.addGroup("G");
      builder.addField(g.id, "text");
      const schema = builder.exportSchema();
      // Mutating the export shouldn't affect the builder
      schema.groups[0].label = "MUTATED";
      expect(builder.getState().groups[0].label).toBe("G");
    });

    it("imports and restores a schema", () => {
      const g = builder.addGroup("Original");
      builder.addField(g.id, "email");
      const schema = builder.exportSchema();

      const builder2 = new FormBuilder();
      builder2.importSchema(schema);
      expect(builder2.getState().groupCount).toBe(1);
      expect(builder2.getState().fieldCount).toBe(1);
    });
  });

  describe("getState", () => {
    it("returns correct groupCount and fieldCount", () => {
      const g1 = builder.addGroup("G1");
      const g2 = builder.addGroup("G2");
      builder.addField(g1.id, "text");
      builder.addField(g1.id, "email");
      builder.addField(g2.id, "select");
      const state = builder.getState();
      expect(state.groupCount).toBe(2);
      expect(state.fieldCount).toBe(3);
    });
  });

  describe("setConsentFields", () => {
    it("attaches consent fields to the schema", () => {
      builder.setConsentFields([{ label: "Agree", text: "I agree to the terms", required: true }]);
      const schema = builder.exportSchema();
      expect(schema.consentFields).toHaveLength(1);
      expect(schema.consentFields![0].label).toBe("Agree");
    });
  });
});
