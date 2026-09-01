import { useCallback, useEffect, useState } from "react";
import type { ProgressState } from "./progress";
import { loadProgress, saveProgress, recordAttempt, unlockLevel, unlockAll, resetProgress } from "./progress";
import type { Level } from "../types";
import { allQuestions, questionsByLevel } from "../questions";

export function useProgress() {
  const [state, setState] = useState<ProgressState>(() => loadProgress());

  useEffect(() => {
    saveProgress(state);
  }, [state]);

  const record = useCallback((questionId: string, passed: boolean, timeMs: number) => {
    setState((prev) => {
      const next = recordAttempt(prev, questionId, passed, timeMs);
      // Auto-unlock next level at 60% solved
      (["beginner", "intermediate"] as Level[]).forEach((lvl, i) => {
        const qs = questionsByLevel[lvl];
        const solvedCount = qs.filter((q) => next.questions[q.id]?.solved).length;
        if (qs.length > 0 && solvedCount / qs.length >= 0.6) {
          const nextLevel: Level = i === 0 ? "intermediate" : "advanced";
          if (!next.unlockedLevels[nextLevel]) {
            next.unlockedLevels = { ...next.unlockedLevels, [nextLevel]: true };
          }
        }
      });
      return { ...next };
    });
  }, []);

  const unlock = useCallback((level: Level) => {
    setState((prev) => unlockLevel(prev, level));
  }, []);

  const unlockEverything = useCallback(() => {
    setState((prev) => unlockAll(prev));
  }, []);

  const reset = useCallback(() => {
    setState(resetProgress());
  }, []);

  const stats = {
    totalSolved: Object.values(state.questions).filter((q) => q.solved).length,
    totalAttempted: Object.values(state.questions).filter((q) => q.attempts > 0).length,
    totalQuestions: allQuestions.length,
    successRate: (() => {
      const attempts = Object.values(state.questions).reduce((a, q) => a + q.attempts, 0);
      const solved = Object.values(state.questions).filter((q) => q.solved).length;
      return attempts === 0 ? 0 : Math.round((solved / attempts) * 100);
    })(),
    byLevel: (["beginner", "intermediate", "advanced"] as Level[]).map((lvl) => {
      const qs = questionsByLevel[lvl];
      const solved = qs.filter((q) => state.questions[q.id]?.solved).length;
      return { level: lvl, solved, total: qs.length, pct: qs.length ? Math.round((solved / qs.length) * 100) : 0 };
    }),
  };

  return { state, record, unlock, unlockEverything, reset, stats };
}
