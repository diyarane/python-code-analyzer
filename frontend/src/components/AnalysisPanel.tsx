import React from 'react';
import { Explanations } from '../types/analyzer';
import { IconSave, IconCheck } from './Icons';

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

        {canSave && onSaveExplanation && (
          <button
            type="button"
            className={`btn ${isSaved ? 'btn-secondary' : 'btn-primary'} nav-btn-sm save-panel-btn`}
            onClick={onSaveExplanation}
            disabled={isSaved}
            title={isSaved ? 'Analysis saved to your history' : 'Save analysis to your account history'}
          >
            {isSaved ? (
              <>
                <IconCheck size={14} />
                <span>Saved</span>
              </>
            ) : (
              <>
                <IconSave size={14} />
                <span>Save Explanation</span>
              </>
            )}
          </button>
        )}
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
          <div className="ai-empty-text">
            Click <strong>Analyze</strong> to generate static complexity explanations and recommendations for the current code.
          </div>
        )}
      </div>
    </aside>
  );
};
