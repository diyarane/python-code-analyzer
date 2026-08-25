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
  isCollapsed: boolean;
  onToggleCollapse: () => void;
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
  isCollapsed,
  onToggleCollapse,
}) => {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const onAnalyzeRef = useRef(onAnalyze);

  const lineCount = value.split('\n').length;

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

    // Monaco Scroll Boundary Propagation: Prevent trapping mouse wheel at top/bottom boundaries
    const domNode = editor.getDomNode();
    if (domNode) {
      domNode.addEventListener(
        'wheel',
        (e: WheelEvent) => {
          const model = editor.getModel();
          if (!model) return;

          const totalLines = model.getLineCount();
          const visibleRanges = editor.getVisibleRanges();
          if (!visibleRanges || visibleRanges.length === 0) return;

          const firstVisible = visibleRanges[0].startLineNumber;
          const lastVisible = visibleRanges[visibleRanges.length - 1].endLineNumber;
          const scrollTop = editor.getScrollTop();

          const isAtTop = firstVisible === 1 && scrollTop === 0;
          const isAtBottom = lastVisible >= totalLines;

          // If scrolling UP at top boundary or DOWN at bottom boundary, propagate to window
          if ((e.deltaY < 0 && isAtTop) || (e.deltaY > 0 && isAtBottom)) {
            window.scrollBy({ top: e.deltaY, behavior: 'auto' });
          }
        },
        { passive: true }
      );
    }
  };

  // Handle AST Node selection line highlight
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || isCollapsed) return;
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
  }, [highlightLine, isCollapsed]);

  // Handle Syntax/Parsing Error Markers
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || isCollapsed) return;
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
  }, [errorLine, errorMessage, isCollapsed]);

  return (
    <section className={`workspace-section panel editor-panel-section ${isCollapsed ? 'is-collapsed' : ''}`}>
      <div className="section-header editor-header">
        <div className="editor-header-left">
          <p className="eyebrow">Workspace</p>
          <h2>Python Editor</h2>
          {!isCollapsed && <p className="section-subtitle">Write, paste, or upload Python source code.</p>}
        </div>

        <div className="section-header-actions">
          {!isCollapsed && (
            <>
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
            </>
          )}

          <span className="status-pill">
            {isCollapsed ? `${lineCount} lines` : fileStatus}
          </span>

          <button
            type="button"
            className="btn btn-secondary nav-btn-sm collapse-btn"
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Expand Python Editor' : 'Collapse Python Editor'}
          >
            {isCollapsed ? 'Expand ↓' : 'Collapse ↑'}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="editor-container">
          <Editor
            height="340px"
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
              padding: { top: 12, bottom: 12 },
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
      )}
    </section>
  );
};
