import type { ProcessingStep } from "../types";

export default function ProcessingChecklist({ fileName, steps, percent }: { fileName: string; steps: ProcessingStep[]; percent: number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
      <h3 className="text-sm font-semibold text-white mb-1">Processing PDF…</h3>
      <p className="text-xs text-slate-500 mb-4 truncate">{fileName}</p>
      <ul className="space-y-1.5 mb-4">
        {steps.map((s) => (
          <li key={s.key} className="flex items-center gap-2 text-sm">
            <span className="w-4 text-center">
              {s.status === "done" ? (
                <span className="text-emerald-400">✓</span>
              ) : s.status === "active" ? (
                <span className="text-sky-400 animate-pulse">⏳</span>
              ) : (
                <span className="text-slate-600">○</span>
              )}
            </span>
            <span className={s.status === "pending" ? "text-slate-500" : "text-slate-200"}>{s.label}</span>
          </li>
        ))}
      </ul>
      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
        <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${percent}%` }} />
      </div>
      <div className="text-right text-[11px] text-slate-500 mt-1">{percent}%</div>
    </div>
  );
}
