"use client";
import { useSessionStore } from "@/lib/sessionStore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const RESULT_CONFIG = {
  "Eligible": {
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    iconBg: "bg-emerald-100",
    icon: (
      <svg className="w-12 h-12 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    headline: "You appear to be eligible",
    description: "Based on your responses, you may be a candidate for GLP-1 weight-loss medication. A licensed provider will review your information and reach out to you.",
  },
  "Ineligible": {
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    iconBg: "bg-red-100",
    icon: (
      <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    headline: "Not eligible at this time",
    description: "Based on your responses, you do not currently meet the screening criteria for GLP-1 medication. Please consult your healthcare provider for personalized guidance.",
  },
  "Requires Clinical Review": {
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    iconBg: "bg-amber-100",
    icon: (
      <svg className="w-12 h-12 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
    headline: "Clinical review required",
    description: "Your responses require review by a licensed clinician before a determination can be made. A provider will contact you within 2–3 business days.",
  },
} as const;

export default function ResultPage() {
  const store = useSessionStore();
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Wait for Zustand store to hydrate from localStorage
    const unsub = useSessionStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    // If already hydrated (e.g. navigated from form page)
    if (useSessionStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return () => { unsub(); };
  }, []);

  const result = store.result as keyof typeof RESULT_CONFIG | null;
  const config = result ? RESULT_CONFIG[result] : null;

  // Show loading state while waiting for hydration
  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center" aria-live="polite" aria-busy="true">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-gray-500">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!config) {
    router.replace("/");
    return null;
  }

  function handleRestart() {
    store.reset();
    router.push("/");
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">PhoenixLabs</h1>
            <p className="text-xs text-gray-500">Clinical Screening Platform</p>
          </div>
        </div>
      </header>

      {/* Result */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div
          className={`w-full max-w-lg ${config.bg} ${config.border} border rounded-2xl p-10 space-y-6 text-center shadow-lg animate-fadeIn`}
          data-testid="result-screen"
          role="main"
          aria-labelledby="result-title"
        >
          {/* Icon */}
          <div className={`inline-flex items-center justify-center w-20 h-20 ${config.iconBg} rounded-full mx-auto`}>
            {config.icon}
          </div>

          <h2
            id="result-title"
            className={`text-3xl font-bold ${config.color}`}
            data-testid={`result-${result?.toLowerCase().replace(/\s+/g, "-")}`}
          >
            {config.headline}
          </h2>

          {store.resultReason && (
            <div className="inline-flex items-center gap-1 bg-white/60 px-3 py-1 rounded-full">
              <span className="text-sm text-gray-600 font-medium" data-testid="result-reason">
                Reason: {store.resultReason}
              </span>
            </div>
          )}

          <p className="text-gray-700 leading-relaxed">{config.description}</p>

          <div className="pt-4 space-y-3">
            <button
              onClick={handleRestart}
              className="w-full bg-gray-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-700 focus:ring-offset-2 transition-all duration-200"
              data-testid="restart-btn"
            >
              Start New Screening
            </button>
          </div>

          <p className="text-xs text-gray-400 pt-2">
            This screening result is not a medical diagnosis. Always consult a licensed healthcare provider.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-6">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} PhoenixLabs. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
