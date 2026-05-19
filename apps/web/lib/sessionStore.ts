import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ScreenAnswer {
  screenId: number;
  value: unknown;
}

interface SessionState {
  sessionId: string | null;
  currentScreen: number;
  answers: ScreenAnswer[];
  isComplete: boolean;
  result: string | null;
  resultReason: string | null;

  setSessionId: (id: string) => void;
  setCurrentScreen: (screen: number) => void;
  saveLocalAnswer: (screenId: number, value: unknown) => void;
  setComplete: (result: string, reason: string) => void;
  reset: () => void;
}

const initialState = {
  sessionId: null,
  currentScreen: 1,
  answers: [],
  isComplete: false,
  result: null,
  resultReason: null,
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      ...initialState,
      setSessionId: (id) => set({ sessionId: id }),
      setCurrentScreen: (screen) => set({ currentScreen: screen }),
      saveLocalAnswer: (screenId, value) =>
        set((state) => {
          const existing = state.answers.findIndex((a) => a.screenId === screenId);
          const updated =
            existing >= 0
              ? state.answers.map((a, i) => (i === existing ? { screenId, value } : a))
              : [...state.answers, { screenId, value }];
          return { answers: updated };
        }),
      setComplete: (result, reason) =>
        set({ isComplete: true, result, resultReason: reason }),
      reset: () => set(initialState),
    }),
    {
      name: "glp1-session",
      partialize: (state) => ({
        sessionId: state.sessionId,
        currentScreen: state.currentScreen,
        answers: state.answers,
        isComplete: state.isComplete,
        result: state.result,
        resultReason: state.resultReason,
      }),
    }
  )
);
