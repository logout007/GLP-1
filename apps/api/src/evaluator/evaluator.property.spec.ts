import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { evaluateEligibility, computeBMI } from "./evaluator";
import type { FormAnswers } from "./evaluator.types";

// ─── Arbitrary Generators ────────────────────────────────────────────────────

const pregnantArb = fc.constantFrom("Yes" as const, "No" as const);
const diabetesArb = fc.constantFrom("Yes" as const, "No" as const);
const smokingArb = fc.constantFrom("Yes" as const, "No" as const);
const alcoholArb = fc.constantFrom("Never" as const, "Monthly" as const, "Weekly" as const, "Daily" as const);
const activityArb = fc.constantFrom(
  "Sedentary" as const,
  "Light (1–2x/week)" as const,
  "Moderate (3–4x/week)" as const,
  "Vigorous (5+x/week)" as const
);

const comorbidOptionsArb = fc.subarray([
  "Hypertension", "Dyslipidemia", "Sleep Apnea", "GERD", "Thyroid Disorder"
], { minLength: 0, maxLength: 5 });

const bpOptionsArb = fc.subarray([
  "Normal (< 120/80)",
  "Elevated (120–129 / <80)",
  "Stage 1 Hypertension (130–139 / 80–89)",
  "Stage 2 Hypertension (≥140 / ≥90)",
  "Hypertensive Crisis (>180 / >120)"
], { minLength: 1, maxLength: 5 });

const medicationsArb = fc.subarray([
  "ACE inhibitors", "Beta blockers", "Statins", "Thyroid medication", "GLP-1 receptor agonist"
], { minLength: 0, maxLength: 5 });

const dietaryArb = fc.subarray([
  "High sugar intake", "High processed foods", "Frequent sugary beverages", "High fiber diet", "Balanced diet"
], { minLength: 0, maxLength: 5 });

function formAnswersArb(overrides: Partial<FormAnswers> = {}): fc.Arbitrary<FormAnswers> {
  return fc.record({
    age: fc.integer({ min: 1, max: 120 }),
    weight: fc.integer({ min: 20, max: 300 }),
    height: fc.integer({ min: 100, max: 250 }),
    bmi: fc.double({ min: 10, max: 60, noNaN: true }),
    pregnant: pregnantArb,
    comorbidConditions: comorbidOptionsArb,
    hasDiabetes: diabetesArb,
    hba1c: fc.option(fc.double({ min: 3, max: 20, noNaN: true }), { nil: undefined }),
    bloodPressure: bpOptionsArb,
    medications: medicationsArb,
    smokingStatus: smokingArb,
    alcoholFrequency: alcoholArb,
    activityLevel: activityArb,
    dietaryHabits: dietaryArb,
  }).map(base => ({ ...base, ...overrides }));
}

// ─── Property Tests ──────────────────────────────────────────────────────────

