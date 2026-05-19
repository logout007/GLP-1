import { describe, it, expect, beforeEach } from "vitest";

// Mock localStorage for Zustand persist
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

// Must import after localStorage mock is set up
import { useSessionStore } from "./sessionStore";

describe("sessionStore", () => {
  beforeEach(() => {
    localStorageMock.clear();
    useSessionStore.setState({
      sessionId: null,
      currentScreen: 1,
      answers: [],
      isComplete: false,
      result: null,
      resultReason: null,
    });
  });

  it("initializes with default state", () => {
    const state = useSessionStore.getState();
    expect(state.sessionId).toBeNull();
    expect(state.currentScreen).toBe(1);
    expect(state.answers).toEqual([]);
    expect(state.isComplete).toBe(false);
  });

  it("setSessionId updates sessionId", () => {
    useSessionStore.getState().setSessionId("test-123");
    expect(useSessionStore.getState().sessionId).toBe("test-123");
  });

  it("setCurrentScreen updates currentScreen", () => {
    useSessionStore.getState().setCurrentScreen(5);
    expect(useSessionStore.getState().currentScreen).toBe(5);
  });

  it("saveLocalAnswer adds a new answer", () => {
    useSessionStore.getState().saveLocalAnswer(1, 35);
    const answers = useSessionStore.getState().answers;
    expect(answers).toHaveLength(1);
    expect(answers[0]).toEqual({ screenId: 1, value: 35 });
  });

  it("saveLocalAnswer updates existing answer for same screenId", () => {
    useSessionStore.getState().saveLocalAnswer(1, 35);
    useSessionStore.getState().saveLocalAnswer(1, 40);
    const answers = useSessionStore.getState().answers;
    expect(answers).toHaveLength(1);
    expect(answers[0]).toEqual({ screenId: 1, value: 40 });
  });

  it("setComplete marks session as complete", () => {
    useSessionStore.getState().setComplete("Eligible", "All criteria met");
    const state = useSessionStore.getState();
    expect(state.isComplete).toBe(true);
    expect(state.result).toBe("Eligible");
    expect(state.resultReason).toBe("All criteria met");
  });

  it("reset returns to initial state", () => {
    useSessionStore.getState().setSessionId("test-123");
    useSessionStore.getState().setCurrentScreen(7);
    useSessionStore.getState().saveLocalAnswer(1, 35);
    useSessionStore.getState().reset();
    const state = useSessionStore.getState();
    expect(state.sessionId).toBeNull();
    expect(state.currentScreen).toBe(1);
    expect(state.answers).toEqual([]);
  });
});
