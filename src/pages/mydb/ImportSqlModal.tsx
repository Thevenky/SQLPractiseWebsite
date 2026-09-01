import { useState } from "react";
import { extractCreateTableBlocks, extractInsertBlocks } from "../../pdf-practice/sqlSchemaParse";

const PLACEHOLDER = `CREATE TABLE employees (
    employee_id INTEGER,
    first_name VARCHAR,
    dept_id INTEGER,
    salary INTEGER
);

INSERT INTO employees VALUES
(1, 'John', 10, 80000),
(2, 'Alice', 10, 95000),
(3, 'Mike', 20, 75000);`;

export default function ImportSqlModal({
  onClose,
  onImport,
}: {
  onClose: () => void;
  onImport: (sql: string) => Promise<{ tablesBefore: number; tablesAfter: number }>;
}) {
  const [sql, setSql] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ tables: number; rows: number } | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!sql.trim()) return setError("Paste some SQL to import.");
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const createdTables = extractCreateTableBlocks(sql).length;
      const insertBlocks = extractInsertBlocks(sql);
      const insertedRows = insertBlocks.reduce((n, b) => n + (b.match(/\)\s*,\s*\(/g)?.length ?? 0) + (b.match(/VALUES/i) ? 1 : 0), 0);
      await onImport(sql);
      setSuccess({ tables: createdTables, rows: insertedRows });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-[#0d1220] border border-slate-800 rounded-lg w-full max-w-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-white">Import SQL</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">✕</button>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-xs text-slate-500">
            Paste CREATE TABLE / INSERT statements. They'll run against My Database only.
          </p>
          <textarea
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            placeholder={PLACEHOLDER}
            rows={14}
            className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs font-mono text-slate-200"
          />
          {success && (
            <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-md px-3 py-2">
              ✓ Import successful — created {success.tables} table{success.tables === 1 ? "" : "s"}, inserted {success.rows} row
              {success.rows === 1 ? "" : "s"} (approx.)
            </div>
          )}
          {error && <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-md px-3 py-2">{error}</div>}
        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-800">
          <button onClick={onClose} className="px-3 py-1.5 rounded-md border border-slate-700 hover:border-slate-500 text-slate-300 text-sm">
            {success ? "Done" : "Cancel"}
          </button>
          {!success && (
            <button
              onClick={submit}
              disabled={saving}
              className="px-4 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-[#06120c] text-sm font-semibold"
            >
              {saving ? "Running…" : "Run Import"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
