import React from 'react';
import { ComplexityMetrics } from '../types/analyzer';

interface MetricsGridProps {
  metrics: ComplexityMetrics | null;
  error?: string | null;
  errorMessage?: string | null;
}

export const MetricsGrid: React.FC<MetricsGridProps> = ({ metrics, error, errorMessage }) => {
  const getStatusBadge = (metricKey: string, defaultStatus: string = 'estimated') => {
    const detail = metrics?.metric_status?.[metricKey];
    const status = detail?.status || defaultStatus;

    if (status === 'unsupported') {
      return <span className="lang-status-badge is-unsupported" style={{ fontSize: '0.65rem' }}>N/A • Unsupported</span>;
    }
    if (status === 'estimated') {
      return <span className="lang-status-badge is-auto" style={{ fontSize: '0.65rem' }}>Estimated</span>;
    }
    if (status === 'available') {
      return <span className="lang-status-badge is-manual" style={{ fontSize: '0.65rem' }}>Measured</span>;
    }
    return null;
  };

  const getDeadCodeCopy = () => {
    const detail = metrics?.metric_status?.['dead_code_count'];
    if (detail?.status === 'unsupported' || metrics?.dead_code_count === null) {
      return detail?.reason || 'Dead-code control flow analysis is unsupported for this language.';
    }
    return 'Unreachable statements and unreferenced definitions.';
  };

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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="metric-label">Time Complexity</span>
                {getStatusBadge('time_complexity', 'estimated')}
              </div>
              <strong className="metric-value">{metrics.time_complexity ?? '—'}</strong>
              <p className="metric-copy">
                {metrics.metric_status?.['time_complexity']?.reason || 'Estimated from loop nesting and recursion analysis.'}
              </p>
            </article>

            <article className="metric-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="metric-label">Space Complexity</span>
                {getStatusBadge('space_complexity', 'estimated')}
              </div>
              <strong className="metric-value">{metrics.space_complexity ?? '—'}</strong>
              <p className="metric-copy">
                {metrics.metric_status?.['space_complexity']?.reason || 'Estimated from memory structures and stack depth.'}
              </p>
            </article>

            <article className="metric-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="metric-label">Dead Code</span>
                {getStatusBadge('dead_code_count', metrics.dead_code_count !== null ? 'available' : 'unsupported')}
              </div>
              <strong className="metric-value">
                {metrics.dead_code_count !== null && metrics.dead_code_count !== undefined
                  ? metrics.dead_code_count
                  : 'N/A'}
              </strong>
              <p className="metric-copy">{getDeadCodeCopy()}</p>
            </article>

            <article className="metric-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="metric-label">Optimization Score</span>
                {getStatusBadge('optimization_score', 'estimated')}
              </div>
              <strong className="metric-value">{metrics.optimization_score !== undefined ? `${metrics.optimization_score}/100` : '—'}</strong>
              <div className="progress-track" aria-label={`Optimization score ${metrics.optimization_score} out of 100`}>
                <div className="progress-fill" style={{ width: `${Math.max(0, Math.min(100, metrics.optimization_score || 0))}%` }}></div>
              </div>
              <p className="metric-copy">
                {metrics.metric_status?.['optimization_score']?.reason || 'Evaluated against control flow efficiency guidelines.'}
              </p>
            </article>
          </div>
        )}
      </div>
    </section>
  );
};
