import React from 'react';
import { Explanations } from '../types/analyzer';

interface AnalysisPanelProps {
  explanations: Explanations | null;
  error?: string | null;
  errorMessage?: string | null;
  onSaveExplanation?: () => void;
  isSaved?: boolean;
  canSave?: boolean;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  explanations,
  error,
  errorMessage,
  onSaveExplanation,
  isSaved = false,
  canSave = false,
}) => {
  return (
    <aside className="panel ai-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Assistant</p>
          <h2>AI Explanation</h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {canSave && onSaveExplanation && (
            <button
              type="button"
              className={`btn ${isSaved ? 'btn-secondary' : 'btn-primary'} nav-btn-sm`}
              onClick={onSaveExplanation}
              disabled={isSaved}
              title={isSaved ? 'Analysis saved to your history' : 'Save analysis to your account history'}
            >
              {isSaved ? 'Saved ✓' : 'Save Explanation'}
            </button>
          )}
          <span className="pulse-dot" aria-hidden="true"></span>
        </div>
      </div>

      <div className="ai-output">
        {error ? (
          <article className="explanation-card">
            <span className="insight-tag">Parser</span>
            <p>
              <strong>{error}</strong>: {errorMessage || 'Check Python syntax and try again.'}
            </p>
          </article>
        ) : explanations ? (
          <article className="explanation-card">
            <span className="insight-tag">Analysis</span>
            <p>{explanations.summary}</p>
            <p>
              <strong>Time</strong> — {explanations.time}
            </p>
            <p>
              <strong>Space</strong> — {explanations.space}
            </p>
            <p>
              <strong>Optimization</strong> — {explanations.optimization}
            </p>
          </article>
        ) : (
          <div>
            Click <strong>Analyze</strong> to generate an AI-style explanation for the current code.
          </div>
        )}
      </div>
    </aside>
  );
};
