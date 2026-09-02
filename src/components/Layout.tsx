import { Link, NavLink } from "react-router-dom";
import type { ReactNode } from "react";

function NavItem({ to, children }: { to: string; children: ReactNode }) {
  return (
    <NavLink
      to={to}
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

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f17] text-slate-200">
      <header className="border-b border-slate-800 bg-[#0d1220]/95 backdrop-blur sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 font-semibold text-white">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-emerald-400 to-sky-500 text-[#0b0f17] font-bold text-sm">
                DB
              </span>
              <span>SQL Practice</span>
            </Link>
            <nav className="hidden sm:flex items-center gap-1">
              <NavItem to="/practice">Practice</NavItem>
              <NavItem to="/pdf">PDF Practice</NavItem>
              <NavItem to="/mydb">My Practice</NavItem>
              <NavItem to="/playground">Playground</NavItem>
              <NavItem to="/progress">Progress</NavItem>
            </nav>
          </div>
          <div className="text-xs text-slate-500 hidden md:block">SQL dialect: DuckDB</div>
        </div>
      </header>
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
