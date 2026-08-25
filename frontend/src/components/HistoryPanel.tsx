import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AnalyzeResponse } from '../types/analyzer';

export interface HistoryItem {
  id: number;
  user_id: number;
  title: string;
  source_code: string;
  analysis_result: AnalyzeResponse;
  created_at: string;
}

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRecord: (code: string, res: AnalyzeResponse) => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  isOpen,
  onClose,
  onSelectRecord,
}) => {
  const { user } = useAuth();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/history', { credentials: 'include' });
      if (resp.ok) {
        const data = await resp.json();
        setHistory(data.history || []);
      } else {
        setError('Failed to load analysis history.');
      }
    } catch (err) {
      setError('Network error loading history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && user) {
      fetchHistory();
    }
  }, [isOpen, user]);

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const resp = await fetch(`/api/history/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (resp.ok) {
        setHistory((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err) {
      console.error('Delete history error:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="history-backdrop" onClick={onClose}>
      <div className="history-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="history-header">
          <div>
            <p className="eyebrow">User Vault</p>
            <h2>Analysis History</h2>
          </div>
          <button type="button" className="auth-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="history-body">
          {!user ? (
            <div className="history-empty">Please sign in to view saved analyses.</div>
          ) : loading ? (
            <div className="history-empty">Loading your saved analyses...</div>
          ) : error ? (
            <div className="history-empty warning-note">{error}</div>
          ) : history.length === 0 ? (
            <div className="history-empty">
              No saved analyses found. Click <strong>Save Analysis</strong> on the dashboard to store results.
            </div>
          ) : (
            <ul className="history-list">
              {history.map((item) => {
                const timeComp = item.analysis_result?.metrics?.time_complexity || 'O(1)';
                const dateStr = new Date(item.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <li
                    key={item.id}
                    className="history-card"
                    onClick={() => {
                      onSelectRecord(item.source_code, item.analysis_result);
                      onClose();
                    }}
                  >
                    <div className="history-card-header">
                      <span className="history-title">{item.title}</span>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {item.analysis_result?.language && (
                          <span className="lang-status-badge is-manual" style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>
                            {item.analysis_result.language}
                          </span>
                        )}
                        <span className="history-badge">{timeComp}</span>
                      </div>
                    </div>
                    <div className="history-card-sub">
                      <span>{dateStr}</span>
                      <button
                        type="button"
                        className="history-delete-btn"
                        onClick={(e) => handleDelete(item.id, e)}
                        title="Delete Record"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
