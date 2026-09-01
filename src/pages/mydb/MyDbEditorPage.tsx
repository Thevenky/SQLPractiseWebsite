import { useState } from "react";
import { useMyDbContext } from "../../mydb/MyDbContext";
import MyDbNav from "./MyDbNav";
import SchemaExplorer from "../../components/SchemaExplorer";
import SqlEditor from "../../components/SqlEditor";
import { DataTable, ErrorPanel } from "../../components/ResultsPanel";
import type { DatasetDef } from "../../types";
import type { QueryResult } from "../../types";

function toDatasetDef(name: string, tables: ReturnType<typeof useMyDbContext>["state"]["tables"]): DatasetDef {
  return {
    id: "mydb",
    name,
    description: "Your custom tables",
    ddl: "",
    seed: "",
    relationships: [],
    tables: tables.map((t) => ({
      name: t.name,
      description: `${t.rows.length} row${t.rows.length === 1 ? "" : "s"}`,
      columns: t.columns.map((c) => ({ name: c.name, type: c.type, pk: c.pk, nullable: c.nullable })),
    })),
  };
}

export default function MyDbEditorPage() {
  const { state, ready, runSql } = useMyDbContext();
  const [sql, setSql] = useState("SELECT * FROM my_table LIMIT 20;");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<{ message: string; technical: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const dataset = toDatasetDef(state.name, state.tables);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await runSql(sql);
      setResult(r);
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      setError({ message: raw.split("\n")[0], technical: raw });
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">Loading your database…</div>;
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <MyDbNav />
      <div className="flex-1 grid lg:grid-cols-[260px_1fr_1fr] min-h-0">
        <aside className="border-r border-slate-800 overflow-y-auto">
          {state.tables.length === 0 ? (
            <div className="p-4 text-xs text-slate-500">
              No tables yet. Go to Dashboard to create a table, import a CSV, or import SQL.
            </div>
          ) : (
            <SchemaExplorer dataset={dataset} onPreview={(t) => setSql(`SELECT * FROM ${t} LIMIT 20;`)} />
          )}
        </aside>
        <div className="border-r border-slate-800 flex flex-col min-h-0">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-[#0d1220]">
            <span className="text-xs text-slate-500">My Database · ⌘/Ctrl + Enter to run</span>
          </div>
          <div className="flex-1 min-h-[300px]">
            <SqlEditor value={sql} onChange={setSql} onRun={run} />
          </div>
          <div className="flex items-center gap-2 px-3 py-2 border-t border-slate-800 bg-[#0d1220]">
            <button
              onClick={run}
              disabled={loading}
              className="px-4 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-[#06120c] text-sm font-semibold"
            >
              Run Query
            </button>
            <button onClick={() => setSql("")} className="px-3 py-1.5 rounded-md border border-slate-700 hover:border-slate-500 text-slate-300 text-sm">
              Clear
            </button>
          </div>
        </div>
        <div className="flex flex-col min-h-0">
          <div className="px-3 py-2 border-b border-slate-800 bg-[#0d1220] text-xs text-slate-500">Query Results</div>
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
        </div>
      </div>
    </div>
  );
}
