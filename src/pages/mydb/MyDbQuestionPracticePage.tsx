import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMyDbContext } from "../../mydb/MyDbContext";
import MyDbNav from "./MyDbNav";
import SqlEditor from "../../components/SqlEditor";
import { DataTable } from "../../components/ResultsPanel";
import { compareResults } from "../../validation/validate";
import { explainSqlError, schemaInfoFromTables } from "../../mydb/sqlErrorExplain";
import { explainQuery } from "../../mydb/sqlExplain";
import { analyzeMistake } from "../../mydb/mistakeAnalyzer";
import type { QueryResult, ValidationResult } from "../../types";

type Verdict = { validation: ValidationResult; mistake: ReturnType<typeof analyzeMistake> | null } | null;

export default function MyDbQuestionPracticePage() {
  const { questionId } = useParams();
  const { activeDatabase, ready, runSql, recordAttempt, recordHintUsed, recordSolutionRevealed } = useMyDbContext();
  const question = activeDatabase?.questions.find((q) => q.id === questionId);

  const [sql, setSql] = useState(question?.lastSolution ?? "");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [sqlError, setSqlError] = useState<ReturnType<typeof explainSqlError> | null>(null);
  const [verdict, setVerdict] = useState<Verdict>(null);
  const [loading, setLoading] = useState(false);
  const [hintIndex, setHintIndex] = useState(-1);
  const [showSolution, setShowSolution] = useState(false);
  const [explanation, setExplanation] = useState<string[] | null>(null);

  if (!ready) {
    return <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">Loading your database…</div>;
  }
  if (!question || !activeDatabase) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <MyDbNav />
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-500 text-sm">
          <p>Question not found.</p>
          <Link to="/mydb/questions" className="text-sky-400 hover:text-sky-300">Back to Questions</Link>
        </div>
      </div>
    );
  }

  const tables = activeDatabase.tables;

  const run = async () => {
    setLoading(true);
    setSqlError(null);
    setVerdict(null);
    setExplanation(null);
    try {
      const r = await runSql(sql);
      setResult(r);

      if (question.expectedSql) {
        try {
          const expected = await runSql(question.expectedSql);
          const validation = compareResults(expected, r, false);
          const mistake = validation.status === "fail" ? analyzeMistake(sql, question.expectedSql, r, expected) : null;
          setVerdict({ validation, mistake });
          await recordAttempt(question.id, { correct: validation.status === "pass", solutionSql: sql });
        } catch {
          // expected SQL itself failed to run — skip auto-grading silently, still count the attempt
          await recordAttempt(question.id, { correct: false, solutionSql: sql });
        }
      } else {
        await recordAttempt(question.id, { correct: false, solutionSql: sql });
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      setSqlError(explainSqlError(raw, schemaInfoFromTables(tables)));
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const revealNextHint = async () => {
    if (hintIndex + 1 >= question.hints.length) return;
    setHintIndex((i) => i + 1);
    await recordHintUsed(question.id);
  };

  const revealSolution = async () => {
    setShowSolution(true);
    await recordSolutionRevealed(question.id);
  };

  const retry = () => {
    setSql("");
    setResult(null);
    setSqlError(null);
    setVerdict(null);
    setExplanation(null);
  };

  const explainMyQuery = () => {
    setExplanation(explainQuery(sql).lines);
  };

  const markSolvedManually = async () => {
    await recordAttempt(question.id, { correct: true, solutionSql: sql });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <MyDbNav />
      <div className="flex-1 grid lg:grid-cols-2 min-h-0">
        <div className="border-r border-slate-800 flex flex-col min-h-0 overflow-y-auto">
          <div className="p-5 space-y-3">
            <Link to="/mydb/questions" className="text-xs text-slate-500 hover:text-slate-300">← All questions</Link>
            <h1 className="text-lg font-semibold text-white">{question.title}</h1>
            <p className="text-sm text-slate-300 whitespace-pre-line">{question.description}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{question.difficulty}</span>
              {question.topics.map((t) => (
                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">{t}</span>
              ))}
            </div>
            {question.notes && <p className="text-xs text-slate-500">{question.notes}</p>}
            {!question.expectedSql && (
              <div className="text-xs text-slate-600 italic flex items-center gap-2">
                <span>No expected answer was saved — use this as a personal practice problem and judge the result yourself.</span>
                <button onClick={markSolvedManually} className="not-italic text-emerald-400 hover:text-emerald-300 whitespace-nowrap">
                  Mark as solved
                </button>
              </div>
            )}

            {/* Progressive hints */}
            {question.hints.length > 0 && (
              <div className="border border-slate-800 rounded-md p-2.5 bg-[#0d1220]">
                <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1.5">Hints</div>
                {hintIndex >= 0 ? (
                  <ol className="space-y-1 text-xs text-slate-300 list-decimal list-inside">
                    {question.hints.slice(0, hintIndex + 1).map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-xs text-slate-600">No hints revealed yet.</p>
                )}
                {hintIndex + 1 < question.hints.length && (
                  <button onClick={revealNextHint} className="mt-2 text-xs text-sky-400 hover:text-sky-300">
                    Show Hint {hintIndex + 2}
                  </button>
                )}
              </div>
            )}

            {question.expectedSql && (
              <div>
                {!showSolution ? (
                  <button onClick={revealSolution} className="text-xs text-amber-400 hover:text-amber-300">
                    Show Solution
                  </button>
                ) : (
                  <div className="border border-amber-500/30 bg-amber-500/5 rounded-md p-2.5 space-y-2">
                    <div className="text-[10px] uppercase tracking-wide text-amber-500 font-semibold">Solution</div>
                    <pre className="text-xs font-mono text-amber-200/90 whitespace-pre-wrap">{question.expectedSql}</pre>
                    {question.explanation && <p className="text-xs text-slate-400">{question.explanation}</p>}
                  </div>
                )}
              </div>
            )}

            <div className="text-[11px] text-slate-600">
              Attempts: {question.attempts} ({question.correctAttempts} correct, {question.incorrectAttempts} incorrect) · Hints used: {question.hintsUsed}
              {question.passed && <span className="text-emerald-400"> · Solved ✓</span>}
            </div>
          </div>
          <div className="border-t border-slate-800 flex-1 min-h-[300px] flex flex-col">
            <SqlEditor value={sql} onChange={setSql} onRun={run} height="220px" />
            <div className="flex items-center gap-2 px-3 py-2 border-t border-slate-800 bg-[#0d1220] flex-wrap">
              <button
                onClick={run}
                disabled={loading}
                className="px-4 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-[#06120c] text-sm font-semibold"
              >
                {loading ? "Running…" : "Run Query"}
              </button>
              <button onClick={explainMyQuery} className="px-3 py-1.5 rounded-md border border-sky-700/60 hover:border-sky-500 text-sky-400 text-sm">
                Explain My Query
              </button>
              <button onClick={retry} className="px-3 py-1.5 rounded-md border border-slate-700 hover:border-slate-500 text-slate-300 text-sm">
                Retry
              </button>
            </div>
          </div>
        </div>
        <div className="flex flex-col min-h-0">
          <div className="px-3 py-2 border-b border-slate-800 bg-[#0d1220] text-xs text-slate-500">Result</div>
          <div className="flex-1 min-h-0 overflow-auto">
            {sqlError && (
              <div className="m-3 text-xs bg-rose-500/10 border border-rose-500/30 rounded-md px-3 py-2 space-y-1">
                <div className="text-rose-400 font-semibold">❌ {sqlError.title}</div>
                <div className="text-rose-300 whitespace-pre-line">{sqlError.message}</div>
                {sqlError.suggestion && <div className="text-emerald-400">{sqlError.suggestion}</div>}
                <details className="mt-1">
                  <summary className="text-rose-500/60 cursor-pointer">Technical Error</summary>
                  <div className="text-rose-500/70 font-mono mt-1">{sqlError.technical}</div>
                </details>
              </div>
            )}

            {verdict && (
              <div
                className={`m-3 text-sm rounded-md border px-4 py-3 ${
                  verdict.validation.status === "pass" ? "bg-emerald-500/10 border-emerald-500/30" : "bg-amber-500/10 border-amber-500/30"
                }`}
              >
                <div className={`flex items-center gap-2 font-semibold ${verdict.validation.status === "pass" ? "text-emerald-400" : "text-amber-400"}`}>
                  <span>{verdict.validation.status === "pass" ? "✅ Correct" : "❌ Not Quite"}</span>
                </div>
                {verdict.validation.status === "pass" ? (
                  <p className="text-emerald-200/80 mt-1">Your query returns the expected result. Great job!</p>
                ) : (
                  <>
                    <p className="text-amber-200/80 mt-1">{verdict.validation.detail ?? verdict.validation.message}</p>
                    {verdict.mistake?.headline && (
                      <p className="text-amber-100 mt-2 whitespace-pre-line border-t border-amber-500/20 pt-2">{verdict.mistake.headline}</p>
                    )}
                    {verdict.mistake?.details.map((d, i) => (
                      <p key={i} className="text-amber-200/70 mt-1 text-xs">{d}</p>
                    ))}
                  </>
                )}
              </div>
            )}

            {explanation && (
              <div className="m-3 text-xs bg-sky-500/10 border border-sky-500/30 rounded-md px-3 py-2 space-y-1">
                <div className="text-sky-400 font-semibold mb-1">Explain My Query</div>
                {explanation.map((line, i) => (
                  <p key={i} className="text-slate-300">{line}</p>
                ))}
              </div>
            )}

            {result && !sqlError && <DataTable result={result} />}
            {!result && !sqlError && <div className="p-4 text-xs text-slate-600">Run your query to see results.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
