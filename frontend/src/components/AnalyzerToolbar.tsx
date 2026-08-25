import React, { useRef } from 'react';
import { IconUpload, IconPlay } from './Icons';

interface AnalyzerToolbarProps {
  fileStatus: string;
  onFileUpload: (code: string, filename: string) => void;
  onClear: () => void;
  onResetExample: () => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
}

export const AnalyzerToolbar: React.FC<AnalyzerToolbarProps> = ({
  fileStatus,
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

    if (!file.name.toLowerCase().endsWith('.py')) {
      alert('Only .py files are supported.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || '');
      onFileUpload(content, file.name);
    };
    reader.readAsText(file);
  };

  return (
    <div className="analyzer-header-container">
      <div className="analyzer-header-text">
        <h1 className="analyzer-page-title">Python Analyzer</h1>
        <p className="analyzer-page-sub">Inspect structure, complexity, dead code, and optimization opportunities.</p>
      </div>

      <div className="analyzer-header-actions">
        <input
          ref={fileInputRef}
          className="file-input"
          type="file"
          accept=".py"
          onChange={handleFileChange}
        />

        <button
          className="btn btn-secondary toolbar-btn"
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Upload Python source file"
        >
          <IconUpload size={14} />
          <span>Upload</span>
        </button>

        <button
          className="btn btn-secondary toolbar-btn"
          type="button"
          onClick={onClear}
        >
          Clear
        </button>

        <button
          className="btn btn-secondary toolbar-btn"
          type="button"
          onClick={onResetExample}
        >
          Reset Sample
        </button>

        <button
          className="btn btn-primary toolbar-btn analyze-cta-btn"
          type="button"
          onClick={onAnalyze}
          disabled={isAnalyzing}
        >
          <IconPlay size={14} />
          <span>{isAnalyzing ? 'Analyzing…' : 'Analyze'}</span>
        </button>
      </div>
    </div>
  );
};
