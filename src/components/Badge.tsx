const difficultyColors: Record<string, string> = {
  beginner: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  easy: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  hard: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  expert: "bg-rose-500/15 text-rose-400 border-rose-500/30",
};

const levelColors: Record<string, string> = {
  beginner: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  intermediate: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  advanced: "bg-violet-500/15 text-violet-400 border-violet-500/30",
};

export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border capitalize ${difficultyColors[difficulty] ?? "bg-slate-700 text-slate-300"}`}>
      {difficulty}
    </span>
  );
}

export function LevelBadge({ level }: { level: string }) {
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border capitalize ${levelColors[level] ?? "bg-slate-700 text-slate-300"}`}>
      {level}
    </span>
  );
}

export function TopicBadge({ label }: { label: string }) {
  return (
    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border border-slate-700 bg-slate-800/70 text-slate-300">
      {label}
    </span>
  );
}
