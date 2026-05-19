"use client";
import { useEffect, useState } from "react";

export function ComputedScreen({ screen, onNext, submitting, allAnswers }: any) {
  const [bmi, setBmi] = useState<number | null>(null);

  useEffect(() => {
    const weightAnswer = allAnswers.find((a: any) => a.screenId === 2);
    const heightAnswer = allAnswers.find((a: any) => a.screenId === 3);
    if (weightAnswer && heightAnswer) {
      const w = weightAnswer.value as number;
      const h = (heightAnswer.value as number) / 100;
      setBmi(parseFloat((w / (h * h)).toFixed(1)));
    }
  }, [allAnswers]);

  useEffect(() => {
    if (bmi !== null) {
      const timer = setTimeout(() => onNext(bmi), 2000);
      return () => clearTimeout(timer);
    }
  }, [bmi]);

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8 space-y-6 text-center animate-fadeIn">
      <h2 className="text-2xl font-semibold text-gray-900">Calculating your BMI...</h2>
      {bmi !== null ? (
        <div aria-live="polite" data-testid="bmi-result">
          <p className="text-5xl font-bold text-blue-600">{bmi}</p>
          <p className="text-gray-500 mt-2">Your Body Mass Index</p>
          <p className="text-sm text-gray-400 mt-4 flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4 text-blue-500" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Proceeding to next step...
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3" aria-live="polite">
          <svg className="animate-spin h-8 w-8 text-blue-500" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-gray-400">Computing...</p>
        </div>
      )}
    </div>
  );
}
