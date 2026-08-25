import React from 'react';
import { ComplexityMetrics } from '../types/analyzer';

interface MetricsGridProps {
  metrics: ComplexityMetrics | null;
  error?: string | null;
  errorMessage?: string | null;
}

export const MetricsGrid: React.FC<MetricsGridProps> = ({ metrics, error, errorMessage }) => {
  if (error) {
    return (
      <div className="metrics-grid">
        <article className="metric-card placeholder-card">
          <span className="metric-label">{error}</span>
          <strong className="metric-value">Failed</strong>
          <p className="metric-copy">{errorMessage || 'Unable to analyze this code.'}</p>
        </article>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="metrics-grid">
        <article className="metric-card placeholder-card">
          <span className="metric-label">Awaiting analysis</span>
          <strong className="metric-value">Run Analyze</strong>
          <p className="metric-copy">Metrics will appear here after code analysis.</p>
        </article>
      </div>
    );
  }

  const score = Number(metrics.optimization_score);
  const safeScore = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0;

  return (
    <div className="metrics-grid">
      <article className="metric-card">
        <span className="metric-label">Time Complexity</span>
        <strong className="metric-value">{metrics.time_complexity ?? '—'}</strong>
        <p className="metric-copy">Estimated from loop nesting and recursion analysis.</p>
      </article>

      <article className="metric-card">
        <span className="metric-label">Space Complexity</span>
        <strong className="metric-value">{metrics.space_complexity ?? '—'}</strong>
        <p className="metric-copy">Estimated from data structures and recursion depth.</p>
      </article>

      <article className="metric-card">
        <span className="metric-label">Dead Code</span>
        <strong className="metric-value">{metrics.dead_code_count ?? 0}</strong>
        <p className="metric-copy">Unused function definitions and unreachable statements.</p>
      </article>

      <article className="metric-card">
        <span className="metric-label">Optimization Score</span>
        <strong className="metric-value">{safeScore}/100</strong>
        <div className="progress-track" aria-label={`Optimization score ${safeScore} out of 100`}>
          <div className="progress-fill" style={{ width: `${safeScore}%` }}></div>
        </div>
        <p className="metric-copy">Penalizes nested loops, inefficient recursion, and deep conditions.</p>
      </article>
    </div>
  );
};
