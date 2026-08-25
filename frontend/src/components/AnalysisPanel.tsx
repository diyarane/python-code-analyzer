import React from 'react';
import { Explanations } from '../types/analyzer';

interface AnalysisPanelProps {
  explanations: Explanations | null;
  error?: string | null;
  errorMessage?: string | null;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  explanations,
  error,
  errorMessage,
}) => {
  return (
    <aside className="panel ai-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Assistant</p>
          <h2>AI Explanation</h2>
        </div>
        <span className="pulse-dot" aria-hidden="true"></span>
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
