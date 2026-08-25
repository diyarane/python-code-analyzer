import React, { useRef } from 'react';
import { IconUpload, IconPlay, IconTrash2, IconRotateCcw } from './Icons';
import { ClientDetectionResult, SUPPORTED_LANGUAGES } from '../utils/languageDetector';

interface AnalyzerToolbarProps {
  fileStatus: string;
  onFileUpload: (content: string, filename: string) => void;
  onClear: () => void;
  onResetExample: () => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  selectedLanguageMode: string;
  onLanguageModeChange: (mode: string) => void;
  detectedLanguage: ClientDetectionResult;
}

export const AnalyzerToolbar: React.FC<AnalyzerToolbarProps> = ({
  onFileUpload,
  onClear,
  onResetExample,
  onAnalyze,
  isAnalyzing,
  selectedLanguageMode,
  onLanguageModeChange,
  detectedLanguage,
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

  const isSupported = detectedLanguage.supported;

  return (
    <div className="analyzer-header-container">
      {/* Top Row: Page Title & Action Buttons */}
      <div className="analyzer-header-top-row">
        <div className="analyzer-header-text">
          <h1 className="analyzer-page-title">
            {detectedLanguage.displayName} Analyzer
          </h1>
          <p className="analyzer-page-sub">
            Inspect structure, complexity, dead code, and optimization opportunities.
          </p>
        </div>

        <div className="analyzer-action-button-group">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".py,.js,.jsx,.ts,.tsx,.java,.c,.cpp,.go,.rs,.txt"
            className="file-input"
          />

          <button
            className="btn btn-secondary nav-btn-sm"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Upload source file"
            aria-label="Upload source file"
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
            title="Reset to default code sample"
            aria-label="Reset to default code sample"
          >
            <IconRotateCcw size={15} /> Reset
          </button>

          <button
            className="btn btn-primary analyze-cta-btn"
            type="button"
            onClick={onAnalyze}
            disabled={isAnalyzing || !isSupported}
            title={
              !isSupported
                ? `AST analysis for ${detectedLanguage.displayName} is coming soon`
                : 'Run AST and Complexity Analysis'
            }
            aria-label={
              !isSupported
                ? `AST analysis for ${detectedLanguage.displayName} is coming soon`
                : 'Run AST and Complexity Analysis'
            }
          >
            <IconPlay size={16} /> {isAnalyzing ? 'Analyzing…' : 'Analyze'}
          </button>
        </div>
      </div>

      {/* Bottom Row: Language Selector & Auto/Manual Status Badge */}
      <div className="language-selector-section-row">
        <div className="language-selector-control-group">
          <span className="language-selector-label">Programming Language:</span>
          <select
            id="language-select-dropdown"
            className="lang-select-dropdown"
            value={selectedLanguageMode}
            onChange={(e) => onLanguageModeChange(e.target.value)}
            aria-label="Select Programming Language"
            title="Select Programming Language"
            style={{ minWidth: '180px' }}
          >
            <option value="auto">Auto Detect</option>
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {lang.displayName} {lang.supported ? '' : '(Coming Soon)'}
              </option>
            ))}
          </select>

          <span
            className={`lang-status-badge ${
              !isSupported ? 'is-unsupported' : detectedLanguage.source === 'manual' ? 'is-manual' : 'is-auto'
            }`}
            title={
              !isSupported
                ? `AST Analysis for ${detectedLanguage.displayName} is coming soon`
                : `Language: ${detectedLanguage.displayName} (${detectedLanguage.source})`
            }
          >
            {!isSupported
              ? `${detectedLanguage.displayName} (Coming Soon)`
              : selectedLanguageMode === 'auto'
              ? `Auto: ${detectedLanguage.displayName}`
              : `Manual: ${detectedLanguage.displayName}`}
          </span>
        </div>
      </div>
    </div>
  );
};
