import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMyDbContext } from "../../mydb/MyDbContext";
import MyDbNav from "./MyDbNav";
import SqlEditor from "../../components/SqlEditor";
import { DataTable, ErrorPanel, ValidationBanner } from "../../components/ResultsPanel";
import { compareResults } from "../../validation/validate";
import type { QueryResult, ValidationResult } from "../../types";

export default function MyDbQuestionPracticePage() {
  const { questionId } = useParams();
  const { state, ready, runSql, updateQuestion } = useMyDbContext();
  const question = state.questions.find((q) => q.id === questionId);

  const [sql, setSql] = useState(question?.lastSolution ?? "");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<{ message: string; technical: string } | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showHints, setShowHints] = useState(false);

  if (!ready) {
    return <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">Loading your database…</div>;
  }
  if (!question) {
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

  const run = async () => {
    setLoading(true);
    setError(null);
    setValidation(null);
    try {
      const r = await runSql(sql);
      setResult(r);

      let passed = false;
      if (question.expectedSql) {
        try {
          const expected = await runSql(question.expectedSql);
          const v = compareResults(expected, r, false);
          setValidation(v);
          passed = v.status === "pass";
        } catch {
          // expected SQL itself failed to run — skip auto-grading silently
        }
      }

      await updateQuestion(question.id, {
        lastSolution: sql,
        lastAttemptAt: Date.now(),
        attempts: question.attempts + 1,
        passed: passed || question.passed,
      });
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      setError({ message: raw.split("\n")[0], technical: raw });
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <MyDbNav />
      <div className="flex-1 grid lg:grid-cols-2 min-h-0">
        <div className="border-r border-slate-800 flex flex-col min-h-0 overflow-y-auto">
          <div className="p-5 space-y-3">
            <Link to="/mydb/questions" className="text-xs text-slate-500 hover:text-slate-300">← All questions</Link>
            <h1 className="text-lg font-semibold text-white">{question.text}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{question.difficulty}</span>
              {question.topics.map((t) => (
                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">{t}</span>
              ))}
            </div>
            {question.notes && <p className="text-xs text-slate-500">{question.notes}</p>}
            {!question.expectedSql && (
              <p className="text-xs text-slate-600 italic">
                No expected answer was saved for this question — use it as a personal practice problem and judge the result yourself.
              </p>
            )}
            {question.hints.length > 0 && (
              <div>
                <button onClick={() => setShowHints((s) => !s)} className="text-xs text-sky-400 hover:text-sky-300">
                  {showHints ? "Hide hints" : `Show hints (${question.hints.length})`}
                </button>
                {showHints && (
                  <ul className="mt-2 space-y-1 text-xs text-slate-400 list-disc list-inside">
                    {question.hints.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <div className="text-[11px] text-slate-600">
              Attempts: {question.attempts} {question.passed && <span className="text-emerald-400">· Solved ✓</span>}
            </div>
          </div>
          <div className="border-t border-slate-800 flex-1 min-h-[300px] flex flex-col">
            <SqlEditor value={sql} onChange={setSql} onRun={run} height="260px" />
            <div className="flex items-center gap-2 px-3 py-2 border-t border-slate-800 bg-[#0d1220]">
              <button
                onClick={run}
                disabled={loading}
                className="px-4 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-[#06120c] text-sm font-semibold"
              >
                {loading ? "Running…" : "Run Query"}
              </button>
            </div>
          </div>
        </div>
        <div className="flex flex-col min-h-0">
          <div className="px-3 py-2 border-b border-slate-800 bg-[#0d1220] text-xs text-slate-500">Result</div>
          <div className="flex-1 min-h-0 overflow-auto">
            {error && <ErrorPanel message={error.message} technical={error.technical} />}
            {validation && result && <ValidationBanner result={validation} execMs={result.execMs} rowCount={result.rowCount} />}
            {result && !error && <DataTable result={result} />}
            {!result && !error && <div className="p-4 text-xs text-slate-600">Run your query to see results.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
