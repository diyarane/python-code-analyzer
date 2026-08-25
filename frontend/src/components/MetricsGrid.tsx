import React, { useState } from 'react';
import { ComplexityMetrics } from '../types/analyzer';
import { IconInfo } from './Icons';

interface MetricsGridProps {
  metrics: ComplexityMetrics | null;
  error?: string | null;
  errorMessage?: string | null;
}

export const MetricsGrid: React.FC<MetricsGridProps> = ({ metrics, error, errorMessage }) => {
  const [activeInfo, setActiveInfo] = useState<string | null>(null);

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

  const toggleInfo = (key: string) => {
    setActiveInfo((prev) => (prev === key ? null : key));
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
            {/* Time Complexity Card */}
            <article className="metric-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="metric-label">Time Complexity</span>
                  <div className="info-popover-wrapper">
                    <button
                      type="button"
                      className="unboxed-info-btn"
                      aria-label="Time Complexity info"
                      title="Time Complexity info"
                      onClick={() => toggleInfo('time')}
                      onMouseEnter={() => setActiveInfo('time')}
                      onMouseLeave={() => setActiveInfo(null)}
                    >
                      <IconInfo size={14} />
                    </button>
                    {activeInfo === 'time' && (
                      <div className="info-popover-card" style={{ width: '240px' }}>
                        <div className="popover-section">
                          <h4>Time Complexity</h4>
                          <p>
                            Estimated from loop nesting and control-flow structure. This is a static heuristic estimate and does not represent runtime profiling.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {getStatusBadge('time_complexity', 'estimated')}
              </div>
              <strong className="metric-value">{metrics.time_complexity ?? '—'}</strong>
              <p className="metric-copy">
                {metrics.metric_status?.['time_complexity']?.reason || 'Estimated from loop nesting and recursion analysis.'}
              </p>
            </article>

            {/* Space Complexity Card */}
            <article className="metric-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="metric-label">Space Complexity</span>
                  <div className="info-popover-wrapper">
                    <button
                      type="button"
                      className="unboxed-info-btn"
                      aria-label="Space Complexity info"
                      title="Space Complexity info"
                      onClick={() => toggleInfo('space')}
                      onMouseEnter={() => setActiveInfo('space')}
                      onMouseLeave={() => setActiveInfo(null)}
                    >
                      <IconInfo size={14} />
                    </button>
                    {activeInfo === 'space' && (
                      <div className="info-popover-card" style={{ width: '240px' }}>
                        <div className="popover-section">
                          <h4>Space Complexity</h4>
                          <p>
                            Estimated from memory-allocation patterns, data structures, and recursion/stack behavior.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {getStatusBadge('space_complexity', 'estimated')}
              </div>
              <strong className="metric-value">{metrics.space_complexity ?? '—'}</strong>
              <p className="metric-copy">
                {metrics.metric_status?.['space_complexity']?.reason || 'Estimated from memory structures and stack depth.'}
              </p>
            </article>

            {/* Dead Code Card */}
            <article className="metric-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="metric-label">Dead Code</span>
                  <div className="info-popover-wrapper">
                    <button
                      type="button"
                      className="unboxed-info-btn"
                      aria-label="Dead Code info"
                      title="Dead Code info"
                      onClick={() => toggleInfo('dead_code')}
                      onMouseEnter={() => setActiveInfo('dead_code')}
                      onMouseLeave={() => setActiveInfo(null)}
                    >
                      <IconInfo size={14} />
                    </button>
                    {activeInfo === 'dead_code' && (
                      <div className="info-popover-card" style={{ width: '250px' }}>
                        <div className="popover-section">
                          <h4>Dead Code Analysis</h4>
                          <p>
                            {metrics.dead_code_count !== null
                              ? 'Identifies unreachable statements and unreferenced function definitions in the source AST.'
                              : 'Dead-code control flow analysis is currently unavailable for this language adapter.'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {getStatusBadge('dead_code_count', metrics.dead_code_count !== null ? 'available' : 'unsupported')}
              </div>
              <strong className="metric-value">
                {metrics.dead_code_count !== null && metrics.dead_code_count !== undefined
                  ? metrics.dead_code_count
                  : 'N/A'}
              </strong>
              <p className="metric-copy">{getDeadCodeCopy()}</p>
            </article>

            {/* Optimization Score Card */}
            <article className="metric-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="metric-label">Optimization Score</span>
                  <div className="info-popover-wrapper">
                    <button
                      type="button"
                      className="unboxed-info-btn"
                      aria-label="Optimization Score info"
                      title="Optimization Score info"
                      onClick={() => toggleInfo('optimization')}
                      onMouseEnter={() => setActiveInfo('optimization')}
                      onMouseLeave={() => setActiveInfo(null)}
                    >
                      <IconInfo size={14} />
                    </button>
                    {activeInfo === 'optimization' && (
                      <div className="info-popover-card" style={{ width: '240px' }}>
                        <div className="popover-section">
                          <h4>Optimization Score</h4>
                          <p>
                            An estimated score based on the analyzer's current control-flow and nesting efficiency heuristics.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
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
