"use client";
import { useState, useEffect, useId } from "react";

const UNIT_MAP: Record<string, string> = {
  Age: "years",
  Weight: "kg",
  Height: "cm",
  HbA1c: "%",
};

export function NumberInput({ screen, previousAnswer, onNext, submitting }: any) {
  const [value, setValue] = useState<string>(previousAnswer !== undefined ? String(previousAnswer) : "");
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputId = useId();
  const errorId = useId();

  const unit = UNIT_MAP[screen.title] ?? "";

  useEffect(() => {
    setValue(previousAnswer !== undefined ? String(previousAnswer) : "");
    setValidationError(null);
  }, [screen.id, previousAnswer]);

  function validate(v: string): string | null {
    if (!v.trim()) return "Please enter a value.";
    const num = parseFloat(v);
    if (isNaN(num)) return "Please enter a valid number.";
    if (num < 0) return "Value cannot be negative.";
    // Age must be an integer
    if (screen.title === "Age" && !Number.isInteger(num)) {
      return "Age must be a whole number.";
    }
    if (screen.validation?.min !== undefined && num < screen.validation.min)
      return `Value must be at least ${screen.validation.min}${unit ? ` ${unit}` : ""}.`;
    if (screen.validation?.max !== undefined && num > screen.validation.max)
      return `Value must be at most ${screen.validation.max}${unit ? ` ${unit}` : ""}.`;
    return null;
  }

  function handleSubmit() {
    const err = validate(value);
    if (err) { setValidationError(err); return; }
    setValidationError(null);
    onNext(parseFloat(value));
  }

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8 space-y-6 transition-all duration-300 animate-fadeIn">
      <h2 className="text-2xl font-semibold text-gray-900" id={`screen-title-${screen.id}`}>
        {screen.prompt}
      </h2>
      <div className="space-y-2">
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-600">
          {screen.title}{unit ? ` (${unit})` : ""}
        </label>
        <div className="relative">
          <input
            id={inputId}
            type="number"
            inputMode="decimal"
            min={screen.validation?.min ?? 0}
            max={screen.validation?.max}
            step={screen.title === "HbA1c" ? "0.1" : "1"}
            value={value}
            onChange={(e) => { setValue(e.target.value); setValidationError(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            aria-describedby={validationError ? errorId : undefined}
            aria-invalid={!!validationError}
            className={`w-full border rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
              validationError ? "border-red-300 bg-red-50" : "border-gray-300"
            } ${unit ? "pr-16" : ""}`}
            data-testid={`number-input-screen-${screen.id}`}
            disabled={submitting}
          />
          {unit && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium pointer-events-none">
              {unit}
            </span>
          )}
        </div>
        {validationError && (
          <p id={errorId} role="alert" className="text-red-600 text-sm flex items-center gap-1" data-testid="validation-error">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {validationError}
          </p>
        )}
        {screen.validation && (
          <p className="text-xs text-gray-400">
            Valid range: {screen.validation.min}–{screen.validation.max}{unit ? ` ${unit}` : ""}
          </p>
        )}
      </div>
      <button
        onClick={handleSubmit}
        disabled={submitting || !value}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        data-testid="next-btn"
        aria-busy={submitting}
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Saving...
          </span>
        ) : "Continue"}
      </button>
    </div>
  );
}
