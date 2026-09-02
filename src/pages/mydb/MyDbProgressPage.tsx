import { useMyDbContext } from "../../mydb/MyDbContext";
import MyDbNav from "./MyDbNav";

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="border border-slate-800 rounded-lg p-4 bg-[#0d1220]">
      <div className="text-2xl font-semibold text-white">{value}</div>
      <div className={`text-xs mt-1 ${accent ?? "text-slate-500"}`}>{label}</div>
    </div>
  );
}

export default function MyDbProgressPage() {
  const { activeDatabase, ready, databases } = useMyDbContext();

  if (!ready) {
    return <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">Loading your database…</div>;
  }
  if (!activeDatabase) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <MyDbNav />
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">Create a database on the Dashboard first.</div>
      </div>
    );
  }

  const questions = activeDatabase.questions;
  const total = questions.length;
  const solved = questions.filter((q) => q.passed).length;
  const notAttempted = questions.filter((q) => q.attempts === 0).length;
  const needsPractice = questions.filter((q) => q.attempts > 0 && !q.passed).length;
  const totalAttempts = questions.reduce((n, q) => n + q.attempts, 0);
  const totalCorrect = questions.reduce((n, q) => n + q.correctAttempts, 0);
  const accuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

  const byDifficulty = (["beginner", "intermediate", "advanced"] as const).map((d) => ({
    difficulty: d,
    total: questions.filter((q) => q.difficulty === d).length,
    solved: questions.filter((q) => q.difficulty === d && q.passed).length,
  }));

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <MyDbNav />
      <div className="flex-1 overflow-y-auto p-6 max-w-3xl w-full mx-auto">
        <h1 className="text-lg font-semibold text-white mb-1">Custom Practice — {activeDatabase.name}</h1>
        <p className="text-xs text-slate-500 mb-6">Progress is tracked per database. Switch databases above to see progress for a different one.</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <StatCard label="Questions" value={total} />
          <StatCard label="Solved" value={solved} accent="text-emerald-400" />
          <StatCard label="Accuracy" value={`${accuracy}%`} accent="text-sky-400" />
          <StatCard label="Needs Practice" value={needsPractice} accent="text-amber-400" />
        </div>

        <div className="mb-8">
          <h2 className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-3">By Difficulty</h2>
          <div className="space-y-2">
            {byDifficulty.map((d) => (
              <div key={d.difficulty} className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-24 capitalize">{d.difficulty}</span>
                <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: d.total > 0 ? `${(d.solved / d.total) * 100}%` : "0%" }}
                  />
                </div>
                <span className="text-xs text-slate-500 w-16 text-right">{d.solved}/{d.total}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-600">
          Not attempted: {notAttempted} · Total attempts: {totalAttempts} ({totalCorrect} correct)
        </div>

        {databases.length > 1 && (
          <div className="mt-8 pt-6 border-t border-slate-800">
            <h2 className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-3">All My Databases</h2>
            <div className="space-y-1.5 text-xs">
              {databases.map((d) => {
                const s = d.questions.filter((q) => q.passed).length;
                return (
                  <div key={d.id} className="flex items-center justify-between text-slate-400">
                    <span>{d.name}</span>
                    <span>{s}/{d.questions.length} solved</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
