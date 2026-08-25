import React, { useEffect, useRef } from 'react';
import Editor, { Monaco, OnMount } from '@monaco-editor/react';

interface CodeEditorProps {
  value: string;
  onChange: (val: string) => void;
  onAnalyze: () => void;
  onClear: () => void;
  onResetExample: () => void;
  theme: 'dark' | 'light';
  fileStatus: string;
  highlightLine: number | null;
  errorLine: number | null;
  errorMessage: string | null;
  isAnalyzing: boolean;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  onAnalyze,
  onClear,
  onResetExample,
  theme,
  fileStatus,
  highlightLine,
  errorLine,
  errorMessage,
}) => {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const onAnalyzeRef = useRef(onAnalyze);

  useEffect(() => {
    onAnalyzeRef.current = onAnalyze;
  }, [onAnalyze]);

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register Cmd/Ctrl + Enter shortcut
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onAnalyzeRef.current();
    });
  };

  // Handle AST Node selection line highlight
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;
    const editor = editorRef.current;
    const monaco = monacoRef.current;

    if (highlightLine) {
      try {
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
    } else {
      try {
        decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
      } catch (_) {
        /* ignore */
      }
    }
  }, [highlightLine]);

  // Handle Syntax/Parsing Error Markers
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor.getModel();

    if (!model) return;

    if (errorLine && errorLine > 0) {
      const maxCol = model.getLineMaxColumn(errorLine) || 100;
      monaco.editor.setModelMarkers(model, 'python', [
        {
          severity: monaco.MarkerSeverity.Error,
          message: errorMessage || 'Syntax error',
          startLineNumber: errorLine,
          startColumn: 1,
          endLineNumber: errorLine,
          endColumn: maxCol,
        },
      ]);
      editor.revealLineInCenter(errorLine);
    } else {
      monaco.editor.setModelMarkers(model, 'python', []);
    }
  }, [errorLine, errorMessage]);

  return (
    <section className="workspace-section panel editor-panel-section">
      <div className="section-header">
        <div>
          <p className="eyebrow">Workspace</p>
          <h2>Python Editor</h2>
          <p className="section-subtitle">Write, edit, or paste Python source code for analysis.</p>
        </div>
        <div className="section-header-actions">
          <button
            type="button"
            className="btn btn-secondary nav-btn-sm"
            onClick={onClear}
          >
            Clear
          </button>
          <button
            type="button"
            className="btn btn-secondary nav-btn-sm"
            onClick={onResetExample}
          >
            Reset
          </button>
          <span className="status-pill">{fileStatus}</span>
        </div>
      </div>

      <div className="editor-container">
        <Editor
          height="400px"
          language="python"
          theme={theme === 'dark' ? 'vs-dark' : 'vs'}
          value={value}
          onChange={(val) => onChange(val || '')}
          onMount={handleEditorMount}
          options={{
            automaticLayout: true,
            minimap: { enabled: true, renderCharacters: false },
            fontSize: 14,
            fontLigatures: true,
            lineHeight: 22,
            padding: { top: 14, bottom: 14 },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            roundedSelection: true,
            cursorBlinking: 'smooth',
            glyphMargin: true,
            folding: true,
            matchBrackets: 'always',
            autoIndent: 'advanced',
            wordWrap: 'on',
            renderLineHighlight: 'all',
          }}
        />
      </div>
    </section>
  );
};
