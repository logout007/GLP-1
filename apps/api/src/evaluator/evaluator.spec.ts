import { describe, it, expect } from "vitest";
import { evaluateEligibility, computeBMI } from "./evaluator";
import type { FormAnswers } from "./evaluator.types";

// ─── Base Eligible Answers ───────────────────────────────────────────────────
const BASE: FormAnswers = {
  age: 35,
  weight: 90,
  height: 170,
  bmi: computeBMI(90, 170), // ~31.1
  pregnant: "No",
  comorbidConditions: [],
  hasDiabetes: "No",
  hba1c: undefined,
  bloodPressure: ["Normal ( < 120/80)"],
  medications: [],
  smokingStatus: "No",
  alcoholFrequency: "Never",
  activityLevel: "Moderate (3–4x/week)",
  dietaryHabits: ["Balanced diet"],
};

describe("computeBMI", () => {
  it("computes BMI correctly", () => {
    expect(computeBMI(90, 170)).toBeCloseTo(31.14, 1);
  });
  it("handles edge weight/height", () => {
    expect(computeBMI(50, 200)).toBeCloseTo(12.5, 1);
  });
});

describe("evaluateEligibility — Immediate Ineligibility", () => {
  it("returns Ineligible for age < 18", () => {
    const result = evaluateEligibility({ ...BASE, age: 17, bmi: 30 });
    expect(result.result).toBe("Ineligible");
    expect(result.reason).toBe("Underage");
  });

  it("returns Ineligible for age exactly 17", () => {
    const result = evaluateEligibility({ ...BASE, age: 17 });
    expect(result.result).toBe("Ineligible");
  });

  it("returns Ineligible for BMI < 25", () => {
    const result = evaluateEligibility({ ...BASE, bmi: 24.9 });
    expect(result.result).toBe("Ineligible");
    expect(result.reason).toBe("BMI Too Low");
  });

  it("returns Ineligible for BMI exactly 24", () => {
    const result = evaluateEligibility({ ...BASE, bmi: 24 });
    expect(result.result).toBe("Ineligible");
  });

  it("returns Ineligible for pregnant = Yes", () => {
    const result = evaluateEligibility({ ...BASE, pregnant: "Yes" });
    expect(result.result).toBe("Ineligible");
    expect(result.reason).toBe("Pregnancy Contraindication");
  });

  it("returns Ineligible for HbA1c > 9.0 when diabetic", () => {
    const result = evaluateEligibility({ ...BASE, hasDiabetes: "Yes", hba1c: 9.1 });
    expect(result.result).toBe("Ineligible");
    expect(result.reason).toBe("Uncontrolled Diabetes");
  });

  it("does NOT flag HbA1c when no diabetes", () => {
    // hba1c is ignored if hasDiabetes === "No"
    const result = evaluateEligibility({ ...BASE, hasDiabetes: "No", hba1c: 10.5 });
    expect(result.result).toBe("Eligible");
  });

  it("returns Clinical Review for GLP-1 already prescribed", () => {
    const result = evaluateEligibility({ ...BASE, medications: ["GLP-1 receptor agonist"] });
    expect(result.result).toBe("Requires Clinical Review");
    expect(result.reason).toBe("Already On GLP-1 Therapy");
  });
});

