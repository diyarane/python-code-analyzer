import React from 'react';
import { ProgressStage } from '../hooks/useAnalysisSocket';

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
  if (!isAnalyzing && stages.every((s) => s.status === 'pending')) {
    return null;
  }

  return (
    <div className="progress-card">
      <div className="progress-header">
        <span className="eyebrow">Real-Time Progress</span>
        <span className="socket-badge">
          {isSocketConnected ? 'Live WebSocket' : 'HTTP Fallback'}
        </span>
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
