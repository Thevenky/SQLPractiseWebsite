import { useEffect, useState } from "react";
import { datasets } from "../data";
import SchemaExplorer from "../components/SchemaExplorer";
import SqlEditor from "../components/SqlEditor";
import { DataTable, ErrorPanel } from "../components/ResultsPanel";
import { runQuery, friendlyError, resetDb, ensureDb } from "../sql-engine/duckdb";
import { useQueryHistory } from "../progress/useQueryHistory";
import type { QueryResult } from "../types";

const SAMPLE_QUERIES: Record<string, { label: string; sql: string }[]> = {
  healthcare: [
    { label: "All patients", sql: "SELECT * FROM patients LIMIT 20;" },
    { label: "Admissions with diagnosis counts", sql: "SELECT diagnosis, COUNT(*) FROM admissions GROUP BY diagnosis ORDER BY 2 DESC;" },
  ],
  ecommerce: [
    { label: "Top 5 products by price", sql: "SELECT name, price FROM products ORDER BY price DESC LIMIT 5;" },
    { label: "Revenue by category", sql: "SELECT c.name, SUM(oi.price * oi.quantity) AS revenue FROM order_items oi JOIN products p ON oi.product_id = p.id JOIN categories c ON p.category_id = c.id GROUP BY c.name ORDER BY revenue DESC;" },
  ],
  company: [
    { label: "Employee count per department", sql: "SELECT d.dept_name, COUNT(e.employee_id) AS n FROM departments d LEFT JOIN employees e ON d.dept_id = e.dept_id GROUP BY d.dept_name;" },
    { label: "Top earners", sql: "SELECT first_name, last_name, salary FROM employees ORDER BY salary DESC LIMIT 5;" },
  ],
};

export default function Playground() {
  const [datasetId, setDatasetId] = useState("company");
  const [sql, setSql] = useState("SELECT * FROM employees LIMIT 20;");
  const [dbReady, setDbReady] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<{ message: string; technical: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const { history, addEntry, removeEntry, clearAll } = useQueryHistory();
  const [previewTable, setPreviewTable] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<QueryResult | null>(null);

  const dataset = datasets.find((d) => d.id === datasetId)!;

  useEffect(() => {
    ensureDb().then(() => setDbReady(true));
  }, []);

  useEffect(() => {
    if (!previewTable) {
      setPreviewData(null);
      return;
    }
    runQuery(`SELECT * FROM ${previewTable} LIMIT 20`).then(setPreviewData).catch(() => {});
  }, [previewTable]);

  const run = async (queryOverride?: string) => {
    const q = queryOverride ?? sql;
    setLoading(true);
    setError(null);
    try {
      const r = await runQuery(q);
      setResult(r);
      addEntry(q, datasetId);
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      const fe = friendlyError(raw, q);
      setError({ message: fe.message, technical: raw });
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    await resetDb();
    setLoading(false);
    setResult(null);
    setError(null);
  };

  return (
    <div className="flex-1 grid lg:grid-cols-[280px_1fr_1fr] min-h-0">
      <aside className="border-r border-slate-800 flex flex-col min-h-0 overflow-y-auto">
        <div className="p-3 border-b border-slate-800">
          <label className="text-xs uppercase tracking-wide text-slate-500 font-semibold block mb-1.5">Database</label>
          <select
            value={datasetId}
            onChange={(e) => setDatasetId(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-sm text-slate-200"
          >
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500 mt-1.5">{dataset.description}</p>
        </div>
        <SchemaExplorer dataset={dataset} onPreview={setPreviewTable} />
        <div className="p-3 border-t border-slate-800">
          <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-1.5">Sample queries</div>
          <div className="space-y-1">
            {(SAMPLE_QUERIES[datasetId] ?? []).map((s) => (
              <button
                key={s.label}
                onClick={() => setSql(s.sql)}
                className="w-full text-left text-xs px-2 py-1.5 rounded-md bg-slate-900/60 hover:bg-slate-800 text-slate-300 border border-slate-800"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <div className="border-r border-slate-800 flex flex-col min-h-0">
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-[#0d1220]">
          <span className="text-xs text-slate-500">SQL Playground · {dataset.name} · ⌘/Ctrl + Enter to run</span>
        </div>
        <div className="flex-1 min-h-[300px]">
          <SqlEditor value={sql} onChange={setSql} onRun={() => run()} />
        </div>
        <div className="flex items-center gap-2 px-3 py-2 border-t border-slate-800 bg-[#0d1220]">
          <button
            onClick={() => run()}
            disabled={!dbReady || loading}
            className="px-4 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-[#06120c] text-sm font-semibold"
          >
            {dbReady ? "Run" : "Loading…"}
          </button>
          <button onClick={handleReset} className="px-3 py-1.5 rounded-md border border-slate-700 hover:border-slate-500 text-slate-300 text-sm">
            Reset Database
          </button>
        </div>
        <div className="border-t border-slate-800 max-h-48 overflow-y-auto">
          <div className="flex items-center justify-between px-3 py-1.5">
            <span className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Recent queries</span>
            {history.length > 0 && (
              <button onClick={clearAll} className="text-[11px] text-slate-600 hover:text-slate-400">
                clear all
              </button>
            )}
          </div>
          <div className="px-3 pb-2 space-y-1">
            {history.length === 0 && <p className="text-[11px] text-slate-600">No queries yet.</p>}
            {history.slice(0, 10).map((h, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px] font-mono text-slate-400 bg-slate-900/50 rounded px-2 py-1">
                <span className="flex-1 truncate">{h.sql}</span>
                <button onClick={() => setSql(h.sql)} className="text-sky-400 hover:text-sky-300 shrink-0">
                  re-run
                </button>
                <button onClick={() => navigator.clipboard?.writeText(h.sql)} className="text-slate-500 hover:text-slate-300 shrink-0">
                  copy
                </button>
                <button onClick={() => removeEntry(i)} className="text-rose-500/70 hover:text-rose-400 shrink-0">
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col min-h-0">
        {previewTable ? (
          <>
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-[#0d1220]">
              <span className="text-xs text-slate-400 font-mono">Preview: {previewTable}</span>
              <button onClick={() => setPreviewTable(null)} className="text-xs text-slate-500 hover:text-slate-300">
                close ✕
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-auto">
              {previewData ? <DataTable result={previewData} /> : <div className="p-4 text-xs text-slate-500">Loading…</div>}
            </div>
          </>
        ) : (
          <>
            <div className="px-3 py-2 border-b border-slate-800 bg-[#0d1220] text-xs text-slate-500">Result</div>
            <div className="flex-1 min-h-0 overflow-auto">
              {loading && <div className="p-4 text-xs text-slate-500">Running…</div>}
              {error && <ErrorPanel message={error.message} technical={error.technical} />}
              {result && !error && (
                <>
                  <div className="px-3 py-2 text-[11px] text-slate-500 flex gap-4">
                    <span>{result.rowCount} row{result.rowCount === 1 ? "" : "s"}</span>
                    <span>{result.execMs.toFixed(1)}ms</span>
                  </div>
                  <DataTable result={result} />
                </>
              )}
              {!result && !error && !loading && <div className="p-4 text-xs text-slate-600">Run a query to see results.</div>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
