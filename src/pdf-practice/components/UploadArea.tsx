import { useRef, useState } from "react";

export default function UploadArea({ onFiles }: { onFiles: (files: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const pdfs = Array.from(fileList).filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (pdfs.length) onFiles(pdfs);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={`rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
        dragOver ? "border-emerald-500 bg-emerald-500/5" : "border-slate-700 bg-slate-900/30"
      }`}
    >
      <div className="text-3xl mb-3">📄</div>
      <h3 className="text-slate-200 font-semibold mb-1">Upload SQL Practice PDF</h3>
      <p className="text-sm text-slate-500 mb-4">Drag &amp; drop your PDF here, or choose a file. Multiple PDFs supported.</p>
      <button
        onClick={() => inputRef.current?.click()}
        className="px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-[#06120c] text-sm font-semibold"
      >
        Choose PDF
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <p className="text-[11px] text-slate-600 mt-4">
        Your PDF is processed entirely in your browser — nothing is uploaded to a server.
      </p>
    </div>
  );
}
