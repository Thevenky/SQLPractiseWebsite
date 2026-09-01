import { useState } from "react";
import type { QueryResult, ValidationResult } from "../types";

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") return String(v);
  return String(v);
}

export function DataTable({ result }: { result: QueryResult }) {
  if (result.columns.length === 0) {
    return <div className="text-xs text-slate-500 px-3 py-4">Query executed. No columns returned.</div>;
  }
  if (result.rowCount === 0) {
    return (
      <div className="text-xs text-slate-500 px-3 py-4">
        Query executed successfully — 0 rows returned.
      </div>
    );
  }
  return (
    <div className="overflow-auto max-h-full">
      <table className="min-w-full text-xs border-collapse">
        <thead className="sticky top-0 bg-[#0d1220] z-10">
          <tr>
            {result.columns.map((c) => (
              <th key={c} className="text-left font-mono font-semibold text-slate-300 px-3 py-2 border-b border-slate-800 whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, i) => (
            <tr key={i} className="odd:bg-slate-900/30 hover:bg-slate-800/50">
              {result.columns.map((c) => {
                const v = row[c];
                const isNull = v === null || v === undefined;
                return (
                  <td
                    key={c}
                    className={`px-3 py-1.5 border-b border-slate-800/60 font-mono whitespace-nowrap ${
                      isNull ? "text-slate-600 italic" : "text-slate-300"
                    }`}
                  >
                    {isNull ? "NULL" : formatCell(v)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ErrorPanel({ message, technical }: { message: string; technical: string }) {
  const [showTech, setShowTech] = useState(false);
  return (
    <div className="px-4 py-3 bg-rose-500/10 border border-rose-500/30 rounded-md m-3 text-sm">
      <div className="flex items-center gap-2 text-rose-400 font-semibold mb-1">
        <span>✗</span>
        <span>SQL Error</span>
      </div>
      <p className="text-rose-200/90">{message}</p>
      <button
        onClick={() => setShowTech((s) => !s)}
        className="text-[11px] text-rose-400/70 hover:text-rose-300 mt-2 underline underline-offset-2"
      >
        {showTech ? "Hide" : "Show"} technical error
      </button>
      {showTech && (
        <pre className="mt-2 text-[11px] text-rose-300/80 whitespace-pre-wrap font-mono bg-black/20 p-2 rounded">
          {technical}
        </pre>
      )}
    </div>
  );
}

export function ValidationBanner({ result, execMs, rowCount }: { result: ValidationResult; execMs: number; rowCount: number }) {
  const pass = result.status === "pass";
  return (
    <div
      className={`px-4 py-3 m-3 rounded-md border text-sm ${
        pass ? "bg-emerald-500/10 border-emerald-500/30" : "bg-amber-500/10 border-amber-500/30"
      }`}
    >
      <div className={`flex items-center gap-2 font-semibold ${pass ? "text-emerald-400" : "text-amber-400"}`}>
        <span>{pass ? "✓" : "✗"}</span>
        <span>{pass ? "Correct!" : "Not quite"}</span>
      </div>
      {!pass && <p className="text-amber-200/80 mt-1">{result.detail ?? result.message}</p>}
      <div className="mt-2 text-[11px] text-slate-500 flex gap-4">
        <span>{rowCount} row{rowCount === 1 ? "" : "s"} returned</span>
        <span>Execution time: {execMs.toFixed(1)}ms</span>
      </div>
    </div>
  );
}
