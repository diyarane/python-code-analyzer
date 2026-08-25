import React, { useEffect, useRef } from 'react';
import Editor, { Monaco, OnMount } from '@monaco-editor/react';

interface CodeEditorProps {
  value: string;
  onChange: (val: string) => void;
  theme: 'dark' | 'light';
  fileStatus: string;
  highlightLine: number | null;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  theme,
  fileStatus,
  highlightLine,
}) => {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorationsRef = useRef<string[]>([]);

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
  };

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !highlightLine) return;

    try {
      const editor = editorRef.current;
      const monaco = monacoRef.current;

      editor.revealLineInCenter(highlightLine);
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [
        {
          range: new monaco.Range(highlightLine, 1, highlightLine, 1),
          options: {
            isWholeLine: true,
            className: 'monaco-highlight-line',
            glyphMarginClassName: 'monaco-highlight-glyph',
          },
        },
      ]);
    } catch (err) {
      console.error('Error applying Monaco line decoration:', err);
    }
  }, [highlightLine]);

  return (
    <section className="panel editor-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Input</p>
          <h1>Python Editor</h1>
        </div>
        <span className="status-pill">{fileStatus}</span>
      </div>
      <div className="editor">
        <Editor
          height="100%"
          language="python"
          theme={theme === 'dark' ? 'vs-dark' : 'vs'}
          value={value}
          onChange={(val) => onChange(val || '')}
          onMount={handleEditorMount}
          options={{
            automaticLayout: true,
            minimap: { enabled: false },
            fontSize: 14,
            fontLigatures: true,
            lineHeight: 22,
            padding: { top: 18, bottom: 18 },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            roundedSelection: true,
            cursorBlinking: 'smooth',
            glyphMargin: true,
          }}
        />
      </div>
    </section>
  );
};
