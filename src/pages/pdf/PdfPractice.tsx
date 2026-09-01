import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getSet, getPdfBlob, saveSet } from "../../pdf-practice/pdfStore";
import { pdfSetToDatasetDef } from "../../pdf-practice/datasetAdapter";
import { generateHints, generateExplanation } from "../../pdf-practice/hints";
import type { PdfPracticeSet, PdfQuestion, QuestionStatus } from "../../pdf-practice/types";
import SchemaExplorer from "../../components/SchemaExplorer";
import SqlEditor from "../../components/SqlEditor";
import { DataTable, ErrorPanel, ValidationBanner } from "../../components/ResultsPanel";
import { runQueryInSchema, friendlyError } from "../../sql-engine/duckdb";
import { compareResults } from "../../validation/validate";
import type { QueryResult, ValidationResult } from "../../types";

type RunState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string; technical: string }
  | { kind: "result"; result: QueryResult; validation: ValidationResult | null };

const STATUS_ICON: Record<QuestionStatus, string> = {
  completed: "✓",
  incorrect: "✗",
  review: "🔖",
  unattempted: "○",
};
const STATUS_COLOR: Record<QuestionStatus, string> = {
  completed: "text-emerald-400",
  incorrect: "text-rose-400",
  review: "text-amber-400",
  unattempted: "text-slate-600",
};

