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
    <section className="workspace-section panel ai-panel-section">
      <div className="section-header">
        <div>
          <p className="eyebrow">Technical Assistant</p>
          <h2>AI Explanation</h2>
          <p className="section-subtitle">Understand what the analyzer found and why.</p>
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
            <span className="insight-tag">Parser Error</span>
            <p>
              <strong>{error}</strong>: {errorMessage || 'Check Python syntax and try again.'}
            </p>
          </article>
        ) : explanations ? (
          <div className="explanation-grid">
            <article className="explanation-card">
              <span className="insight-tag">Summary</span>
              <p>{explanations.summary}</p>
            </article>

            <article className="explanation-card">
              <span className="insight-tag">Complexity Analysis</span>
              <p>
                <strong>Time Complexity:</strong> {explanations.time}
              </p>
              <p style={{ marginTop: '6px' }}>
                <strong>Space Complexity:</strong> {explanations.space}
              </p>
            </article>

            <article className="explanation-card">
              <span className="insight-tag">Optimization & Recommendations</span>
              <p>{explanations.optimization}</p>
            </article>
          </div>
        ) : (
          <div className="ai-empty-text">
            Run analysis to generate explanations and refactoring recommendations for your code.
          </div>
        )}
      </div>
    </section>
  );
};
