import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import UploadArea from "../../pdf-practice/components/UploadArea";
import ProcessingChecklist from "../../pdf-practice/components/ProcessingChecklist";
import ReviewPanel from "../../pdf-practice/components/ReviewPanel";
import { stagePdf, stagedToPracticeSet, type StagedSet } from "../../pdf-practice/buildPracticeSet";
import { deleteSet, listSets, savePdfBlob, saveSet } from "../../pdf-practice/pdfStore";
import type { PdfPracticeSet, ProcessingStep } from "../../pdf-practice/types";
import { PROCESSING_STEPS } from "../../pdf-practice/pdfExtract";

function setProgress(set: PdfPracticeSet) {
  const total = set.questions.length;
  const completed = set.questions.filter((q) => q.status === "completed").length;
  const incorrect = set.questions.filter((q) => q.status === "incorrect").length;
  const review = set.questions.filter((q) => q.status === "review").length;
  const unattempted = total - completed - incorrect - review;
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { total, completed, incorrect, review, unattempted, pct };
}

export default function PdfLibrary() {
  const [sets, setSets] = useState<PdfPracticeSet[]>([]);
  const [queue, setQueue] = useState<File[]>([]);
  const [processing, setProcessing] = useState<{ file: File; steps: ProcessingStep[]; percent: number } | null>(null);
  const [pendingReviews, setPendingReviews] = useState<StagedSet[]>([]);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const refresh = () => listSets().then(setSets);

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (processing || queue.length === 0) return;
    const [next, ...rest] = queue;
    setQueue(rest);
    setProcessing({
      file: next,
      steps: PROCESSING_STEPS.map((s) => ({ ...s, status: "pending" as const })),
      percent: 0,
    });
    stagePdf(next, (steps, percent) => setProcessing({ file: next, steps, percent }))
      .then((staged) => {
        setPendingReviews((p) => [...p, staged]);
        setProcessing(null);
      })
      .catch((err) => {
        setError(`Failed to process "${next.name}": ${err instanceof Error ? err.message : String(err)}`);
        setProcessing(null);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, processing]);

  const handleFiles = (files: File[]) => {
    setError(null);
    setQueue((q) => [...q, ...files]);
  };

  const handleCreate = async (staged: StagedSet, name: string) => {
    const id = `pdf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const set = stagedToPracticeSet(staged, id, name);
    await saveSet(set);
    await savePdfBlob(id, staged.file);
    setPendingReviews((p) => p.filter((s) => s !== staged));
    await refresh();
    navigate(`/pdf/${id}`);
  };

  const handleDiscard = (staged: StagedSet) => {
    setPendingReviews((p) => p.filter((s) => s !== staged));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this PDF practice set? This can't be undone.")) return;
    await deleteSet(id);
    await refresh();
  };

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-8">
      <h1 className="text-xl font-semibold text-white mb-1">PDF Practice</h1>
      <p className="text-sm text-slate-500 mb-6">
        Upload a PDF containing SQL schemas, sample data, questions and answers — the site turns it into an interactive
        practice set, using the same SQL engine as the rest of the app.
      </p>

      <div className="mb-6">
        <UploadArea onFiles={handleFiles} />
      </div>

      {error && (
        <div className="mb-4 text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-md px-3 py-2">{error}</div>
      )}

      {queue.length > 0 && !processing && (
        <p className="text-xs text-slate-500 mb-2">{queue.length} more PDF(s) queued…</p>
      )}

      {processing && (
        <div className="mb-6">
          <ProcessingChecklist fileName={processing.file.name} steps={processing.steps} percent={processing.percent} />
        </div>
      )}

      {pendingReviews.length > 0 && (
        <div className="space-y-4 mb-8">
          {pendingReviews.map((staged, i) => (
            <ReviewPanel
              key={i}
              staged={staged}
              onCreate={(name) => handleCreate(staged, name)}
              onDiscard={() => handleDiscard(staged)}
            />
          ))}
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-white mb-3">My Practice PDFs</h2>
        {sets.length === 0 && <p className="text-sm text-slate-500">No PDFs uploaded yet.</p>}
        <div className="grid sm:grid-cols-2 gap-3">
          {sets.map((s) => {
            const p = setProgress(s);
            return (
              <div key={s.id} className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
                <Link to={`/pdf/${s.id}`} className="block mb-2">
                  <div className="text-sm font-medium text-slate-100 hover:text-white truncate">{s.name}</div>
                  <div className="text-[11px] text-slate-500">
                    {p.total} question{p.total === 1 ? "" : "s"} · {s.tables.length} table{s.tables.length === 1 ? "" : "s"}
                  </div>
                </Link>
                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden mb-1.5">
                  <div className="h-full bg-emerald-500" style={{ width: `${p.pct}%` }} />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    {p.completed}/{p.total} completed ({p.pct}%)
                  </span>
                  <button onClick={() => handleDelete(s.id)} className="text-rose-500/70 hover:text-rose-400">
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
