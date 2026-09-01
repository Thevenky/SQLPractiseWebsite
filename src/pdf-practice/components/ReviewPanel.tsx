import { useState } from "react";
import type { StagedSet } from "../buildPracticeSet";

export default function ReviewPanel({
  staged,
  onCreate,
  onDiscard,
}: {
  staged: StagedSet;
  onCreate: (name: string) => void;
  onDiscard: () => void;
}) {
  const [name, setName] = useState(staged.suggestedName);
  const [showQuestions, setShowQuestions] = useState(false);
  const { extraction } = staged;
  const answered = extraction.questions.filter((q) => q.hasAnswer).length;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-white">Review Imported Content</h3>
        <span className="text-[11px] text-slate-500">{staged.file.name}</span>
      </div>
      <p className="text-xs text-slate-500 mb-4">{extraction.pageCount} page(s) processed.</p>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <Stat label="Tables detected" value={extraction.tables.length} />
        <Stat label="Questions detected" value={extraction.questions.length} />
        <Stat label="Answers detected" value={answered} />
      </div>

      {extraction.warnings.length > 0 && (
        <div className="space-y-1.5 mb-4">
          {extraction.warnings.map((w, i) => (
            <div key={i} className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-md px-3 py-2">
              ⚠ {w}
            </div>
          ))}
        </div>
      )}

      <div className="mb-4">
        <label className="text-xs text-slate-500 block mb-1">Practice set name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-200"
        />
      </div>

      <button
        onClick={() => setShowQuestions((s) => !s)}
        className="text-xs text-sky-400 hover:text-sky-300 underline underline-offset-2 mb-3"
      >
        {showQuestions ? "Hide" : "Review"} extracted questions ({extraction.questions.length})
      </button>

      {showQuestions && (
        <div className="max-h-64 overflow-y-auto space-y-2 mb-4 border border-slate-800 rounded-md p-2">
          {extraction.questions.length === 0 && <p className="text-xs text-slate-500 p-2">No questions detected.</p>}
          {extraction.questions.map((q) => (
            <div key={q.id} className="text-xs bg-slate-800/50 rounded-md p-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-400 font-mono">#{q.index}</span>
                {q.hasAnswer ? (
                  <span className="text-emerald-400">✓ answer found</span>
                ) : (
                  <span className="text-amber-400">⚠ no answer</span>
                )}
              </div>
              <p className="text-slate-300">{q.text}</p>
            </div>
          ))}
        </div>
      )}

      {extraction.tables.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-slate-500 mb-1.5">Detected tables</div>
          <div className="flex flex-wrap gap-1.5">
            {extraction.tables.map((t) => (
              <span key={t.name} className="text-[11px] font-mono bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-slate-300">
                {t.name} ({t.columns.length})
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={() => onCreate(name.trim() || staged.suggestedName)}
          className="px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-[#06120c] text-sm font-semibold"
        >
          Create Practice Set
        </button>
        <button onClick={onDiscard} className="px-3 py-2 rounded-md border border-slate-700 hover:border-slate-500 text-slate-300 text-sm">
          Discard
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-center">
      <div className="text-lg font-semibold text-white">{value}</div>
      <div className="text-[10px] text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}
