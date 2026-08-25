import React, { useState } from 'react';
import { ProgressStage } from '../hooks/useAnalysisSocket';
import { IconInfo } from './Icons';

interface ProgressIndicatorProps {
  stages: ProgressStage[];
  isAnalyzing: boolean;
  isSocketConnected: boolean;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  stages,
  isAnalyzing,
  isSocketConnected,
}) => {
  const [showWsInfo, setShowWsInfo] = useState(false);

  if (!isAnalyzing && stages.every((s) => s.status === 'pending')) {
    return null;
  }

  return (
    <div className="progress-card">
      <div className="progress-header">
        <div className="progress-header-left">
          <span className="eyebrow">Real-Time Progress</span>
          <span className="header-dot-separator">•</span>
          <div className="ws-badge-wrapper">
            <span className="socket-badge">
              {isSocketConnected ? 'Live WebSocket' : 'HTTP Fallback'}
            </span>

            <button
              type="button"
              className="icon-btn info-trigger-btn ws-info-btn"
              aria-label="About live WebSocket progress"
              title="About live WebSocket progress"
              onClick={() => setShowWsInfo((prev) => !prev)}
              onMouseEnter={() => setShowWsInfo(true)}
              onMouseLeave={() => setShowWsInfo(false)}
            >
              <IconInfo size={15} />
            </button>

            {showWsInfo && (
              <div className="info-popover-card ws-popover-card">
                <div className="popover-section">
                  <h4>Live WebSocket</h4>
                  <p>
                    WebSocket keeps a live connection between the analyzer and your browser so progress can be updated in real time while your code is being analyzed.
                  </p>
                </div>
                <div className="popover-section">
                  <h4>Why is it used?</h4>
                  <p>
                    It lets you see analysis progress as it happens instead of waiting for the entire analysis to finish.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ul className="progress-list">
        {stages.map((stage) => {
          let icon = '○';
          let itemClass = 'status-pending';

          if (stage.status === 'completed') {
            icon = '✓';
            itemClass = 'status-completed';
          } else if (stage.status === 'running') {
            icon = '→';
            itemClass = 'status-running';
          } else if (stage.status === 'failed') {
            icon = '✕';
            itemClass = 'status-failed';
          }

          return (
            <li key={stage.id} className={`progress-item ${itemClass}`}>
              <span className="progress-icon">{icon}</span>
              <span className="progress-label">{stage.label}</span>
              {stage.detail && <span className="progress-detail">{stage.detail}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
