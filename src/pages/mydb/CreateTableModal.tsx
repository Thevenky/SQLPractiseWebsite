import { useState } from "react";
import { SQL_TYPES, type MyDbColumn, type MyDbTable } from "../../mydb/types";

export default function CreateTableModal({
  onClose,
  onCreate,
  existingTables,
}: {
  onClose: () => void;
  onCreate: (name: string, columns: MyDbColumn[]) => Promise<void>;
  existingTables: MyDbTable[];
}) {
  const [name, setName] = useState("");
  const [columns, setColumns] = useState<MyDbColumn[]>([{ name: "id", type: "INTEGER", nullable: false, pk: true }]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const addColumn = () => setColumns((cs) => [...cs, { name: "", type: "VARCHAR", nullable: true }]);
  const removeColumn = (i: number) => setColumns((cs) => cs.filter((_, idx) => idx !== i));
  const updateColumn = (i: number, patch: Partial<MyDbColumn>) =>
    setColumns((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  const submit = async () => {
    setError(null);
    if (!name.trim()) return setError("Table name is required.");
    if (columns.some((c) => !c.name.trim())) return setError("Every column needs a name.");
    setSaving(true);
    try {
      await onCreate(name.trim(), columns);
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
          <h2 className="text-sm font-semibold text-white">Create Table</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">✕</button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500 font-semibold block mb-1.5">Table Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="employees"
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-200 font-mono"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500 font-semibold block mb-1.5">Columns</label>
            <div className="space-y-2">
              {columns.map((col, i) => (
                <div key={i} className="border border-slate-800 rounded-md p-2 space-y-1.5">
                  <div className="grid grid-cols-[1fr_110px_54px_54px_24px] gap-2 items-center">
                    <input
                      value={col.name}
                      onChange={(e) => updateColumn(i, { name: e.target.value })}
                      placeholder="column_name"
                      className="bg-slate-900 border border-slate-700 rounded-md px-2 py-1.5 text-sm text-slate-200 font-mono"
                    />
                    <select
                      value={col.type}
                      onChange={(e) => updateColumn(i, { type: e.target.value })}
                      className="bg-slate-900 border border-slate-700 rounded-md px-2 py-1.5 text-sm text-slate-200"
                    >
                      {SQL_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <label className="flex flex-col items-center gap-0.5 text-[10px] text-slate-400" title="Primary key">
                      PK
                      <input
                        type="checkbox"
                        checked={!!col.pk}
                        onChange={(e) => updateColumn(i, { pk: e.target.checked, nullable: e.target.checked ? false : col.nullable })}
                      />
                    </label>
                    <label className="flex flex-col items-center gap-0.5 text-[10px] text-slate-400" title="Nullable">
                      Null?
                      <input
                        type="checkbox"
                        checked={col.nullable}
                        onChange={(e) => updateColumn(i, { nullable: e.target.checked })}
                        disabled={col.pk}
                      />
                    </label>
                    <button
                      onClick={() => removeColumn(i)}
                      disabled={columns.length <= 1}
                      className="text-rose-500/70 hover:text-rose-400 disabled:opacity-30 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={col.defaultValue ?? ""}
                      onChange={(e) => updateColumn(i, { defaultValue: e.target.value })}
                      placeholder="Default value (optional)"
                      className="bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-300 font-mono"
                    />
                    <select
                      value={col.fk ? `${col.fk.table}.${col.fk.column}` : ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (!v) return updateColumn(i, { fk: null });
                        const [table, column] = v.split(".");
                        updateColumn(i, { fk: { table, column } });
                      }}
                      className="bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-300"
                    >
                      <option value="">Foreign key (optional)</option>
                      {existingTables.map((t) =>
                        t.columns.map((c) => (
                          <option key={`${t.name}.${c.name}`} value={`${t.name}.${c.name}`}>
                            → {t.name}.{c.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={addColumn}
              className="mt-2 text-xs px-2 py-1 rounded-md border border-slate-700 hover:border-slate-500 text-slate-300"
            >
              + Add Column
            </button>
          </div>

          {error && <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-md px-3 py-2">{error}</div>}
        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-800">
          <button onClick={onClose} className="px-3 py-1.5 rounded-md border border-slate-700 hover:border-slate-500 text-slate-300 text-sm">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="px-4 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-[#06120c] text-sm font-semibold"
          >
            {saving ? "Creating…" : "Create Table"}
          </button>
        </div>
      </div>
    </div>
  );
}
