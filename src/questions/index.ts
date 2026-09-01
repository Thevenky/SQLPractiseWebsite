import type { Question, Level } from "../types";
import { beginnerQuestions } from "./beginner";
import { intermediateQuestions } from "./intermediate";
import { advancedQuestions } from "./advanced";

export const allQuestions: Question[] = [...beginnerQuestions, ...intermediateQuestions, ...advancedQuestions];

export const questionsByLevel: Record<Level, Question[]> = {
  beginner: beginnerQuestions,
  intermediate: intermediateQuestions,
  advanced: advancedQuestions,
};

export const questionById = (id: string): Question | undefined => allQuestions.find((q) => q.id === id);

export const topicsForLevel = (level: Level): { topic: string; label: string; count: number }[] => {
  const map = new Map<string, { topic: string; label: string; count: number }>();
  for (const q of questionsByLevel[level]) {
    const existing = map.get(q.topic);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(q.topic, { topic: q.topic, label: q.topicLabel, count: 1 });
    }
  }
  return Array.from(map.values());
};

export const allTopics = (): { topic: string; label: string; count: number; level: Level }[] => {
  const out: { topic: string; label: string; count: number; level: Level }[] = [];
  (["beginner", "intermediate", "advanced"] as Level[]).forEach((lvl) => {
    topicsForLevel(lvl).forEach((t) => out.push({ ...t, level: lvl }));
  });
  return out;
};

export const levelOrder: Level[] = ["beginner", "intermediate", "advanced"];

export const levelMeta: Record<Level, { label: string; tagline: string; color: string }> = {
  beginner: { label: "Beginner", tagline: "Build your SQL fundamentals", color: "emerald" },
  intermediate: { label: "Intermediate", tagline: "Master JOINs, subqueries and aggregation", color: "sky" },
  advanced: { label: "Advanced", tagline: "Solve window functions and interview-level problems", color: "violet" },
};
