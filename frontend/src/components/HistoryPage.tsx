import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AnalyzeResponse } from '../types/analyzer';
import { IconSearch, IconTrash, IconCode } from './Icons';

export interface HistoryRecord {
  id: number;
  title: string;
  source_code: string;
  analysis_result: AnalyzeResponse;
  created_at: string;
}

interface HistoryPageProps {
  onNavigate: (route: string) => void;
  onLoadSnippet: (code: string, result: AnalyzeResponse) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  onNavigate,
  onLoadSnippet,
}) => {
  const { user } = useAuth();
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [search, setSearch] = useState('');
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
        setError('Failed to fetch saved history records.');
      }
    } catch (err) {
      setError('Network error fetching history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user]);

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this saved analysis?')) return;
    try {
      const resp = await fetch(`/api/history/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (resp.ok) {
        setHistory((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete history item:', err);
    }
  };

  const filteredHistory = history.filter(
    (item) =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.source_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="history-page-container">
      <div className="history-page-header">
        <div>
          <p className="eyebrow">User Vault</p>
          <h1>Analysis History</h1>
        </div>
        {user && (
          <div className="history-search-wrapper">
            <IconSearch size={16} className="search-icon" />
            <input
              type="text"
              className="history-search-input"
              placeholder="Filter saved analyses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}
      </div>

      {!user ? (
        <div className="home-empty-card">
          <p>Please sign in to access your saved analysis history vault.</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onNavigate('login')}
          >
            Sign In
          </button>
        </div>
      ) : loading ? (
        <div className="home-empty-card">Loading history vault...</div>
      ) : error ? (
        <div className="home-empty-card warning-note">{error}</div>
      ) : filteredHistory.length === 0 ? (
        <div className="home-empty-card">
          <p>
            {search
              ? 'No analysis records match your search filter.'
              : 'No saved analyses yet. Run an analysis and save it to see your history here.'}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onNavigate('analyzer')}
          >
            Start Analyzing
          </button>
        </div>
      ) : (
        <div className="history-table-wrapper">
          <table className="history-table">
            <thead>
              <tr>
                <th>Name / Title</th>
                <th>Time Complexity</th>
                <th>Space Complexity</th>
                <th>Optimization</th>
                <th>Created Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((item) => {
                const metrics = item.analysis_result?.metrics;
                const timeComp = metrics?.time_complexity || 'O(1)';
                const spaceComp = metrics?.space_complexity || 'O(1)';
                const optScore = metrics?.optimization_score !== undefined ? `${metrics.optimization_score}/100` : '—';
                const dateStr = new Date(item.created_at).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                });

                return (
                  <tr key={item.id} className="history-table-row">
                    <td>
                      <div className="history-table-name">
                        <strong>{item.title}</strong>
                        <span className="history-table-code-sub">
                          {item.source_code.slice(0, 45)}...
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="history-badge">{timeComp}</span>
                    </td>
                    <td>
                      <span className="history-badge muted">{spaceComp}</span>
                    </td>
                    <td>
                      <span className="history-score-tag">{optScore}</span>
                    </td>
                    <td className="history-date-cell">{dateStr}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="history-table-actions">
                        <button
                          type="button"
                          className="btn btn-secondary table-btn"
                          onClick={() => {
                            onLoadSnippet(item.source_code, item.analysis_result);
                            onNavigate('analyzer');
                          }}
                          title="Open analysis in workspace"
                        >
                          <IconCode size={14} />
                          <span>Open</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary table-btn danger"
                          onClick={(e) => handleDelete(item.id, e)}
                          title="Delete saved analysis"
                        >
                          <IconTrash size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
