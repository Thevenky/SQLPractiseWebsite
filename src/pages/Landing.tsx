import { Link } from "react-router-dom";
import { levelMeta, levelOrder, questionsByLevel } from "../questions";

export default function Landing() {
  return (
    <div className="flex-1">
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Runs entirely in your browser — real SQL, no signup
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-4">
          Master SQL by Practicing.
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-8">
          Go from your first SELECT query to advanced SQL interview problems using real datasets and an in-browser
          SQL engine.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link
            to="/practice"
            className="px-5 py-2.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-[#06120c] font-semibold text-sm transition-colors"
          >
            Start Practicing
          </Link>
          <Link
            to="/practice"
            className="px-5 py-2.5 rounded-md border border-slate-700 hover:border-slate-500 text-slate-200 font-medium text-sm transition-colors"
          >
            Explore SQL Topics
          </Link>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-20 grid sm:grid-cols-3 gap-4">
        {levelOrder.map((lvl) => {
          const meta = levelMeta[lvl];
          const count = questionsByLevel[lvl].length;
          return (
            <Link
              key={lvl}
              to={`/practice?level=${lvl}`}
              className="group rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/70 hover:border-slate-700 p-6 transition-colors"
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">{meta.label}</div>
              <p className="text-slate-200 font-medium mb-3">{meta.tagline}</p>
              <div className="text-xs text-slate-500">{count} questions</div>
              <div className="mt-4 text-sm text-emerald-400 group-hover:translate-x-1 transition-transform inline-block">
                Start →
              </div>
            </Link>
          );
        })}
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-8 grid sm:grid-cols-3 gap-8">
          <Feature title="Real SQL engine" text="Every query runs against real, in-browser tables via DuckDB-WASM — nothing is faked." />
          <Feature title="Result-based grading" text="Multiple correct approaches are accepted — we check what your query returns, not exact text." />
          <Feature title="Guided learning" text="Progressive hints and full worked solutions teach you how to think about SQL, not just the answer." />
        </div>
      </section>
    </div>
  );
}

function Feature({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-white mb-1.5">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed">{text}</p>
    </div>
  );
}
