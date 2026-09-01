import { useProgress } from "../progress/useProgress";
import { levelMeta } from "../questions";
import { allQuestions } from "../questions";

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden w-full">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

const barColor: Record<string, string> = {
  beginner: "bg-emerald-500",
  intermediate: "bg-sky-500",
  advanced: "bg-violet-500",
};

export default function ProgressPage() {
  const { state, stats, reset } = useProgress();

  const topicStats = (() => {
    const map = new Map<string, { attempts: number; solved: number; label: string }>();
    allQuestions.forEach((q) => {
      const p = state.questions[q.id];
      if (!p) return;
      const existing = map.get(q.topic) ?? { attempts: 0, solved: 0, label: q.topicLabel };
      existing.attempts += p.attempts;
      existing.solved += p.solved ? 1 : 0;
      map.set(q.topic, existing);
    });
    return Array.from(map.entries()).map(([topic, v]) => ({ topic, ...v }));
  })();

  const strengths = [...topicStats].sort((a, b) => b.solved - a.solved).slice(0, 3);
  const weaknesses = [...topicStats].filter((t) => t.solved === 0).slice(0, 5);

  return (
    <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-10">
      <h1 className="text-xl font-semibold text-white mb-1">SQL Progress</h1>
      <p className="text-sm text-slate-500 mb-8">Stored locally in your browser. No account needed.</p>

      <div className="space-y-4 mb-10">
        {stats.byLevel.map((b) => (
          <div key={b.level}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-slate-300 font-medium">{levelMeta[b.level].label}</span>
              <span className="text-slate-500 text-xs">
                {b.solved}/{b.total} ({b.pct}%)
              </span>
            </div>
            <Bar pct={b.pct} color={barColor[b.level]} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <Stat label="Questions solved" value={stats.totalSolved} />
        <Stat label="Success rate" value={`${stats.successRate}%`} />
        <Stat label="Current streak" value={`${state.streakDays} day${state.streakDays === 1 ? "" : "s"}`} />
        <Stat label="Attempted" value={stats.totalAttempted} />
      </div>

      <div className="grid sm:grid-cols-2 gap-8 mb-10">
        <div>
          <h2 className="text-sm font-semibold text-white mb-3">Topic strengths</h2>
          {strengths.length === 0 && <p className="text-xs text-slate-500">Solve a few questions to see your strengths.</p>}
          <ul className="space-y-1.5">
            {strengths.map((s) => (
              <li key={s.topic} className="text-sm text-slate-300 flex items-center justify-between">
                <span>{s.label}</span>
                <span className="text-emerald-400 text-xs">{s.solved} solved</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white mb-3">Needs practice</h2>
          {weaknesses.length === 0 && <p className="text-xs text-slate-500">No weak spots detected yet.</p>}
          <ul className="space-y-1.5">
            {weaknesses.map((w) => (
              <li key={w.topic} className="text-sm text-slate-300 flex items-center justify-between">
                <span>{w.label}</span>
                <span className="text-amber-400 text-xs">{w.attempts} attempt{w.attempts === 1 ? "" : "s"}, 0 solved</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <button
        onClick={() => {
          if (confirm("Reset all local progress? This can't be undone.")) reset();
        }}
        className="text-xs text-rose-400/80 hover:text-rose-400 underline underline-offset-2"
      >
        Reset all progress
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
      <div className="text-xl font-semibold text-white">{value}</div>
      <div className="text-[11px] text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}
