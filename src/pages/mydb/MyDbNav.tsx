import { NavLink } from "react-router-dom";
import { useMyDbContext } from "../../mydb/MyDbContext";

function Tab({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          isActive ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800/60"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export default function MyDbNav() {
  const { state } = useMyDbContext();
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-[#0d1220]">
      <div className="flex items-center gap-1">
        <Tab to="/mydb">Dashboard</Tab>
        <Tab to="/mydb/editor">SQL Editor</Tab>
        <Tab to="/mydb/questions">Questions</Tab>
      </div>
      <span className="text-xs text-slate-500 hidden md:block">DATABASE: {state.name}</span>
    </div>
  );
}
