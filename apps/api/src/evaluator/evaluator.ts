import type { FormAnswers, EligibilityReason } from "./evaluator.types";

// ─── Immediate Ineligibility Checks ─────────────────────────────────────────

function checkImmediateIneligibility(answers: FormAnswers): EligibilityReason | null {
  if (answers.age < 18) {
    return { result: "Ineligible", reason: "Underage" };
  }
  if (answers.bmi < 25) {
    return { result: "Ineligible", reason: "BMI Too Low" };
  }
  if (answers.pregnant === "Yes") {
    return { result: "Ineligible", reason: "Pregnancy Contraindication" };
  }
  if (answers.hasDiabetes === "Yes" && answers.hba1c !== undefined && answers.hba1c > 9.0) {
    return { result: "Ineligible", reason: "Uncontrolled Diabetes" };
  }
  if (answers.medications.includes("GLP-1 receptor agonist")) {
    return { result: "Requires Clinical Review", reason: "Already On GLP-1 Therapy" };
  }
  return null;
}

// ─── Automatic Clinical Review Checks ───────────────────────────────────────

function checkAutomaticClinicalReview(answers: FormAnswers): EligibilityReason | null {
  if (answers.age > 75) {
    return { result: "Requires Clinical Review", reason: "Age Over 75" };
  }
  if (answers.bmi >= 40) {
    return { result: "Requires Clinical Review", reason: "High BMI" };
  }
  // Stage 2 Hypertension + Diabetes
  const hasStage2 = answers.bloodPressure.includes("Stage 2 Hypertension (≥140 / ≥90)");
  if (hasStage2 && answers.hasDiabetes === "Yes") {
    return { result: "Requires Clinical Review", reason: "Stage 2 Hypertension with Diabetes" };
  }
  if (answers.bloodPressure.includes("Hypertensive Crisis (>180/ >120)")) {
    return { result: "Requires Clinical Review", reason: "Hypertensive Crisis" };
  }
  if (answers.comorbidConditions.length >= 3) {
    return { result: "Requires Clinical Review", reason: "3 or More Comorbid Conditions" };
  }
  return null;
}

// ─── Optional Clinical Review Checks ────────────────────────────────────────

function checkOptionalClinicalReview(answers: FormAnswers): EligibilityReason | null {
  // Stage 1 Hypertension + Sedentary + High sugar diet
  const hasStage1 = answers.bloodPressure.includes("Stage 1 Hypertension (130–139 / 80–89)");
  const isSedentary = answers.activityLevel === "Sedentary";
  const hasHighSugar = answers.dietaryHabits.includes("High sugar intake");
  if (hasStage1 && isSedentary && hasHighSugar) {
    return { result: "Requires Clinical Review", reason: "Stage 1 Hypertension with Sedentary Lifestyle and High Sugar Diet" };
  }

  // Daily alcohol + moderate/high risk factors
  if (answers.alcoholFrequency === "Daily") {
    const hasRiskFactor =
      answers.bmi >= 30 ||
      answers.comorbidConditions.length > 0 ||
      answers.smokingStatus === "Yes";
    if (hasRiskFactor) {
      return { result: "Requires Clinical Review", reason: "Daily Alcohol Use with Risk Factors" };
    }
  }

  return null;
}

// ─── Main Evaluator ──────────────────────────────────────────────────────────

export function evaluateEligibility(answers: FormAnswers): EligibilityReason {
  // Order matters: ineligibility first, then review, then eligible
  const ineligible = checkImmediateIneligibility(answers);
  if (ineligible) return ineligible;

  const autoReview = checkAutomaticClinicalReview(answers);
  if (autoReview) return autoReview;

  const optionalReview = checkOptionalClinicalReview(answers);
  if (optionalReview) return optionalReview;

  return { result: "Eligible", reason: "All criteria met" };
}

// ─── BMI Utility (exported for testing) ─────────────────────────────────────

export function computeBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}
