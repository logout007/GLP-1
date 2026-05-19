export type EligibilityResult = "Eligible" | "Ineligible" | "Requires Clinical Review";

export interface EligibilityReason {
  result: EligibilityResult;
  reason: string;
}

export interface FormAnswers {
  age: number;
  weight: number;
  height: number;
  bmi: number;
  pregnant: "Yes" | "No";
  comorbidConditions: string[];   // screen 6 selections
  hasDiabetes: "Yes" | "No";
  hba1c?: number;                 // only present if hasDiabetes === "Yes"
  bloodPressure: string[];        // screen 9 selections
  medications: string[];          // screen 10 selections
  smokingStatus: "Yes" | "No";
  alcoholFrequency: "Never" | "Monthly" | "Weekly" | "Daily";
  activityLevel: "Sedentary" | "Light (1–2x/week)" | "Moderate (3–4x/week)" | "Vigorous (5+x/week)";
  dietaryHabits: string[];        // screen 14 selections
}
