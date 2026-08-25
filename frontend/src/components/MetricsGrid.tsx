import React from 'react';
import { ComplexityMetrics } from '../types/analyzer';

interface MetricsGridProps {
  metrics: ComplexityMetrics | null;
  error?: string | null;
  errorMessage?: string | null;
}

export const MetricsGrid: React.FC<MetricsGridProps> = ({ metrics, error, errorMessage }) => {
  return (
    <section className="workspace-section panel results-section">
      <div className="section-header">
        <div>
          <p className="eyebrow">Static Intelligence</p>
          <h2>Analysis Results</h2>
          <p className="section-subtitle">Metrics calculated from AST structure, loop depth, and control flow.</p>
        </div>
      </div>

      <div className="metrics-container">
        {error ? (
          <article className="metric-card placeholder-card">
            <span className="metric-label">{error}</span>
            <strong className="metric-value">Failed</strong>
            <p className="metric-copy">{errorMessage || 'Unable to analyze this code.'}</p>
          </article>
        ) : !metrics ? (
          <article className="metric-card placeholder-card">
            <span className="metric-label">Awaiting analysis</span>
            <strong className="metric-value">Ready</strong>
            <p className="metric-copy">Click Analyze in the toolbar above to generate complexity metrics.</p>
          </article>
        ) : (
          <div className="metrics-grid">
            <article className="metric-card">
              <span className="metric-label">Time Complexity</span>
              <strong className="metric-value">{metrics.time_complexity ?? '—'}</strong>
              <p className="metric-copy">Estimated from loop nesting and recursion analysis.</p>
            </article>

            <article className="metric-card">
              <span className="metric-label">Space Complexity</span>
              <strong className="metric-value">{metrics.space_complexity ?? '—'}</strong>
              <p className="metric-copy">Estimated from memory structures and stack depth.</p>
            </article>

            <article className="metric-card">
              <span className="metric-label">Dead Code</span>
              <strong className="metric-value">
                {metrics.dead_code_count !== null && metrics.dead_code_count !== undefined
                  ? metrics.dead_code_count
                  : 'N/A'}
              </strong>
              <p className="metric-copy">Unreachable statements and unreferenced definitions.</p>
            </article>

            <article className="metric-card">
              <span className="metric-label">Optimization Score</span>
              <strong className="metric-value">{metrics.optimization_score !== undefined ? `${metrics.optimization_score}/100` : '—'}</strong>
              <div className="progress-track" aria-label={`Optimization score ${metrics.optimization_score} out of 100`}>
                <div className="progress-fill" style={{ width: `${Math.max(0, Math.min(100, metrics.optimization_score || 0))}%` }}></div>
              </div>
              <p className="metric-copy">Evaluated against control flow efficiency guidelines.</p>
            </article>
          </div>
        )}
      </div>
    </section>
  );
};
