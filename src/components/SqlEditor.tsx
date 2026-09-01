import Editor, { type OnMount } from "@monaco-editor/react";
import { useRef } from "react";

export default function SqlEditor({
  value,
  onChange,
  onRun,
  height = "100%",
}: {
  value: string;
  onChange: (v: string) => void;
  onRun?: () => void;
  height?: string;
}) {
  const runRef = useRef(onRun);
  runRef.current = onRun;

  const handleMount: OnMount = (editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      runRef.current?.();
    });
  };

  return (
    <Editor
      height={height}
      defaultLanguage="sql"
      theme="vs-dark"
      value={value}
      onChange={(v) => onChange(v ?? "")}
      onMount={handleMount}
      options={{
        minimap: { enabled: false },
        fontSize: 13,
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        scrollBeyondLastLine: false,
        padding: { top: 12 },
        wordWrap: "on",
        tabSize: 2,
        automaticLayout: true,
      }}
    />
  );
}