describe("Feature: glp1-eligibility-form, Property 1: BMI computation is mathematically correct", () => {
  it("computeBMI matches weight / (height/100)^2 for all valid inputs", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 20, max: 300, noNaN: true }),
        fc.double({ min: 100, max: 250, noNaN: true }),
        (weight, height) => {
          const result = computeBMI(weight, height);
          const expected = weight / ((height / 100) ** 2);
          expect(result).toBeCloseTo(expected, 10);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Feature: glp1-eligibility-form, Property 2: Immediate ineligibility conditions always produce Ineligible", () => {
  it("age < 18 always returns Ineligible", () => {
    fc.assert(
      fc.property(
        formAnswersArb({ age: 17, bmi: 30 }),
        (answers) => {
          const result = evaluateEligibility(answers);
          expect(result.result).toBe("Ineligible");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("BMI < 25 always returns Ineligible (when age >= 18)", () => {
    fc.assert(
      fc.property(
        formAnswersArb({ bmi: 22, age: 30 }),
        (answers) => {
          const result = evaluateEligibility(answers);
          expect(result.result).toBe("Ineligible");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("pregnant = Yes always returns Ineligible (when age >= 18 and BMI >= 25)", () => {
    fc.assert(
      fc.property(
        formAnswersArb({ pregnant: "Yes", age: 30, bmi: 30 }),
        (answers) => {
          const result = evaluateEligibility(answers);
          expect(result.result).toBe("Ineligible");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("diabetic with HbA1c > 9.0 always returns Ineligible (when age >= 18, BMI >= 25, not pregnant)", () => {
    fc.assert(
      fc.property(
        formAnswersArb({ hasDiabetes: "Yes", hba1c: 9.5, age: 30, bmi: 30, pregnant: "No" }),
        (answers) => {
          const result = evaluateEligibility(answers);
          expect(result.result).toBe("Ineligible");
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Feature: glp1-eligibility-form, Property 3: Automatic clinical review produces Requires Clinical Review when no ineligibility exists", () => {
  it("age > 75 with no ineligibility returns Clinical Review", () => {
    fc.assert(
      fc.property(
        formAnswersArb({ age: 76, bmi: 30, pregnant: "No", hasDiabetes: "No", medications: [] }),
        (answers) => {
          const result = evaluateEligibility(answers);
          expect(result.result).toBe("Requires Clinical Review");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("BMI >= 40 with no ineligibility returns Clinical Review", () => {
    fc.assert(
      fc.property(
        formAnswersArb({ bmi: 42, age: 30, pregnant: "No", hasDiabetes: "No", medications: [] }),
        (answers) => {
          const result = evaluateEligibility(answers);
          expect(result.result).toBe("Requires Clinical Review");
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Feature: glp1-eligibility-form, Property 4: Optional clinical review produces Requires Clinical Review when no higher-priority conditions exist", () => {
  it("Stage 1 + Sedentary + High sugar with no higher priority returns Clinical Review", () => {
    fc.assert(
      fc.property(
        formAnswersArb({
          age: 30,
          bmi: 28,
          pregnant: "No",
          hasDiabetes: "No",
          medications: [],
          comorbidConditions: [],
          bloodPressure: ["Stage 1 Hypertension (130–139 / 80–89)"],
          activityLevel: "Sedentary",
          dietaryHabits: ["High sugar intake"],
        }),
        (answers) => {
          const result = evaluateEligibility(answers);
          expect(result.result).toBe("Requires Clinical Review");
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Feature: glp1-eligibility-form, Property 5: Eligible is the default when no conditions trigger", () => {
  it("no conditions triggered returns Eligible", () => {
    fc.assert(
      fc.property(
        formAnswersArb({
          age: 35,
          bmi: 28,
          pregnant: "No",
          hasDiabetes: "No",
          medications: [],
          comorbidConditions: [],
          bloodPressure: ["Normal (< 120/80)"],
          smokingStatus: "No",
          alcoholFrequency: "Never",
          activityLevel: "Moderate (3–4x/week)",
          dietaryHabits: ["Balanced diet"],
        }),
        (answers) => {
          const result = evaluateEligibility(answers);
          expect(result.result).toBe("Eligible");
          expect(result.reason).toBe("All criteria met");
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Feature: glp1-eligibility-form, Property 6: Priority order is strictly enforced", () => {
  it("Ineligible always takes priority over Clinical Review conditions", () => {
    fc.assert(
      fc.property(
        formAnswersArb({
          age: 16,
          bmi: 42,
          pregnant: "Yes",
          comorbidConditions: ["Hypertension", "Dyslipidemia", "Sleep Apnea"],
          bloodPressure: ["Hypertensive Crisis (>180 / >120)"],
        }),
        (answers) => {
          const result = evaluateEligibility(answers);
          expect(result.result).toBe("Ineligible");
        }
      ),
      { numRuns: 100 }
    );
  });
});
