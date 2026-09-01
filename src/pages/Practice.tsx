import { useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { levelMeta, levelOrder, questionsByLevel, topicsForLevel, allQuestions } from "../questions";
import type { Level } from "../types";
import { DifficultyBadge, TopicBadge } from "../components/Badge";
import { useProgress } from "../progress/useProgress";

export default function Practice() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { state, stats, unlock, unlockEverything } = useProgress();

  const level = (params.get("level") as Level) || "beginner";
  const topicFilter = params.get("topic") || "all";

  const setLevel = (lvl: Level) => setParams({ level: lvl });
  const setTopic = (t: string) => setParams({ level, topic: t === "all" ? "" : t });

  const topics = topicsForLevel(level);
  const questions = useMemo(
    () => questionsByLevel[level].filter((q) => topicFilter === "all" || q.topic === topicFilter),
    [level, topicFilter]
  );

  const isLocked = level !== "beginner" && !state.unlockedLevels[level];

  const startRandom = () => {
    const pool = topicFilter === "all" ? questionsByLevel[level] : questions;
    const q = pool[Math.floor(Math.random() * pool.length)];
    if (q) navigate(`/practice/${q.id}?mode=random`);
  };

  const startInterview = () => {
    const pool = allQuestions;
    const q = pool[Math.floor(Math.random() * pool.length)];
    if (q) navigate(`/practice/${q.id}?mode=interview`);
  };

  return (
    <div className="flex-1 max-w-[1400px] w-full mx-auto px-4 py-6 grid lg:grid-cols-[240px_1fr] gap-6">
      <aside className="space-y-6">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-2">Levels</div>
          <div className="space-y-1">
            {levelOrder.map((lvl) => {
              const locked = lvl !== "beginner" && !state.unlockedLevels[lvl];
              const solvedCount = questionsByLevel[lvl].filter((q) => state.questions[q.id]?.solved).length;
              return (
                <button
                  key={lvl}
                  onClick={() => setLevel(lvl)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm text-left transition-colors ${
                    level === lvl ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {locked && <span className="text-[10px]">🔒</span>}
                    {levelMeta[lvl].label}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {solvedCount}/{questionsByLevel[lvl].length}
                  </span>
                </button>
              );
            })}
          </div>
          {level !== "beginner" && !state.unlockedLevels[level] && (
            <button
              onClick={() => unlock(level)}
              className="mt-2 text-[11px] text-sky-400 hover:text-sky-300 underline underline-offset-2"
            >
              Unlock manually
            </button>
          )}
        </div>

        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-2">Topics</div>
          <div className="space-y-1">
            <button
              onClick={() => setTopic("all")}
              className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
                topicFilter === "all" ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
              }`}
            >
              All topics
            </button>
            {topics.map((t) => (
              <button
                key={t.topic}
                onClick={() => setTopic(t.topic)}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-sm transition-colors ${
                  topicFilter === t.topic ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                }`}
              >
                <span>{t.label}</span>
                <span className="text-[11px] text-slate-600">{t.count}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-2">Practice modes</div>
          <div className="space-y-2">
            <button
              onClick={startRandom}
              className="w-full text-left px-3 py-2 rounded-md text-sm bg-slate-900/60 border border-slate-800 hover:border-slate-600 text-slate-300"
            >
              🎲 Random practice
            </button>
            <button
              onClick={startInterview}
              className="w-full text-left px-3 py-2 rounded-md text-sm bg-slate-900/60 border border-slate-800 hover:border-slate-600 text-slate-300"
            >
              ⏱️ Interview mode
            </button>
          </div>
        </div>

        <button onClick={unlockEverything} className="text-[11px] text-slate-600 hover:text-slate-400 underline underline-offset-2">
          Unlock all levels
        </button>
      </aside>

      <section>
        <div className="flex items-baseline justify-between mb-1">
          <h1 className="text-xl font-semibold text-white">{levelMeta[level].label}</h1>
          <span className="text-xs text-slate-500">
            {stats.byLevel.find((b) => b.level === level)?.solved ?? 0} / {questions.length} solved
          </span>
        </div>
        <p className="text-sm text-slate-500 mb-6">{levelMeta[level].tagline}</p>

        {isLocked ? (
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-8 text-center">
            <p className="text-slate-300 mb-3">
              This level is locked. Solve 60% of {levelMeta[level === "advanced" ? "intermediate" : "beginner"].label} questions to
              unlock it automatically, or unlock it manually.
            </p>
            <button
              onClick={() => unlock(level)}
              className="px-4 py-2 rounded-md bg-sky-500 hover:bg-sky-400 text-[#06121c] text-sm font-semibold"
            >
              Unlock {levelMeta[level].label}
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {questions.map((q) => {
              const solved = state.questions[q.id]?.solved;
              const attempted = state.questions[q.id]?.attempts;
              return (
                <Link
                  key={q.id}
                  to={`/practice/${q.id}`}
                  className="rounded-lg border border-slate-800 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-900/70 p-4 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <DifficultyBadge difficulty={q.difficulty} />
                      <TopicBadge label={q.topicLabel} />
                    </div>
                    {solved ? (
                      <span className="text-emerald-400 text-sm shrink-0">✓</span>
                    ) : attempted ? (
                      <span className="text-amber-400 text-sm shrink-0">•</span>
                    ) : null}
                  </div>
                  <div className="text-sm font-medium text-slate-200">{q.title}</div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