describe("evaluateEligibility — Automatic Clinical Review", () => {
  it("returns Clinical Review for age > 75", () => {
    // Age > 75 is caught at screen 1 (early exit), but evaluator also handles it
    const result = evaluateEligibility({ ...BASE, age: 76 });
    expect(result.result).toBe("Requires Clinical Review");
    expect(result.reason).toBe("Age Over 75");
  });

  it("returns Clinical Review for BMI >= 40", () => {
    const result = evaluateEligibility({ ...BASE, bmi: 40 });
    expect(result.result).toBe("Requires Clinical Review");
    expect(result.reason).toBe("High BMI");
  });

  it("returns Clinical Review for Stage 2 Hypertension + Diabetes", () => {
    const result = evaluateEligibility({
      ...BASE,
      hasDiabetes: "Yes",
      hba1c: 7.0,
      bloodPressure: ["Stage 2 Hypertension (≥140 / ≥90)"],
    });
    expect(result.result).toBe("Requires Clinical Review");
    expect(result.reason).toBe("Stage 2 Hypertension with Diabetes");
  });

  it("does NOT flag Stage 2 alone without Diabetes", () => {
    const result = evaluateEligibility({
      ...BASE,
      bloodPressure: ["Stage 2 Hypertension (≥140 / ≥90)"],
    });
    expect(result.result).toBe("Eligible");
  });

  it("returns Clinical Review for Hypertensive Crisis", () => {
    const result = evaluateEligibility({
      ...BASE,
      bloodPressure: ["Hypertensive Crisis (>180/ >120)"],
    });
    expect(result.result).toBe("Requires Clinical Review");
    expect(result.reason).toBe("Hypertensive Crisis");
  });

  it("returns Clinical Review for >= 3 comorbid conditions", () => {
    const result = evaluateEligibility({
      ...BASE,
      comorbidConditions: ["Hypertension", "Dyslipidemia", "Sleep Apnea"],
    });
    expect(result.result).toBe("Requires Clinical Review");
    expect(result.reason).toBe("3 or More Comorbid Conditions");
  });

  it("does NOT flag for exactly 2 comorbid conditions", () => {
    const result = evaluateEligibility({
      ...BASE,
      comorbidConditions: ["Hypertension", "Dyslipidemia"],
    });
    expect(result.result).toBe("Eligible");
  });
});

describe("evaluateEligibility — Optional Clinical Review", () => {
  it("flags Stage 1 Hypertension + Sedentary + High sugar diet", () => {
    const result = evaluateEligibility({
      ...BASE,
      bloodPressure: ["Stage 1 Hypertension (130–139 / 80–89)"],
      activityLevel: "Sedentary",
      dietaryHabits: ["High sugar intake"],
    });
    expect(result.result).toBe("Requires Clinical Review");
  });

  it("does NOT flag Stage 1 alone without other factors", () => {
    const result = evaluateEligibility({
      ...BASE,
      bloodPressure: ["Stage 1 Hypertension (130–139 / 80–89)"],
    });
    expect(result.result).toBe("Eligible");
  });

  it("flags Daily alcohol + BMI >= 30 (risk factor)", () => {
    const result = evaluateEligibility({
      ...BASE,
      alcoholFrequency: "Daily",
      bmi: 32,
    });
    expect(result.result).toBe("Requires Clinical Review");
    expect(result.reason).toContain("Daily Alcohol");
  });

  it("flags Daily alcohol + smoking (risk factor)", () => {
    const result = evaluateEligibility({
      ...BASE,
      alcoholFrequency: "Daily",
      bmi: 27,
      smokingStatus: "Yes",
    });
    expect(result.result).toBe("Requires Clinical Review");
  });

  it("does NOT flag Daily alcohol without risk factors", () => {
    // BMI 27, no comorbidities, not smoking → below 30 → no risk flag
    const result = evaluateEligibility({
      ...BASE,
      alcoholFrequency: "Daily",
      bmi: 27,
      comorbidConditions: [],
      smokingStatus: "No",
    });
    expect(result.result).toBe("Eligible");
  });
});

describe("evaluateEligibility — Eligible (Happy Path)", () => {
  it("returns Eligible for standard qualifying patient", () => {
    const result = evaluateEligibility({
      age: 45,
      weight: 90,
      height: 168,
      bmi: computeBMI(90, 168), // ~31.9
      pregnant: "No",
      comorbidConditions: [],
      hasDiabetes: "No",
      hba1c: undefined,
      bloodPressure: ["Normal ( < 120/80)"],
      medications: [],
      smokingStatus: "No",
      alcoholFrequency: "Monthly",
      activityLevel: "Light (1–2x/week)",
      dietaryHabits: ["Balanced diet"],
    });
    expect(result.result).toBe("Eligible");
  });
});

describe("evaluateEligibility — Priority / ordering", () => {
  it("Ineligible takes priority over Clinical Review flags", () => {
    // Age < 18 + also BMI >= 40 → should still be Ineligible (not Review)
    const result = evaluateEligibility({ ...BASE, age: 16, bmi: 42 });
    expect(result.result).toBe("Ineligible");
    expect(result.reason).toBe("Underage");
  });
});
