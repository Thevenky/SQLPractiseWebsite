import { useCallback, useEffect, useState } from "react";

const KEY = "sqlpractice.history.v1";
export interface HistoryEntry {
  sql: string;
  ranAt: number;
  dataset: string;
}

export function useQueryHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(history.slice(0, 50)));
    } catch {
      // ignore
    }
  }, [history]);

  const addEntry = useCallback((sql: string, dataset: string) => {
    setHistory((h) => [{ sql, ranAt: Date.now(), dataset }, ...h.filter((e) => e.sql !== sql)].slice(0, 50));
  }, []);

  const removeEntry = useCallback((idx: number) => {
    setHistory((h) => h.filter((_, i) => i !== idx));
  }, []);

  const clearAll = useCallback(() => setHistory([]), []);

  return { history, addEntry, removeEntry, clearAll };
}
