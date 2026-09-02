import { useState } from "react";
import { Link } from "react-router-dom";
import { useMyDbContext } from "../../mydb/MyDbContext";
import MyDbNav from "./MyDbNav";
import { generateQuestions } from "../../mydb/questionGenerator";
import { TOPIC_OPTIONS, type MyDbDifficulty, type MyDbQuestion } from "../../mydb/types";
import { newQuestion } from "../../mydb/types";

function QuestionForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: MyDbQuestion;
  onSave: (q: MyDbQuestion) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [expectedSql, setExpectedSql] = useState(initial?.expectedSql ?? "");
  const [explanation, setExplanation] = useState(initial?.explanation ?? "");
  const [difficulty, setDifficulty] = useState<MyDbDifficulty>(initial?.difficulty ?? "beginner");
  const [topics, setTopics] = useState<string[]>(initial?.topics ?? []);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [hintsText, setHintsText] = useState((initial?.hints ?? []).join("\n"));

  const toggleTopic = (t: string) => setTopics((ts) => (ts.includes(t) ? ts.filter((x) => x !== t) : [...ts, t]));

  const submit = () => {
    if (!title.trim() || !description.trim()) return;
    const hints = hintsText.split("\n").map((h) => h.trim()).filter(Boolean);
    if (initial) {
      onSave({ ...initial, title: title.trim(), description: description.trim(), expectedSql: expectedSql.trim() || null, explanation, hints, difficulty, topics, notes });
    } else {
      onSave(newQuestion({ title: title.trim(), description: description.trim(), expectedSql: expectedSql.trim() || null, explanation, hints, difficulty, topics, notes }));
    }
  };

  return (
    <div className="border border-slate-800 rounded-lg p-4 bg-[#0d1220] space-y-3 mb-6">
      <div>
        <label className="text-xs uppercase tracking-wide text-slate-500 font-semibold block mb-1.5">Question title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Second-highest salary in each department"
          className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-200"
        />
      </div>
      <div>
        <label className="text-xs uppercase tracking-wide text-slate-500 font-semibold block mb-1.5">Question description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Find the second-highest salary in each department."
          className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-200"
        />
      </div>
      <div>
        <label className="text-xs uppercase tracking-wide text-slate-500 font-semibold block mb-1.5">
          Expected answer SQL <span className="normal-case text-slate-600">(optional — enables auto-grading)</span>
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
          Explanation <span className="normal-case text-slate-600">(optional — shown alongside the solution)</span>
        </label>
        <textarea
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          rows={2}
          className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-200"
        />
      </div>
      <div>
        <label className="text-xs uppercase tracking-wide text-slate-500 font-semibold block mb-1.5">
          Hints <span className="normal-case text-slate-600">(one per line, optional — revealed one at a time)</span>
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

type Filter = "all" | "not_attempted" | "solved" | "needs_practice" | MyDbDifficulty;

export default function MyDbQuestionsPage() {
  const { activeDatabase, ready, addQuestion, updateQuestion, deleteQuestion } = useMyDbContext();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  if (!ready) {
    return <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">Loading your database…</div>;
  }
  if (!activeDatabase) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <MyDbNav />
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">Create a database on the Dashboard first.</div>
      </div>
    );
  }

  const questions = activeDatabase.questions;
  const editing = editingId ? questions.find((q) => q.id === editingId) : undefined;

  const handleGenerate = async () => {
    const generated = generateQuestions(activeDatabase.tables);
    for (const q of generated) {
      await addQuestion(q);
    }
  };

  const filtered = questions.filter((q) => {
    switch (filter) {
      case "all":
        return true;
      case "not_attempted":
        return q.attempts === 0;
      case "solved":
        return q.passed;
      case "needs_practice":
        return q.attempts > 0 && !q.passed;
      default:
        return q.difficulty === filter;
    }
  });

  const filterOptions: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "not_attempted", label: "Not Attempted" },
    { key: "solved", label: "Solved" },
    { key: "needs_practice", label: "Needs Practice" },
    { key: "beginner", label: "Beginner" },
    { key: "intermediate", label: "Intermediate" },
    { key: "advanced", label: "Advanced" },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <MyDbNav />
      <div className="flex-1 overflow-y-auto p-6 max-w-3xl w-full mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold text-white">My Questions</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerate}
              disabled={activeDatabase.tables.length === 0}
              className="text-xs px-3 py-1.5 rounded-md border border-sky-700/60 hover:border-sky-500 text-sky-400 disabled:opacity-40"
            >
              Generate Practice Questions
            </button>
            <button
              onClick={() => {
                setEditingId(null);
                setShowForm((s) => !s);
              }}
              className="text-xs px-3 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-[#06120c] font-semibold"
            >
              + New Question
            </button>
          </div>
        </div>

        {activeDatabase.tables.length === 0 && (
          <p className="text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2 mb-4">
            Create at least one table on the Dashboard before writing practice questions.
          </p>
        )}

        {showForm && (
          <QuestionForm
            onCancel={() => setShowForm(false)}
            onSave={async (q) => {
              await addQuestion(q);
              setShowForm(false);
            }}
          />
        )}

        {editing && (
          <QuestionForm
            initial={editing}
            onCancel={() => setEditingId(null)}
            onSave={async (q) => {
              await updateQuestion(q.id, q);
              setEditingId(null);
            }}
          />
        )}

        {questions.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mb-4">
            {filterOptions.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`text-[11px] px-2 py-1 rounded-md border ${
                  filter === f.key ? "bg-slate-800 border-slate-600 text-white" : "border-slate-800 text-slate-500 hover:text-slate-300"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {questions.length === 0 ? (
          <p className="text-sm text-slate-600">No questions yet. Create one, or generate a few from your schema.</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-600">No questions match this filter.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((q, i) => (
              <div key={q.id} className="border border-slate-800 rounded-lg p-3 bg-[#0d1220] flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm text-slate-200 font-medium">
                    {i + 1}. {q.title}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{q.description}</div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        q.passed ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {q.passed ? "solved" : q.attempts > 0 ? "needs practice" : "not attempted"}
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
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setEditingId(q.id);
                    }}
                    className="text-xs text-slate-400 hover:text-slate-200"
                  >
                    Edit
                  </button>
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
