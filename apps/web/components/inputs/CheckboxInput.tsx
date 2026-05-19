"use client";
import { useState, useEffect, useId } from "react";

export function CheckboxInput({ screen, previousAnswer, onNext, submitting }: any) {
  const [selected, setSelected] = useState<string[]>((previousAnswer as string[]) ?? []);
  const [validationError, setValidationError] = useState<string | null>(null);
  const errorId = useId();

  useEffect(() => {
    setSelected((previousAnswer as string[]) ?? []);
    setValidationError(null);
  }, [screen.id, previousAnswer]);

  function toggle(opt: string) {
    setSelected((prev) =>
      prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]
    );
    setValidationError(null);
  }

  function handleSubmit() {
    if (!screen.allowEmpty && selected.length < (screen.minSelect ?? 1)) {
      setValidationError("Please select at least one option.");
      return;
    }
    setValidationError(null);
    onNext(selected);
  }

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8 space-y-6 transition-all duration-300 animate-fadeIn">
      <h2 className="text-2xl font-semibold text-gray-900">{screen.prompt}</h2>
      {screen.allowEmpty && (
        <p className="text-sm text-gray-500">Select all that apply, or skip if none.</p>
      )}
      <fieldset>
        <legend className="sr-only">{screen.prompt}</legend>
        <div className="space-y-3">
          {screen.options.map((opt: string) => {
            const optId = `checkbox-${opt}`;
            return (
              <label
                key={opt}
                htmlFor={optId}
                className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                  selected.includes(opt)
                    ? "border-blue-500 bg-blue-50 shadow-sm"
                    : "border-gray-200 hover:border-blue-200 hover:bg-gray-50"
                }`}
                data-testid={`checkbox-option-${opt.toLowerCase().replace(/[\s()/–≥<>]/g, "-")}`}
              >
                <input
                  id={optId}
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={() => toggle(opt)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  disabled={submitting}
                  aria-checked={selected.includes(opt)}
                />
                <span className="text-gray-800">{opt}</span>
              </label>
            );
          })}
        </div>
        {validationError && (
          <p id={errorId} role="alert" className="text-red-600 text-sm mt-2 flex items-center gap-1" data-testid="validation-error">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {validationError}
          </p>
        )}
      </fieldset>
      <button
        onClick={handleSubmit}
        disabled={submitting}
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
