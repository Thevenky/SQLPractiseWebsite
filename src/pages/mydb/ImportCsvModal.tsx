import { useState } from "react";
import { parseCsv, inferColumns, type CsvParseResult } from "../../mydb/csv";
import { SQL_TYPES, type MyDbColumn } from "../../mydb/types";

export default function ImportCsvModal({
  onClose,
  onImport,
}: {
  onClose: () => void;
  onImport: (tableName: string, csv: CsvParseResult, columns: MyDbColumn[]) => Promise<void>;
}) {
  const [fileName, setFileName] = useState("");
  const [tableName, setTableName] = useState("");
  const [csv, setCsv] = useState<CsvParseResult | null>(null);
  const [columns, setColumns] = useState<MyDbColumn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onFile = async (file: File) => {
    setFileName(file.name);
    setTableName(file.name.replace(/\.csv$/i, "").replace(/[^A-Za-z0-9_]/g, "_"));
    const text = await file.text();
    const parsed = parseCsv(text);
    setCsv(parsed);
    setColumns(inferColumns(parsed));
    setError(null);
  };

  const submit = async () => {
    if (!csv || !tableName.trim()) return setError("Choose a CSV file and table name.");
    setSaving(true);
    setError(null);
    try {
      await onImport(tableName.trim(), csv, columns);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-[#0d1220] border border-slate-800 rounded-lg w-full max-w-3xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-white">Import CSV</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">✕</button>
        </div>
        <div className="p-4 space-y-4">
          {!csv && (
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-700 rounded-lg py-10 cursor-pointer hover:border-slate-500">
              <span className="text-sm text-slate-400">Click to choose a CSV file</span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
              />
            </label>
          )}

          {csv && (
            <>
              <div className="text-xs text-slate-500">{fileName}</div>
              <div>
                <label className="text-xs uppercase tracking-wide text-slate-500 font-semibold block mb-1.5">Table name</label>
                <input
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-200 font-mono"
                />
              </div>

              <div className="text-xs text-slate-500">
                Rows detected: {csv.rows.length} · Columns detected: {csv.headers.length}
              </div>

              <div className="overflow-auto max-h-40 border border-slate-800 rounded-md">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-900 sticky top-0">
                    <tr>
                      {csv.headers.map((h) => (
                        <th key={h} className="text-left font-mono px-2 py-1.5 text-slate-300 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csv.rows.slice(0, 8).map((r, i) => (
                      <tr key={i} className="odd:bg-slate-900/30">
                        {csv.headers.map((h) => (
                          <td key={h} className="px-2 py-1 font-mono text-slate-400 whitespace-nowrap">{r[h]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <label className="text-xs uppercase tracking-wide text-slate-500 font-semibold block mb-1.5">
                  Column types (auto-detected — override if needed)
                </label>
                <div className="space-y-1.5">
                  {columns.map((c, i) => (
                    <div key={c.name} className="grid grid-cols-[1fr_140px] gap-2 items-center">
                      <span className="font-mono text-xs text-slate-300">{c.name}</span>
                      <select
                        value={c.type}
                        onChange={(e) =>
                          setColumns((cs) => cs.map((col, idx) => (idx === i ? { ...col, type: e.target.value } : col)))
                        }
                        className="bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-200"
                      >
                        {SQL_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {error && <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-md px-3 py-2">{error}</div>}
        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-800">
          <button onClick={onClose} className="px-3 py-1.5 rounded-md border border-slate-700 hover:border-slate-500 text-slate-300 text-sm">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!csv || saving}
            className="px-4 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-[#06120c] text-sm font-semibold"
          >
            {saving ? "Importing…" : "Import Table"}
          </button>
        </div>
      </div>
    </div>
  );
}
