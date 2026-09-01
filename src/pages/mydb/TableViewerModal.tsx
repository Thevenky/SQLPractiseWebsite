import { useMemo, useState } from "react";
import type { MyDbTable } from "../../mydb/types";

const PAGE_SIZE = 25;

export default function TableViewerModal({
  table,
  onClose,
  onAddRow,
  onUpdateRow,
  onDeleteRow,
}: {
  table: MyDbTable;
  onClose: () => void;
  onAddRow: (row: Record<string, unknown>) => Promise<void>;
  onUpdateRow: (pkCol: string, pkValue: unknown, patch: Record<string, unknown>) => Promise<void>;
  onDeleteRow: (pkCol: string, pkValue: unknown) => Promise<void>;
}) {
  const [tab, setTab] = useState<"data" | "schema">("data");
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [page, setPage] = useState(0);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<Record<string, unknown>>({});
  const [adding, setAdding] = useState(false);
  const [addDraft, setAddDraft] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);

  const pkCol = table.columns.find((c) => c.pk)?.name ?? table.columns[0]?.name;

  const filtered = useMemo(() => {
    let rows = table.rows;
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((r) => table.columns.some((c) => String(r[c.name] ?? "").toLowerCase().includes(q)));
    }
    if (sortCol) {
      rows = [...rows].sort((a, b) => {
        const av = a[sortCol];
        const bv = b[sortCol];
        if (av === bv) return 0;
        if (av === null || av === undefined) return 1;
        if (bv === null || bv === undefined) return -1;
        return av > bv ? sortDir : -sortDir;
      });
    }
    return rows;
  }, [table.rows, table.columns, search, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortCol(col);
      setSortDir(1);
    }
  };

  const startEdit = (row: Record<string, unknown>, idx: number) => {
    setEditingIdx(idx);
    setEditDraft({ ...row });
  };

  const saveEdit = async () => {
    if (editingIdx === null || !pkCol) return;
    const row = pageRows[editingIdx];
    setBusy(true);
    try {
      await onUpdateRow(pkCol, row[pkCol], editDraft);
      setEditingIdx(null);
    } finally {
      setBusy(false);
    }
  };

  const submitAdd = async () => {
    setBusy(true);
    try {
      await onAddRow(addDraft);
      setAdding(false);
      setAddDraft({});
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-[#0d1220] border border-slate-800 rounded-lg w-full max-w-5xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-white font-mono">{table.name}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">✕</button>
        </div>
        <div className="flex items-center gap-1 px-4 pt-2 border-b border-slate-800">
          {(["data", "schema"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-xs font-medium rounded-t-md ${
                tab === t ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {t === "data" ? "Data" : "Schema"}
            </button>
          ))}
        </div>

        {tab === "schema" ? (
          <div className="p-4 overflow-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-800">
                  <th className="text-left px-2 py-1.5">Column</th>
                  <th className="text-left px-2 py-1.5">Type</th>
                  <th className="text-left px-2 py-1.5">Nullable</th>
                  <th className="text-left px-2 py-1.5">Key</th>
                </tr>
              </thead>
              <tbody>
                {table.columns.map((c) => (
                  <tr key={c.name} className="border-b border-slate-800/60">
                    <td className="px-2 py-1.5 font-mono text-slate-200">{c.name}</td>
                    <td className="px-2 py-1.5 font-mono text-slate-400">{c.type}</td>
                    <td className="px-2 py-1.5 text-slate-400">{c.nullable ? "Yes" : "No"}</td>
                    <td className="px-2 py-1.5 text-amber-400">{c.pk ? "PK" : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-slate-800">
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                placeholder="Search rows…"
                className="bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-200 w-56"
              />
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500">{filtered.length} rows</span>
                <button
                  onClick={() => {
                    setAdding(true);
                    setAddDraft({});
                  }}
                  className="text-xs px-2 py-1 rounded-md border border-slate-700 hover:border-slate-500 text-slate-300"
                >
                  + Add Row
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="min-w-full text-xs border-collapse">
                <thead className="sticky top-0 bg-[#0d1220] z-10">
                  <tr>
                    {table.columns.map((c) => (
                      <th
                        key={c.name}
                        onClick={() => toggleSort(c.name)}
                        className="text-left font-mono font-semibold text-slate-300 px-3 py-2 border-b border-slate-800 whitespace-nowrap cursor-pointer select-none"
                      >
                        {c.name} {sortCol === c.name ? (sortDir === 1 ? "▲" : "▼") : ""}
                      </th>
                    ))}
                    <th className="px-3 py-2 border-b border-slate-800"></th>
                  </tr>
                </thead>
                <tbody>
                  {adding && (
                    <tr className="bg-emerald-500/5">
                      {table.columns.map((c) => (
                        <td key={c.name} className="px-2 py-1 border-b border-slate-800/60">
                          <input
                            value={String(addDraft[c.name] ?? "")}
                            onChange={(e) => setAddDraft((d) => ({ ...d, [c.name]: e.target.value }))}
                            placeholder={c.type}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs font-mono text-slate-200"
                          />
                        </td>
                      ))}
                      <td className="px-2 py-1 border-b border-slate-800/60 whitespace-nowrap">
                        <button disabled={busy} onClick={submitAdd} className="text-emerald-400 hover:text-emerald-300 text-[11px] mr-2">
                          Save
                        </button>
                        <button onClick={() => setAdding(false)} className="text-slate-500 hover:text-slate-300 text-[11px]">
                          Cancel
                        </button>
                      </td>
                    </tr>
                  )}
                  {pageRows.map((row, idx) => (
                    <tr key={idx} className="odd:bg-slate-900/30 hover:bg-slate-800/50">
                      {table.columns.map((c) => (
                        <td key={c.name} className="px-3 py-1.5 border-b border-slate-800/60 font-mono whitespace-nowrap text-slate-300">
                          {editingIdx === idx ? (
                            <input
                              value={String(editDraft[c.name] ?? "")}
                              onChange={(e) => setEditDraft((d) => ({ ...d, [c.name]: e.target.value }))}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs font-mono text-slate-200"
                            />
                          ) : row[c.name] === null || row[c.name] === undefined ? (
                            <span className="text-slate-600 italic">NULL</span>
                          ) : (
                            String(row[c.name])
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-1.5 border-b border-slate-800/60 whitespace-nowrap">
                        {editingIdx === idx ? (
                          <>
                            <button disabled={busy} onClick={saveEdit} className="text-emerald-400 hover:text-emerald-300 text-[11px] mr-2">
                              Save
                            </button>
                            <button onClick={() => setEditingIdx(null)} className="text-slate-500 hover:text-slate-300 text-[11px]">
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(row, idx)} className="text-sky-400 hover:text-sky-300 text-[11px] mr-2">
                              Edit
                            </button>
                            <button
                              onClick={() => pkCol && onDeleteRow(pkCol, row[pkCol])}
                              className="text-rose-500/80 hover:text-rose-400 text-[11px]"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                  {pageRows.length === 0 && !adding && (
                    <tr>
                      <td colSpan={table.columns.length + 1} className="px-3 py-6 text-center text-slate-600 text-xs">
                        No rows.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 px-4 py-2 border-t border-slate-800 text-xs text-slate-400">
                <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="disabled:opacity-30 hover:text-white">
                  ‹ Prev
                </button>
                <span>Page {page + 1} of {totalPages}</span>
                <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} className="disabled:opacity-30 hover:text-white">
                  Next ›
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
