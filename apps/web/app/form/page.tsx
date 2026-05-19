"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/lib/sessionStore";
import { startSession, getSession, saveAnswer } from "@/lib/api";
import { ProgressBar } from "@/components/ProgressBar";
import { FormScreen } from "@/components/FormScreen";
import formSchema from "@/lib/formSchema";

const TOTAL_SCREENS = 15;

export default function FormPage() {
  const router = useRouter();
  const store = useSessionStore();
  const [loading, setLoading] = useState(true);
  const [currentScreenDef, setCurrentScreenDef] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigatingRef = useRef(false);
  const [hydrated, setHydrated] = useState(false);

  // Wait for Zustand persist rehydration before running init logic
  useEffect(() => {
    const unsub = useSessionStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    // If already hydrated (e.g., SSR or fast rehydration)
    if (useSessionStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return () => { unsub(); };
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    // If the session is already complete, redirect immediately
    if (store.isComplete) {
      router.replace("/form/result");
      return;
    }

    async function init() {
      try {
        if (store.sessionId) {
          const data = await getSession(store.sessionId);
          if (data.isComplete) {
            store.setComplete(data.result, data.resultReason);
            router.replace("/form/result");
            return;
          }
          store.setCurrentScreen(data.currentScreen);
          const screenDef = formSchema.screens.find((s) => s.id === data.currentScreen);
          setCurrentScreenDef(screenDef);
        } else {
          const data = await startSession();
          store.setSessionId(data.sessionId);
          store.setCurrentScreen(1);
          setCurrentScreenDef(data.screen);
        }
      } catch (e) {
        setError("Failed to load form. Please refresh and try again.");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [hydrated]);

  async function handleNext(value: unknown) {
    if (!store.sessionId || navigatingRef.current) return;
    setSubmitting(true);
    setError(null);
    try {
      store.saveLocalAnswer(store.currentScreen, value);
      const result = await saveAnswer(store.sessionId, store.currentScreen, value);

      if (result.done) {
        navigatingRef.current = true;
        store.setComplete(result.result, result.reason);
        router.push("/form/result");
        return;
      }

      store.setCurrentScreen(result.nextScreen);
      setCurrentScreenDef(result.screen);
    } catch (e: any) {
      // If session is already complete (400), navigate to result
      if (e?.message?.includes("already complete") || e?.message?.includes("Session is already complete") || store.isComplete) {
        navigatingRef.current = true;
        // Attempt to fetch the session to get the result
        if (store.sessionId && !store.isComplete) {
          try {
            const data = await getSession(store.sessionId);
            if (data.isComplete) {
              store.setComplete(data.result, data.resultReason);
            }
          } catch { /* proceed to result page anyway */ }
        }
        router.push("/form/result");
        return;
      }
      setError("Failed to save answer. Please try again.");
    } finally {
      if (!navigatingRef.current) {
        setSubmitting(false);
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" aria-live="polite" aria-busy="true">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-gray-500">Loading your screening...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4" role="alert">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md text-center space-y-3">
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-red-700 underline hover:no-underline"
          >
            Refresh page
          </button>
        </div>
      </div>
    );
  }

  if (!currentScreenDef) return null;

  const previousAnswer = store.answers.find((a) => a.screenId === store.currentScreen)?.value;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50/30 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-gray-700">PhoenixLabs</span>
            </div>
            <span className="text-sm text-gray-500 font-medium">
              Step {store.currentScreen} of {TOTAL_SCREENS}
            </span>
          </div>
          <ProgressBar current={store.currentScreen} total={TOTAL_SCREENS} />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-2xl">
          <FormScreen
            key={currentScreenDef.id}
            screen={currentScreenDef}
            previousAnswer={previousAnswer}
            onNext={handleNext}
            submitting={submitting}
            allAnswers={store.answers}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white/60 border-t border-gray-100 py-4">
        <div className="max-w-2xl mx-auto px-4">
          <p className="text-xs text-gray-400 text-center">
            This screening tool is for informational purposes only and does not constitute medical advice.
            Your responses are confidential and encrypted.
          </p>
        </div>
      </footer>
    </div>
  );
}
