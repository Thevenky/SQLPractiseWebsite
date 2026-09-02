import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useMyDbContext } from "../../mydb/MyDbContext";

function Tab({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
          isActive ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800/60"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export default function MyDbNav() {
  const { databases, activeDatabase, activeDatabaseId, setActiveDatabase, createDatabase, deleteDatabase } = useMyDbContext();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  return (
    <div className="border-b border-slate-800 bg-[#0d1220]">
      <div className="flex items-center justify-between px-4 py-2 gap-3 flex-wrap">
        <div className="flex items-center gap-1 overflow-x-auto">
          <Tab to="/mydb">Dashboard</Tab>
          <Tab to="/mydb/editor">SQL Editor</Tab>
          <Tab to="/mydb/questions">Questions</Tab>
          <Tab to="/mydb/progress">Progress</Tab>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wide text-slate-600 hidden md:inline">My Databases</span>
          <select
            value={activeDatabaseId ?? ""}
            onChange={(e) => setActiveDatabase(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-200 max-w-[160px]"
          >
            {databases.length === 0 && <option value="">No databases yet</option>}
            {databases.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          {creating ? (
            <div className="flex items-center gap-1">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === "Enter" && newName.trim()) {
                    await createDatabase(newName.trim());
                    setNewName("");
                    setCreating(false);
                  }
                  if (e.key === "Escape") setCreating(false);
                }}
                placeholder="Database name"
                className="bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-200 w-32"
              />
              <button
                onClick={async () => {
                  if (!newName.trim()) return;
                  await createDatabase(newName.trim());
                  setNewName("");
                  setCreating(false);
                }}
                className="text-[11px] text-emerald-400 hover:text-emerald-300"
              >
                Add
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="text-[11px] px-2 py-1 rounded-md border border-slate-700 hover:border-slate-500 text-slate-300"
            >
              + New Database
            </button>
          )}
          {activeDatabase && databases.length > 1 && (
            <button
              onClick={() => {
                if (confirm(`Delete "${activeDatabase.name}" and everything in it? This cannot be undone.`)) {
                  deleteDatabase(activeDatabase.id);
                }
              }}
              className="text-[11px] text-rose-500/80 hover:text-rose-400"
              title="Delete this database"
            >
              Delete DB
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