export default function PdfPractice() {
  const { setId } = useParams();
  const [set, setSet] = useState<PdfPracticeSet | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [sql, setSql] = useState("");
  const [runState, setRunState] = useState<RunState>({ kind: "idle" });
  const [sidebarTab, setSidebarTab] = useState<"questions" | "database" | "progress">("questions");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | QuestionStatus>("all");
  const [topicFilter, setTopicFilter] = useState("all");
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [viewPdf, setViewPdf] = useState(false);
  const [previewTable, setPreviewTable] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<QueryResult | null>(null);
  const startRef = useRef(Date.now());

  useEffect(() => {
    if (!setId) return;
    getSet(setId).then((s) => {
      if (!s) {
        setLoadError("This PDF practice set could not be found — it may have been deleted.");
        return;
      }
      setSet(s);
    });
    getPdfBlob(setId).then((blob) => {
      if (blob) setPdfUrl(URL.createObjectURL(blob));
    });
  }, [setId]);

  const question: PdfQuestion | undefined = set?.questions[index];

  useEffect(() => {
    setSql(question?.lastQueryText ?? "-- Write your SQL query here\n\n");
    setRunState({ kind: "idle" });
    setHintsRevealed(0);
    setShowAnswer(false);
    startRef.current = Date.now();
  }, [question?.id]);

  useEffect(() => {
    if (!previewTable || !set) {
      setPreviewData(null);
      return;
    }
    runQueryInSchema(set.schemaName, `SELECT * FROM "${previewTable}" LIMIT 20`)
      .then(setPreviewData)
      .catch(() => setPreviewData(null));
  }, [previewTable, set]);

  const persist = async (next: PdfPracticeSet) => {
    setSet(next);
    next.updatedAt = Date.now();
    await saveSet(next);
  };

  const updateQuestion = async (qId: string, patch: Partial<PdfQuestion>) => {
    if (!set) return;
    const next: PdfPracticeSet = {
      ...set,
      questions: set.questions.map((q) => (q.id === qId ? { ...q, ...patch } : q)),
    };
    await persist(next);
  };

  const allTopics = useMemo(() => {
    if (!set) return [];
    const s = new Set<string>();
    set.questions.forEach((q) => q.topics.forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [set]);

  const filteredIndices = useMemo(() => {
    if (!set) return [];
    return set.questions
      .map((q, i) => ({ q, i }))
      .filter(({ q }) => {
        if (statusFilter !== "all" && q.status !== statusFilter) return false;
        if (topicFilter !== "all" && !q.topics.includes(topicFilter)) return false;
        if (search.trim() && !`${q.text} ${q.answerSql ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      })
      .map(({ i }) => i);
  }, [set, statusFilter, topicFilter, search]);

  if (loadError) {
    return (
      <div className="p-8 text-center text-slate-400">
        {loadError} <Link to="/pdf" className="text-sky-400 underline">Back to PDF Practice</Link>
      </div>
    );
  }
  if (!set || !question) {
    return <div className="p-8 text-center text-slate-500 text-sm">Loading…</div>;
  }

  const dataset = pdfSetToDatasetDef(set);
  const orderMatters = question.answerSql ? /ORDER\s+BY/i.test(question.answerSql) : false;
  const mentionedTables = set.tables
    .map((t) => t.name)
    .filter((name) => new RegExp(`\\b${name}\\b`, "i").test(question.text));

  const handleRun = async () => {
    setRunState({ kind: "loading" });
    try {
      const actual = await runQueryInSchema(set.schemaName, sql);
      if (question.hasAnswer && question.answerSql) {
        const expected = await runQueryInSchema(set.schemaName, question.answerSql);
        const validation = compareResults(expected, actual, orderMatters);
        setRunState({ kind: "result", result: actual, validation });
        const nextStatus: QuestionStatus =
          validation.status === "pass" ? "completed" : question.status === "completed" ? "completed" : "incorrect";
        await updateQuestion(question.id, { status: nextStatus, attempts: question.attempts + 1, lastQueryText: sql });
      } else {
        setRunState({ kind: "result", result: actual, validation: null });
        await updateQuestion(question.id, { attempts: question.attempts + 1, lastQueryText: sql });
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      const { message } = friendlyError(raw);
      setRunState({ kind: "error", message, technical: raw });
    }
  };

  const goTo = (i: number) => {
    if (i < 0 || i >= set.questions.length) return;
    setIndex(i);
  };

  const explanationData = showAnswer ? generateExplanation(question) : null;
  const hints = generateHints(question);
  const progress = (() => {
    const total = set.questions.length;
    const completed = set.questions.filter((q) => q.status === "completed").length;
    const incorrect = set.questions.filter((q) => q.status === "incorrect").length;
    const review = set.questions.filter((q) => q.status === "review").length;
    const unattempted = total - completed - incorrect - review;
    return { total, completed, incorrect, review, unattempted, pct: total ? Math.round((completed / total) * 100) : 0 };
  })();

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-[#0d1220]">
        <div className="flex items-center gap-3">
          <Link to="/pdf" className="text-xs text-slate-500 hover:text-slate-300">← PDF Practice</Link>
          <span className="text-sm text-slate-200 font-medium truncate max-w-xs">{set.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            Question {index + 1} / {set.questions.length}
          </span>
          {pdfUrl && (
            <button
              onClick={() => setViewPdf((v) => !v)}
              className="text-xs px-2.5 py-1 rounded-md border border-slate-700 hover:border-slate-500 text-slate-300"
            >
              {viewPdf ? "Hide PDF" : "View PDF"}
            </button>
          )}
        </div>
      </div>

      <div className={`flex-1 grid min-h-0 ${viewPdf ? "lg:grid-cols-[280px_1fr_1fr_360px]" : "lg:grid-cols-[280px_1fr_1fr]"}`}>
        {/* Sidebar */}
        <div className="border-r border-slate-800 flex flex-col min-h-0 overflow-hidden">
          <div className="flex border-b border-slate-800 text-xs">
            {(["questions", "database", "progress"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSidebarTab(tab)}
                className={`flex-1 py-2 capitalize ${
                  sidebarTab === tab ? "text-white bg-slate-800/60 border-b-2 border-emerald-500" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {sidebarTab === "questions" && (
            <div className="flex-1 overflow-y-auto">
              <div className="p-2 border-b border-slate-800 space-y-2">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search questions..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-200"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-200"
                >
                  <option value="all">All</option>
                  <option value="unattempted">Unattempted</option>
                  <option value="completed">Completed</option>
                  <option value="incorrect">Incorrect</option>
                  <option value="review">Marked for review</option>
                </select>
                {allTopics.length > 0 && (
                  <select
                    value={topicFilter}
                    onChange={(e) => setTopicFilter(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-200"
                  >
                    <option value="all">All topics</option>
                    {allTopics.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <ul className="p-2 space-y-0.5">
                {filteredIndices.length === 0 && <li className="text-xs text-slate-600 px-2 py-4 text-center">No matching questions.</li>}
                {filteredIndices.map((i) => {
                  const q = set.questions[i];
                  return (
                    <li key={q.id}>
                      <button
                        onClick={() => goTo(i)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-left ${
                          i === index ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                        }`}
                      >
                        <span className={`w-4 text-center ${STATUS_COLOR[q.status]}`}>{STATUS_ICON[q.status]}</span>
                        <span className="font-mono text-slate-500">{q.index}</span>
                        <span className="truncate flex-1">{q.text}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {sidebarTab === "database" && (
            <div className="flex-1 overflow-y-auto">
              <SchemaExplorer dataset={dataset} highlightTables={mentionedTables} onPreview={setPreviewTable} />
            </div>
          )}

          {sidebarTab === "progress" && (
            <div className="p-4 space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-300">Progress</span>
                  <span className="text-slate-500">{progress.pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${progress.pct}%` }} />
                </div>
              </div>
              <div className="text-xs text-slate-400">
                {progress.completed} / {progress.total} completed
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md bg-slate-800/60 p-2">
                  <div className="text-emerald-400 font-semibold">{progress.completed}</div>
                  <div className="text-[10px] text-slate-500">Correct</div>
                </div>
                <div className="rounded-md bg-slate-800/60 p-2">
                  <div className="text-rose-400 font-semibold">{progress.incorrect}</div>
                  <div className="text-[10px] text-slate-500">Incorrect</div>
                </div>
                <div className="rounded-md bg-slate-800/60 p-2">
                  <div className="text-slate-300 font-semibold">{progress.unattempted}</div>
                  <div className="text-[10px] text-slate-500">Unattempted</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Question + hints/answer */}
        <div className="border-r border-slate-800 flex flex-col min-h-0 overflow-y-auto">
          <div className="p-4 border-b border-slate-800">
            <div className="flex items-center gap-1.5 flex-wrap mb-2">
              {question.topics.map((t) => (
                <span key={t} className="text-[11px] px-2 py-0.5 rounded-full border border-slate-700 bg-slate-800/70 text-slate-300">
                  {t}
                </span>
              ))}
              {!question.hasAnswer && (
                <span className="text-[11px] px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300">
                  no answer in PDF
                </span>
              )}
            </div>
            <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">{question.text}</p>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => updateQuestion(question.id, { status: question.status === "completed" ? "unattempted" : "completed" })}
                className="text-[11px] px-2 py-1 rounded-md border border-slate-700 hover:border-emerald-500 text-slate-300"
              >
                {question.status === "completed" ? "✓ Completed" : "Mark completed"}
              </button>
              <button
                onClick={() => updateQuestion(question.id, { status: question.status === "review" ? "unattempted" : "review" })}
                className="text-[11px] px-2 py-1 rounded-md border border-slate-700 hover:border-amber-500 text-slate-300"
              >
                {question.status === "review" ? "🔖 Marked" : "Mark for review"}
              </button>
            </div>
          </div>

          <div className="p-4 border-b border-slate-800 space-y-2">
            <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Hints</div>
            {hints.slice(0, hintsRevealed).map((h, i) => (
              <div key={i} className="text-sm bg-slate-800/50 border border-slate-700/60 rounded-md px-3 py-2 text-slate-300">
                <span className="text-sky-400 font-semibold mr-1.5">Hint {i + 1}</span>
                {h}
              </div>
            ))}
            {hintsRevealed < hints.length ? (
              <button
                onClick={() => setHintsRevealed((r) => r + 1)}
                className="text-xs font-medium text-sky-400 hover:text-sky-300 border border-sky-500/30 rounded-md px-3 py-1.5"
              >
                Show hint {hintsRevealed + 1} of {hints.length}
              </button>
            ) : (
              <p className="text-xs text-slate-500">No more hints.</p>
            )}
          </div>

          <div className="p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-2">Answer</div>
            {!question.hasAnswer ? (
              <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-md px-3 py-2">
                ⚠ Answer not available in source PDF — you can still practice this question, but it won't be auto-graded.
              </p>
            ) : !showAnswer ? (
              <button
                onClick={() => setShowAnswer(true)}
                className="text-xs font-medium text-violet-400 hover:text-violet-300 border border-violet-500/30 rounded-md px-3 py-1.5"
              >
                Show Answer
              </button>
            ) : (
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Correct SQL</div>
                  <pre className="bg-black/40 border border-slate-800 rounded-md p-3 text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap">
                    {question.answerSql}
                  </pre>
                </div>
                {explanationData && (
                  <>
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Explanation</div>
                      <p className="text-slate-300">{explanationData.explanation}</p>
                    </div>
                    {explanationData.concepts.length > 0 && (
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Key concepts</div>
                        <div className="flex flex-wrap gap-1.5">
                          {explanationData.concepts.map((c) => (
                            <span key={c} className="text-[11px] px-2 py-0.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
                <button onClick={() => setShowAnswer(false)} className="text-xs text-slate-500 hover:text-slate-300 underline underline-offset-2">
                  Hide answer
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Editor + results */}
        <div className={`flex flex-col min-h-0 ${viewPdf ? "border-r border-slate-800" : ""}`}>
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-[#0d1220]">
            <span className="text-xs text-slate-500">SQL Editor · DuckDB dialect</span>
          </div>
          <div className="flex-1 min-h-[220px]">
            <SqlEditor value={sql} onChange={setSql} onRun={handleRun} />
          </div>
          <div className="flex items-center gap-2 px-3 py-2 border-t border-slate-800 bg-[#0d1220]">
            <button onClick={handleRun} className="px-4 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-[#06120c] text-sm font-semibold">
              Run Query
            </button>
            <button
              onClick={() => setSql("-- Write your SQL query here\n\n")}
              className="px-3 py-1.5 rounded-md border border-slate-700 hover:border-slate-500 text-slate-300 text-sm"
            >
              Reset
            </button>
            <button onClick={() => setSql("")} className="px-3 py-1.5 rounded-md border border-slate-700 hover:border-slate-500 text-slate-300 text-sm">
              Clear
            </button>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => goTo(index - 1)}
                disabled={index === 0}
                className="px-3 py-1.5 rounded-md border border-slate-700 hover:border-slate-500 text-slate-300 text-sm disabled:opacity-40"
              >
                ← Prev
              </button>
              <button
                onClick={() => goTo(index + 1)}
                disabled={index === set.questions.length - 1}
                className="px-3 py-1.5 rounded-md bg-sky-500 hover:bg-sky-400 text-[#06121c] text-sm font-semibold disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
          <div className="border-t border-slate-800 flex-1 min-h-[160px] overflow-auto">
            {previewTable ? (
              <>
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-[#0d1220]">
                  <span className="text-xs text-slate-400 font-mono">Preview: {previewTable}</span>
                  <button onClick={() => setPreviewTable(null)} className="text-xs text-slate-500 hover:text-slate-300">
                    close ✕
                  </button>
                </div>
                {previewData ? <DataTable result={previewData} /> : <div className="p-4 text-xs text-slate-500">Loading…</div>}
              </>
            ) : (
              <>
                <div className="px-3 py-2 border-b border-slate-800 bg-[#0d1220] text-xs text-slate-500">Query Result</div>
                {runState.kind === "idle" && <div className="p-4 text-xs text-slate-600">Run your query to see results here.</div>}
                {runState.kind === "loading" && <div className="p-4 text-xs text-slate-500">Running…</div>}
                {runState.kind === "error" && <ErrorPanel message={runState.message} technical={runState.technical} />}
                {runState.kind === "result" && (
                  <>
                    {runState.validation && (
                      <ValidationBanner result={runState.validation} execMs={runState.result.execMs} rowCount={runState.result.rowCount} />
                    )}
                    <DataTable result={runState.result} />
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* PDF viewer */}
        {viewPdf && pdfUrl && (
          <div className="flex flex-col min-h-0">
            <div className="px-3 py-2 border-b border-slate-800 bg-[#0d1220] text-xs text-slate-500">Original PDF</div>
            <iframe title="Source PDF" src={pdfUrl} className="flex-1 w-full bg-white" />
          </div>
        )}
      </div>
    </div>
  );
}
