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
          <div className="section-header-actions">
            <button
              className={`btn ${isSaved ? 'btn-secondary' : 'btn-primary'} nav-btn-sm`}
              type="button"
              onClick={onSaveExplanation}
              disabled={isSaved}
              title={isSaved ? 'Analysis Saved to History' : 'Save Explanation to Account History'}
              aria-label={isSaved ? 'Analysis Saved' : 'Save Explanation'}
            >
              {isSaved ? (
                <>
                  <IconCheck size={14} /> Saved
                </>
              ) : (
                <>
                  <IconSave size={14} /> Save Explanation
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <div className="ai-output">
        {error ? (
          <div className="auth-error-banner">
            <strong>Analysis Failure:</strong> {errorMessage || error}
          </div>
        ) : !explanations ? (
          <div className="ai-empty-text">
            Analyze your code to generate an explanation and recommendations.
          </div>
        ) : (
          <div className="explanation-grid">
            <div className="explanation-card">
              <span className="insight-tag">Summary</span>
              <p className="metric-copy">{explanations.summary}</p>
            </div>

            <div className="explanation-card">
              <span className="insight-tag">Complexity Analysis</span>
              <p className="metric-copy">{explanations.time}</p>
              <p className="metric-copy" style={{ marginTop: '8px' }}>
                {explanations.space}
              </p>
            </div>

            <div className="explanation-card">
              <span className="insight-tag">Optimization & Recommendations</span>
              <p className="metric-copy">{explanations.optimization}</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
