import { useState } from "react";
import type { Question } from "../types";
import { DifficultyBadge, LevelBadge, TopicBadge } from "./Badge";

export function HintPanel({ question, hideHints }: { question: Question; hideHints?: boolean }) {
  const [revealed, setRevealed] = useState(0);

  if (hideHints) {
    return (
      <div className="text-xs text-slate-500 italic px-1">
        Hints are disabled in Interview Mode.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {question.hints.slice(0, revealed).map((h, i) => (
        <div key={i} className="text-sm bg-slate-800/50 border border-slate-700/60 rounded-md px-3 py-2 text-slate-300">
          <span className="text-sky-400 font-semibold mr-1.5">Hint {i + 1}</span>
          {h}
        </div>
      ))}
      {revealed < question.hints.length ? (
        <button
          onClick={() => setRevealed((r) => r + 1)}
          className="text-xs font-medium text-sky-400 hover:text-sky-300 border border-sky-500/30 hover:border-sky-500/50 rounded-md px-3 py-1.5 transition-colors"
        >
          Show hint {revealed + 1} of {question.hints.length}
        </button>
      ) : (
        <p className="text-xs text-slate-500">No more hints — you've got everything you need.</p>
      )}
    </div>
  );
}

export function SolutionPanel({ question }: { question: Question }) {
  const [shown, setShown] = useState(false);

  if (!shown) {
    return (
      <button
        onClick={() => setShown(true)}
        className="text-xs font-medium text-violet-400 hover:text-violet-300 border border-violet-500/30 hover:border-violet-500/50 rounded-md px-3 py-1.5 transition-colors"
      >
        Show Solution
      </button>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      <div>
        <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Concept</div>
        <p className="text-violet-300">{question.concept}</p>
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Thought process</div>
        <ul className="list-disc list-inside space-y-1 text-slate-300">
          {question.thoughtProcess.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Solution query</div>
        <pre className="bg-black/40 border border-slate-800 rounded-md p-3 text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap">
          {question.solution}
        </pre>
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Explanation</div>
        <p className="text-slate-300">{question.explanation}</p>
      </div>
      <button onClick={() => setShown(false)} className="text-xs text-slate-500 hover:text-slate-300 underline underline-offset-2">
        Hide solution
      </button>
    </div>
  );
}

export function QuestionHeader({ question }: { question: Question }) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        <LevelBadge level={question.level} />
        <DifficultyBadge difficulty={question.difficulty} />
        <TopicBadge label={question.topicLabel} />
      </div>
      <h1 className="text-lg font-semibold text-white mb-2">{question.title}</h1>
      <p className="text-sm text-slate-300 leading-relaxed">{question.description}</p>
    </div>
  );
}
