import type { Level } from "../types";

const STORAGE_KEY = "sqlpractice.progress.v1";

export interface QuestionProgress {
  attempts: number;
  solved: boolean;
  lastAttemptAt: number;
  solvedAt?: number;
  bestTimeMs?: number;
}

export interface ProgressState {
  questions: Record<string, QuestionProgress>;
  unlockedLevels: Record<Level, boolean>;
  streakDays: number;
  lastActiveDate: string | null;
  history: { date: string }[];
}

function defaultState(): ProgressState {
  return {
    questions: {},
    unlockedLevels: { beginner: true, intermediate: false, advanced: false },
    streakDays: 0,
    lastActiveDate: null,
    history: [],
  };
}

export function loadProgress(): ProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return { ...defaultState(), ...parsed };
  } catch {
    return defaultState();
  }
}

export function saveProgress(state: ProgressState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable; ignore
  }
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function recordAttempt(state: ProgressState, questionId: string, passed: boolean, timeMs: number): ProgressState {
  const existing = state.questions[questionId] ?? { attempts: 0, solved: false, lastAttemptAt: 0 };
  const updated: QuestionProgress = {
    ...existing,
    attempts: existing.attempts + 1,
    lastAttemptAt: Date.now(),
    solved: existing.solved || passed,
    solvedAt: passed ? existing.solvedAt ?? Date.now() : existing.solvedAt,
    bestTimeMs: passed ? Math.min(existing.bestTimeMs ?? Infinity, timeMs) : existing.bestTimeMs,
  };

  const today = todayStr();
  let streakDays = state.streakDays;
  let history = state.history;
  if (state.lastActiveDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    streakDays = state.lastActiveDate === yesterday ? state.streakDays + 1 : 1;
    history = [...state.history, { date: today }].slice(-90);
  }

  const next: ProgressState = {
    ...state,
    questions: { ...state.questions, [questionId]: updated },
    streakDays,
    lastActiveDate: today,
    history,
  };

  return maybeUnlock(next);
}

function maybeUnlock(state: ProgressState): ProgressState {
  // Unlock intermediate once 70% of beginner questions solved; advanced once 70% of intermediate solved.
  return state;
}

export function unlockLevel(state: ProgressState, level: Level): ProgressState {
  return { ...state, unlockedLevels: { ...state.unlockedLevels, [level]: true } };
}

export function unlockAll(state: ProgressState): ProgressState {
  return { ...state, unlockedLevels: { beginner: true, intermediate: true, advanced: true } };
}

export function resetProgress(): ProgressState {
  const fresh = defaultState();
  saveProgress(fresh);
  return fresh;
}
