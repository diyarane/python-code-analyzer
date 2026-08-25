import React, { useRef } from 'react';
import { IconUpload, IconPlay, IconTrash2, IconRotateCcw } from './Icons';

interface AnalyzerToolbarProps {
  fileStatus: string;
  onFileUpload: (content: string, filename: string) => void;
  onClear: () => void;
  onResetExample: () => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
}

export const AnalyzerToolbar: React.FC<AnalyzerToolbarProps> = ({
  onFileUpload,
  onClear,
  onResetExample,
  onAnalyze,
  isAnalyzing,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content !== undefined) {
        onFileUpload(content, file.name);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="analyzer-header-container">
      <div className="analyzer-header-text">
        <h1 className="analyzer-page-title">Python Analyzer</h1>
        <p className="analyzer-page-sub">
          Inspect structure, complexity, dead code, and optimization opportunities.
        </p>
      </div>

      <div className="analyzer-header-actions">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".py"
          className="file-input"
        />

        <button
          className="btn btn-secondary nav-btn-sm"
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Upload Python source file"
          aria-label="Upload Python source file"
        >
          <IconUpload size={15} /> Upload
        </button>

        <button
          className="btn btn-secondary nav-btn-sm"
          type="button"
          onClick={onClear}
          title="Clear editor code"
          aria-label="Clear editor code"
        >
          <IconTrash2 size={15} /> Clear
        </button>

        <button
          className="btn btn-secondary nav-btn-sm"
          type="button"
          onClick={onResetExample}
          title="Reset to default Python sample"
          aria-label="Reset to default Python sample"
        >
          <IconRotateCcw size={15} /> Reset
        </button>

        <button
          className="btn btn-primary analyze-cta-btn"
          type="button"
          onClick={onAnalyze}
          disabled={isAnalyzing}
          title="Run AST and Complexity Analysis"
          aria-label="Run AST and Complexity Analysis"
        >
          <IconPlay size={16} /> {isAnalyzing ? 'Analyzing…' : 'Analyze'}
        </button>
      </div>
    </div>
  );
};
