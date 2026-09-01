import { useState } from "react";
import { useMyDbContext } from "../../mydb/MyDbContext";
import MyDbNav from "./MyDbNav";
import CreateTableModal from "./CreateTableModal";
import ImportCsvModal from "./ImportCsvModal";
import ImportSqlModal from "./ImportSqlModal";
import TableViewerModal from "./TableViewerModal";
import type { MyDbColumn } from "../../mydb/types";

export default function MyDatabasePage() {
  const {
    state,
    ready,
    busy,
    error,
    clearError,
    createTable,
    dropTable,
    importCsvAsTable,
    importSql,
    addRow,
    updateRow,
    deleteRow,
    resetDatabase,
    loadSampleDatabase,
    exportSql,
    setDatabaseName,
  } = useMyDbContext();

  const [modal, setModal] = useState<"create" | "csv" | "sql" | null>(null);
  const [viewingTable, setViewingTable] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(state.name);

  const table = state.tables.find((t) => t.name === viewingTable) ?? null;

  const download = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!ready) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">Loading your database…</div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <MyDbNav />
      <div className="flex-1 overflow-y-auto p-6 max-w-5xl w-full mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-lg font-semibold text-white"
                />
                <button
                  onClick={() => {
                    setDatabaseName(nameDraft || "My Database");
                    setEditingName(false);
                  }}
                  className="text-xs text-emerald-400"
                >
                  Save
                </button>
              </div>
            ) : (
              <h1
                className="text-xl font-semibold text-white cursor-pointer hover:text-emerald-400"
                onClick={() => {
                  setNameDraft(state.name);
                  setEditingName(true);
                }}
                title="Click to rename"
              >
                {state.name}
              </h1>
            )}
            <p className="text-xs text-slate-500 mt-1">
              Your own tables and data, isolated from the built-in practice databases and PDF Practice.
            </p>
          </div>
          {state.tables.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => download(`${state.name.replace(/\s+/g, "_")}.sql`, exportSql())}
                className="text-xs px-3 py-1.5 rounded-md border border-slate-700 hover:border-slate-500 text-slate-300"
              >
                Export Database
              </button>
              <button
                onClick={() => setConfirmReset(true)}
                className="text-xs px-3 py-1.5 rounded-md border border-rose-700/60 hover:border-rose-500 text-rose-400"
              >
                Reset Database
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-md px-3 py-2 flex items-center justify-between">
            <span>{error.message}</span>
            <button onClick={clearError} className="text-rose-400/60 hover:text-rose-300">✕</button>
          </div>
        )}

        {state.tables.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-slate-800 rounded-lg">
            <p className="text-slate-400 mb-1">Your database is empty.</p>
            <p className="text-slate-600 text-sm mb-6">Create your first table to start practicing SQL.</p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <button onClick={() => setModal("create")} className="px-4 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-[#06120c] text-sm font-semibold">
                Create Table
              </button>
              <button onClick={() => setModal("csv")} className="px-4 py-1.5 rounded-md border border-slate-700 hover:border-slate-500 text-slate-300 text-sm">
                Import CSV
              </button>
              <button onClick={() => setModal("sql")} className="px-4 py-1.5 rounded-md border border-slate-700 hover:border-slate-500 text-slate-300 text-sm">
                Import SQL
              </button>
              <button
                disabled={busy}
                onClick={() => loadSampleDatabase()}
                className="px-4 py-1.5 rounded-md border border-sky-700/60 hover:border-sky-500 text-sky-400 text-sm"
              >
                Use Sample Employees Database
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
              {state.tables.map((t) => (
                <div key={t.name} className="border border-slate-800 rounded-lg p-4 bg-[#0d1220]">
                  <div className="font-mono font-medium text-slate-100">{t.name}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {t.rows.length} row{t.rows.length === 1 ? "" : "s"} · {t.columns.length} column{t.columns.length === 1 ? "" : "s"}
                  </div>
                  <div className="flex items-center gap-3 mt-3 text-[11px]">
                    <button onClick={() => setViewingTable(t.name)} className="text-sky-400 hover:text-sky-300">View Data</button>
                    <button onClick={() => setViewingTable(t.name)} className="text-slate-400 hover:text-slate-200">Schema</button>
                    <button onClick={() => dropTable(t.name)} className="text-rose-500/80 hover:text-rose-400 ml-auto">Delete</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => setModal("create")} className="px-3 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-[#06120c] text-sm font-semibold">
                + Create Table
              </button>
              <button onClick={() => setModal("csv")} className="px-3 py-1.5 rounded-md border border-slate-700 hover:border-slate-500 text-slate-300 text-sm">
                Import CSV
              </button>
              <button onClick={() => setModal("sql")} className="px-3 py-1.5 rounded-md border border-slate-700 hover:border-slate-500 text-slate-300 text-sm">
                Import SQL
              </button>
            </div>
          </>
        )}
      </div>

      {modal === "create" && <CreateTableModal onClose={() => setModal(null)} onCreate={createTable} />}
      {modal === "csv" && <ImportCsvModal onClose={() => setModal(null)} onImport={importCsvAsTable} />}
      {modal === "sql" && <ImportSqlModal onClose={() => setModal(null)} onImport={importSql} />}
      {table && (
        <TableViewerModal
          table={table}
          onClose={() => setViewingTable(null)}
          onAddRow={(row) => addRow(table.name, row)}
          onUpdateRow={(pkCol, pkValue, patch) => updateRow(table.name, pkCol, pkValue, patch)}
          onDeleteRow={(pkCol, pkValue) => deleteRow(table.name, pkCol, pkValue)}
        />
      )}
      {confirmReset && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#0d1220] border border-slate-800 rounded-lg w-full max-w-sm p-4">
            <p className="text-sm text-slate-200 mb-1">This will delete all tables and data in My Database.</p>
            <p className="text-xs text-slate-500 mb-4">
              Built-in practice databases, PDF Practice, and your progress are not affected.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setConfirmReset(false)} className="px-3 py-1.5 rounded-md border border-slate-700 text-slate-300 text-sm">
                Cancel
              </button>
              <button
                onClick={async () => {
                  await resetDatabase();
                  setConfirmReset(false);
                }}
                className="px-3 py-1.5 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold"
              >
                Reset Database
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// re-export for callers that only need the column type shape
export type { MyDbColumn };
