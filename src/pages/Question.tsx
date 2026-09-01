import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import { allQuestions, questionById, questionsByLevel } from "../questions";
import { datasetById } from "../data";
import SchemaExplorer from "../components/SchemaExplorer";
import SqlEditor from "../components/SqlEditor";
import { DataTable, ErrorPanel, ValidationBanner } from "../components/ResultsPanel";
import { HintPanel, SolutionPanel, QuestionHeader } from "../components/QuestionPanel";
import { runQuery, friendlyError } from "../sql-engine/duckdb";
import { validate, checkPattern } from "../validation/validate";
import { useProgress } from "../progress/useProgress";
import type { QueryResult, ValidationResult } from "../types";

type RunState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string; technical: string }
  | { kind: "result"; result: QueryResult; validation: ValidationResult };

export default function Question() {
  const { questionId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const mode = params.get("mode"); // "interview" | "random" | null
  const question = questionId ? questionById(questionId) : undefined;
  const { record } = useProgress();

  const [sql, setSql] = useState("");
  const [runState, setRunState] = useState<RunState>({ kind: "idle" });
  const [dbReady, setDbReady] = useState(false);
  const startTimeRef = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [showSchema, setShowSchema] = useState(true);
  const [previewTable, setPreviewTable] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<QueryResult | null>(null);

  useEffect(() => {
    setSql("-- Write your SQL query here\n\n");
    setRunState({ kind: "idle" });
    startTimeRef.current = Date.now();
  }, [questionId]);

  useEffect(() => {
    if (mode !== "interview") return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, [mode, questionId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await import("../sql-engine/duckdb").then((m) => m.ensureDb());
        if (!cancelled) setDbReady(true);
      } catch {
        // handled on run
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!previewTable) {
      setPreviewData(null);
      return;
    }
    let cancelled = false;
    runQuery(`SELECT * FROM ${previewTable} LIMIT 20`)
      .then((r) => !cancelled && setPreviewData(r))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [previewTable]);

  const dataset = question ? datasetById(question.dataset) : undefined;

  const currentIndexInfo = useMemo(() => {
    if (!question) return null;
    const list = questionsByLevel[question.level];
    const idx = list.findIndex((q) => q.id === question.id);
    return { idx, list };
  }, [question]);

  if (!question || !dataset) {
    return (
      <div className="p-8 text-center text-slate-400">
        Question not found. <Link to="/practice" className="text-sky-400 underline">Back to practice</Link>
      </div>
    );
  }

  const handleRun = async () => {
    setRunState({ kind: "loading" });
    try {
      const patternFail = checkPattern(question, sql);
      const actual = await runQuery(sql);
      const expected = await runQuery(question.solution);

      if (patternFail) {
        setRunState({ kind: "result", result: actual, validation: patternFail });
        record(question.id, false, Date.now() - startTimeRef.current);
        return;
      }

      const validation = validate(question, expected, actual);
      setRunState({ kind: "result", result: actual, validation });
      record(question.id, validation.status === "pass", Date.now() - startTimeRef.current);
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      const { message } = friendlyError(raw, sql);
      setRunState({ kind: "error", message, technical: raw });
    }
  };

  const goToNext = () => {
    if (!currentIndexInfo) return;
    const { idx, list } = currentIndexInfo;
    const next = list[idx + 1];
    if (next) navigate(`/practice/${next.id}`);
    else navigate("/practice?level=" + question.level);
  };

  return (
    <div className="flex-1 flex flex-col">
      {mode === "interview" && (
        <div className="bg-violet-500/10 border-b border-violet-500/20 px-4 py-1.5 text-xs text-violet-300 flex items-center justify-between">
          <span>⏱️ Interview mode — hints hidden</span>
          <span className="font-mono">{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}</span>
        </div>
      )}
      <div className="flex-1 grid lg:grid-cols-[320px_1fr_1fr] min-h-0">
        {/* Left: question + schema */}
        <div className="border-r border-slate-800 flex flex-col min-h-0 overflow-y-auto">
          <div className="p-4 border-b border-slate-800">
            <QuestionHeader question={question} />
          </div>
          <div className="border-b border-slate-800">
            <button
              onClick={() => setShowSchema((s) => !s)}
              className="w-full flex items-center justify-between px-4 py-2 text-xs uppercase tracking-wide text-slate-500 font-semibold hover:bg-slate-800/40"
            >
              <span>Schema</span>
              <span>{showSchema ? "hide" : "show"}</span>
            </button>
            {showSchema && (
              <SchemaExplorer dataset={dataset} highlightTables={question.tables} onPreview={setPreviewTable} />
            )}
          </div>
          <div className="p-4 space-y-3">
            <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Hints</div>
            <HintPanel question={question} hideHints={mode === "interview"} />
          </div>
          {mode !== "interview" && (
            <div className="p-4 border-t border-slate-800">
              <SolutionPanel question={question} />
            </div>
          )}
        </div>

        {/* Middle: editor */}
        <div className="border-r border-slate-800 flex flex-col min-h-0">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-[#0d1220]">
            <span className="text-xs text-slate-500">SQL Editor · DuckDB dialect · ⌘/Ctrl + Enter to run</span>
          </div>
          <div className="flex-1 min-h-[300px]">
            <SqlEditor value={sql} onChange={setSql} onRun={handleRun} />
          </div>
          <div className="flex items-center gap-2 px-3 py-2 border-t border-slate-800 bg-[#0d1220]">
            <button
              onClick={handleRun}
              disabled={!dbReady}
              className="px-4 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-[#06120c] text-sm font-semibold"
            >
              {dbReady ? "Run Query" : "Loading engine…"}
            </button>
            <button
              onClick={() => setSql("-- Write your SQL query here\n\n")}
              className="px-3 py-1.5 rounded-md border border-slate-700 hover:border-slate-500 text-slate-300 text-sm"
            >
              Reset
            </button>
            <button
              onClick={() => setSql("")}
              className="px-3 py-1.5 rounded-md border border-slate-700 hover:border-slate-500 text-slate-300 text-sm"
            >
              Clear
            </button>
            {runState.kind === "result" && runState.validation.status === "pass" && (
              <button
                onClick={goToNext}
                className="ml-auto px-4 py-1.5 rounded-md bg-sky-500 hover:bg-sky-400 text-[#06121c] text-sm font-semibold"
              >
                Next question →
              </button>
            )}
          </div>
        </div>

        {/* Right: results / preview */}
        <div className="flex flex-col min-h-0">
          {previewTable ? (
            <>
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-[#0d1220]">
                <span className="text-xs text-slate-400 font-mono">Preview: {previewTable}</span>
                <button onClick={() => setPreviewTable(null)} className="text-xs text-slate-500 hover:text-slate-300">
                  close ✕
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-auto">
                {previewData ? <DataTable result={previewData} /> : <div className="p-4 text-xs text-slate-500">Loading…</div>}
              </div>
            </>
          ) : (
            <>
              <div className="px-3 py-2 border-b border-slate-800 bg-[#0d1220] text-xs text-slate-500">Query Result</div>
              <div className="flex-1 min-h-0 overflow-auto">
                {runState.kind === "idle" && (
                  <div className="p-4 text-xs text-slate-600">Run your query to see results here.</div>
                )}
                {runState.kind === "loading" && <div className="p-4 text-xs text-slate-500">Running…</div>}
                {runState.kind === "error" && <ErrorPanel message={runState.message} technical={runState.technical} />}
                {runState.kind === "result" && (
                  <>
                    <ValidationBanner
                      result={runState.validation}
                      execMs={runState.result.execMs}
                      rowCount={runState.result.rowCount}
                    />
                    <DataTable result={runState.result} />
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      <div className="border-t border-slate-800 px-4 py-2 flex items-center justify-between text-xs text-slate-500">
        <Link to={`/practice?level=${question.level}`} className="hover:text-slate-300">
          ← Back to {question.level} list
        </Link>
        <span>
          Question {(currentIndexInfo?.idx ?? 0) + 1} of {currentIndexInfo?.list.length ?? allQuestions.length}
        </span>
      </div>
    </div>
  );
}
