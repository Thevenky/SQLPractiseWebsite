import { useState } from "react";
import { useMyDbContext } from "../../mydb/MyDbContext";
import MyDbNav from "./MyDbNav";
import SchemaExplorer from "../../components/SchemaExplorer";
import SqlEditor from "../../components/SqlEditor";
import { DataTable } from "../../components/ResultsPanel";
import { explainSqlError, schemaInfoFromTables } from "../../mydb/sqlErrorExplain";
import { explainQuery } from "../../mydb/sqlExplain";
import type { DatasetDef, QueryResult } from "../../types";
import type { MyDbTable } from "../../mydb/types";

function toDatasetDef(name: string, tables: MyDbTable[]): DatasetDef {
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
  const { activeDatabase, ready, runSql } = useMyDbContext();
  const [sql, setSql] = useState("SELECT * FROM my_table LIMIT 20;");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [sqlError, setSqlError] = useState<ReturnType<typeof explainSqlError> | null>(null);
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<string[] | null>(null);

  const tables = activeDatabase?.tables ?? [];
  const dataset = toDatasetDef(activeDatabase?.name ?? "My Database", tables);

  const run = async () => {
    setLoading(true);
    setSqlError(null);
    setExplanation(null);
    try {
      const r = await runSql(sql);
      setResult(r);
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      setSqlError(explainSqlError(raw, schemaInfoFromTables(tables)));
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const explainMyQuery = () => {
    setExplanation(explainQuery(sql).lines);
  };

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

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <MyDbNav />
      <div className="flex-1 grid lg:grid-cols-[260px_1fr_1fr] min-h-0">
        <aside className="border-r border-slate-800 overflow-y-auto">
          {tables.length === 0 ? (
            <div className="p-4 text-xs text-slate-500">
              No tables yet. Go to Dashboard to create a table, import a CSV, or import SQL.
            </div>
          ) : (
            <SchemaExplorer dataset={dataset} onPreview={(t) => setSql(`SELECT * FROM ${t} LIMIT 20;`)} />
          )}
        </aside>
        <div className="border-r border-slate-800 flex flex-col min-h-0">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-[#0d1220]">
            <span className="text-xs text-slate-500">{activeDatabase.name} · ⌘/Ctrl + Enter to run</span>
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
            <button onClick={explainMyQuery} className="px-3 py-1.5 rounded-md border border-sky-700/60 hover:border-sky-500 text-sky-400 text-sm">
              Explain My Query
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
            {sqlError && (
              <div className="m-3 text-xs bg-rose-500/10 border border-rose-500/30 rounded-md px-3 py-2 space-y-1">
                <div className="text-rose-400 font-semibold">❌ {sqlError.title}</div>
                <div className="text-rose-300 whitespace-pre-line">{sqlError.message}</div>
                {sqlError.suggestion && <div className="text-emerald-400">{sqlError.suggestion}</div>}
                <details className="mt-1">
                  <summary className="text-rose-500/60 cursor-pointer">Technical Error</summary>
                  <div className="text-rose-500/70 font-mono mt-1">{sqlError.technical}</div>
                </details>
              </div>
            )}
            {explanation && (
              <div className="m-3 text-xs bg-sky-500/10 border border-sky-500/30 rounded-md px-3 py-2 space-y-1">
                <div className="text-sky-400 font-semibold mb-1">Explain My Query</div>
                {explanation.map((line, i) => (
                  <p key={i} className="text-slate-300">{line}</p>
                ))}
              </div>
            )}
            {result && !sqlError && (
              <>
                <div className="px-3 py-2 text-[11px] text-slate-500 flex gap-4">
                  <span>{result.rowCount} row{result.rowCount === 1 ? "" : "s"}</span>
                  <span>{result.execMs.toFixed(1)}ms</span>
                </div>
                <DataTable result={result} />
              </>
            )}
            {!result && !sqlError && !loading && !explanation && <div className="p-4 text-xs text-slate-600">Run a query to see results.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
