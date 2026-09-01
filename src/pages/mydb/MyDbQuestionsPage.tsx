import { useState } from "react";
import { Link } from "react-router-dom";
import { useMyDbContext } from "../../mydb/MyDbContext";
import MyDbNav from "./MyDbNav";
import { generateQuestions } from "../../mydb/questionGenerator";
import type { MyDbDifficulty, MyDbQuestion } from "../../mydb/types";

const TOPIC_OPTIONS = ["SELECT", "WHERE", "ORDER BY", "GROUP BY", "HAVING", "JOIN", "Subquery", "CTE", "Window Functions", "CASE", "Aggregation", "Self Join"];

function NewQuestionForm({ onSave, onCancel }: { onSave: (q: MyDbQuestion) => void; onCancel: () => void }) {
  const [text, setText] = useState("");
  const [expectedSql, setExpectedSql] = useState("");
  const [difficulty, setDifficulty] = useState<MyDbDifficulty>("beginner");
  const [topics, setTopics] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [hintsText, setHintsText] = useState("");

  const toggleTopic = (t: string) => setTopics((ts) => (ts.includes(t) ? ts.filter((x) => x !== t) : [...ts, t]));

  const submit = () => {
    if (!text.trim()) return;
    onSave({
      id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text: text.trim(),
      expectedSql: expectedSql.trim() || null,
      hints: hintsText.split("\n").map((h) => h.trim()).filter(Boolean),
      difficulty,
      topics,
      notes,
      createdAt: Date.now(),
      attempts: 0,
      passed: false,
    });
  };

  return (
    <div className="border border-slate-800 rounded-lg p-4 bg-[#0d1220] space-y-3 mb-6">
      <div>
        <label className="text-xs uppercase tracking-wide text-slate-500 font-semibold block mb-1.5">Question</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder="Find the second highest salary in each department"
          className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-200"
        />
      </div>
      <div>
        <label className="text-xs uppercase tracking-wide text-slate-500 font-semibold block mb-1.5">
          Expected answer SQL <span className="normal-case text-slate-600">(optional)</span>
        </label>
        <textarea
          value={expectedSql}
          onChange={(e) => setExpectedSql(e.target.value)}
          rows={3}
          placeholder="SELECT ... (leave blank to practice without auto-grading)"
          className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-xs font-mono text-slate-200"
        />
      </div>
      <div>
        <label className="text-xs uppercase tracking-wide text-slate-500 font-semibold block mb-1.5">
          Hints <span className="normal-case text-slate-600">(one per line, optional)</span>
        </label>
        <textarea
          value={hintsText}
          onChange={(e) => setHintsText(e.target.value)}
          rows={2}
          className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-200"
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-500 font-semibold block mb-1.5">Difficulty</label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as MyDbDifficulty)}
            className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-1.5 text-sm text-slate-200"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-500 font-semibold block mb-1.5">
            Notes <span className="normal-case text-slate-600">(optional)</span>
          </label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-1.5 text-sm text-slate-200"
          />
        </div>
      </div>
      <div>
        <label className="text-xs uppercase tracking-wide text-slate-500 font-semibold block mb-1.5">Topics</label>
        <div className="flex flex-wrap gap-1.5">
          {TOPIC_OPTIONS.map((t) => (
            <button
              key={t}
              onClick={() => toggleTopic(t)}
              className={`text-[11px] px-2 py-1 rounded-md border ${
                topics.includes(t) ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300" : "border-slate-700 text-slate-400"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1.5 rounded-md border border-slate-700 text-slate-300 text-sm">
          Cancel
        </button>
        <button onClick={submit} className="px-4 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-[#06120c] text-sm font-semibold">
          Save Question
        </button>
      </div>
    </div>
  );
}

export default function MyDbQuestionsPage() {
  const { state, ready, addQuestion, deleteQuestion } = useMyDbContext();
  const [showForm, setShowForm] = useState(false);

  if (!ready) {
    return <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">Loading your database…</div>;
  }

  const handleGenerate = async () => {
    const generated = generateQuestions(state.tables);
    for (const q of generated) {
      await addQuestion(q);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <MyDbNav />
      <div className="flex-1 overflow-y-auto p-6 max-w-3xl w-full mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold text-white">My Questions</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerate}
              disabled={state.tables.length === 0}
              className="text-xs px-3 py-1.5 rounded-md border border-sky-700/60 hover:border-sky-500 text-sky-400 disabled:opacity-40"
            >
              Generate Practice Questions
            </button>
            <button
              onClick={() => setShowForm((s) => !s)}
              className="text-xs px-3 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-[#06120c] font-semibold"
            >
              + New Question
            </button>
          </div>
        </div>

        {state.tables.length === 0 && (
          <p className="text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2 mb-4">
            Create at least one table on the Dashboard before writing practice questions.
          </p>
        )}

        {showForm && (
          <NewQuestionForm
            onCancel={() => setShowForm(false)}
            onSave={async (q) => {
              await addQuestion(q);
              setShowForm(false);
            }}
          />
        )}

        {state.questions.length === 0 ? (
          <p className="text-sm text-slate-600">No questions yet. Create one, or generate a few from your schema.</p>
        ) : (
          <div className="space-y-2">
            {state.questions.map((q, i) => (
              <div key={q.id} className="border border-slate-800 rounded-lg p-3 bg-[#0d1220] flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm text-slate-200">
                    {i + 1}. {q.text}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        q.passed ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {q.passed ? "solved" : q.attempts > 0 ? "attempted" : "unattempted"}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{q.difficulty}</span>
                    {q.topics.map((t) => (
                      <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">
                        {t}
                      </span>
                    ))}
                    {!q.expectedSql && <span className="text-[10px] text-slate-600">no expected answer</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Link to={`/mydb/questions/${q.id}`} className="text-xs text-sky-400 hover:text-sky-300">
                    Practice
                  </Link>
                  <button onClick={() => deleteQuestion(q.id)} className="text-xs text-rose-500/80 hover:text-rose-400">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
