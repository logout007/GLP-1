import { describe, it, expect } from "vitest";
import schema from "./form-schema.json";

describe("Form Schema Structure", () => {
  it("has exactly 15 screens", () => {
    expect(schema.screens).toHaveLength(15);
  });

  it("screen IDs are sequential 1–15", () => {
    const ids = schema.screens.map((s) => s.id);
    expect(ids).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  });

  it("every screen has id, title, and inputType", () => {
    for (const screen of schema.screens) {
      expect(screen.id).toBeTypeOf("number");
      expect(screen.title).toBeTypeOf("string");
      expect(screen.inputType).toBeTypeOf("string");
    }
  });

  it("radio screens have options array with at least 2 items", () => {
    const radioScreens = schema.screens.filter((s) => s.inputType === "radio");
    for (const s of radioScreens) {
      expect((s as any).options).toBeInstanceOf(Array);
      expect((s as any).options.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("checkbox screens have options array with at least 2 items", () => {
    const checkboxScreens = schema.screens.filter((s) => s.inputType === "checkbox");
    for (const s of checkboxScreens) {
      expect((s as any).options).toBeInstanceOf(Array);
      expect((s as any).options.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("computed screen has computation field with formula and dependsOn", () => {
    const computed = schema.screens.find((s) => s.inputType === "computed") as any;
    expect(computed).toBeDefined();
    expect(computed.computation.formula).toBeTypeOf("string");
    expect(computed.computation.dependsOn).toBeTypeOf("object");
  });

  it("all branch actions are 'next' or 'end'", () => {
    for (const screen of schema.screens) {
      for (const branch of screen.branch ?? []) {
        expect(["next", "end"]).toContain((branch as any).action);
      }
    }
  });

  it("branch 'next' actions have a valid screen reference", () => {
    const validIds = new Set(schema.screens.map((s) => s.id));
    for (const screen of schema.screens) {
      for (const branch of screen.branch ?? []) {
        const b = branch as any;
        if (b.action === "next") {
          expect(validIds.has(b.screen)).toBe(true);
        }
      }
    }
  });

  it("snapshot of schema shape", () => {
    expect(schema).toMatchSnapshot();
  });
});
