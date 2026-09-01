import { useState } from "react";
import type { DatasetDef } from "../types";

export default function SchemaExplorer({
  dataset,
  onPreview,
  highlightTables,
}: {
  dataset: DatasetDef;
  onPreview?: (tableName: string) => void;
  highlightTables?: string[];
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    dataset.tables.forEach((t) => {
      init[t.name] = highlightTables ? highlightTables.includes(t.name) : true;
    });
    return init;
  });

  return (
    <div className="text-sm">
      <div className="px-3 py-2 text-xs uppercase tracking-wide text-slate-500 font-semibold border-b border-slate-800">
        {dataset.name} database
      </div>
      <div className="divide-y divide-slate-800/60">
        {dataset.tables.map((table) => {
          const isHighlighted = highlightTables?.includes(table.name);
          return (
            <div key={table.name}>
              <button
                onClick={() => setExpanded((e) => ({ ...e, [table.name]: !e[table.name] }))}
                className={`w-full flex items-center justify-between px-3 py-2 hover:bg-slate-800/50 text-left ${
                  isHighlighted ? "bg-emerald-500/5" : ""
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-slate-500">{expanded[table.name] ? "▾" : "▸"}</span>
                  <span className={`font-mono font-medium ${isHighlighted ? "text-emerald-400" : "text-slate-200"}`}>
                    {table.name}
                  </span>
                </span>
                {onPreview && (
                  <span
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPreview(table.name);
                    }}
                    className="text-[11px] text-sky-400 hover:text-sky-300 px-2 py-0.5 rounded hover:bg-sky-500/10"
                  >
                    preview
                  </span>
                )}
              </button>
              {expanded[table.name] && (
                <div className="px-3 pb-2 pl-8">
                  <p className="text-xs text-slate-500 mb-1">{table.description}</p>
                  <ul className="space-y-0.5">
                    {table.columns.map((col) => (
                      <li key={col.name} className="font-mono text-xs flex items-center gap-1.5 py-0.5">
                        <span className={col.pk ? "text-amber-400" : col.fk ? "text-sky-400" : "text-slate-300"}>
                          {col.name}
                        </span>
                        <span className="text-slate-600">{col.type}</span>
                        {col.pk && <span className="text-[10px] text-amber-400/80">PK</span>}
                        {col.fk && (
                          <span className="text-[10px] text-sky-400/80">
                            → {col.fk.table}.{col.fk.column}
                          </span>
                        )}
                        {col.nullable && <span className="text-[10px] text-slate-600">nullable</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {dataset.relationships.length > 0 && (
        <div className="px-3 py-3 border-t border-slate-800 mt-1">
          <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-2">Relationships</div>
          <div className="space-y-1.5">
            {dataset.relationships.map((r, i) => (
              <div key={i} className="font-mono text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-200">{r.from}</span>
                <span className="text-slate-600">.{r.fromCol}</span>
                <span className="text-emerald-500">→</span>
                <span className="text-slate-200">{r.to}</span>
                <span className="text-slate-600">.{r.toCol}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
