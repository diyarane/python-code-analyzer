import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AnalyzeResponse } from '../types/analyzer';
import { HistoryRecord } from './HomePage';

interface HistoryPageProps {
  onNavigate: (route: 'home' | 'analyzer' | 'history') => void;
  onLoadSnippet: (code: string, result: AnalyzeResponse) => void;
  onOpenAuth: (mode: 'login' | 'signup') => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  onNavigate,
  onLoadSnippet,
  onOpenAuth,
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
          <input
            type="text"
            className="history-search-input"
            placeholder="Search saved snippets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        )}
      </div>

      {!user ? (
        <div className="home-empty-card">
          <p>Please sign in to access your saved analysis history vault.</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onOpenAuth('login')}
          >
            Sign In to Your Account
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
              ? 'No analysis records match your search query.'
              : 'No saved analyses found in your vault.'}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onNavigate('analyzer')}
          >
            Go to Analyzer →
          </button>
        </div>
      ) : (
        <div className="history-full-grid">
          {filteredHistory.map((item) => {
            const timeComp = item.analysis_result?.metrics?.time_complexity || 'O(1)';
            const spaceComp = item.analysis_result?.metrics?.space_complexity || 'O(1)';
            const dateStr = new Date(item.created_at).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div key={item.id} className="history-full-card">
                <div className="history-card-header">
                  <h3 className="history-title">{item.title}</h3>
                  <div className="history-badges">
                    <span className="history-badge">Time {timeComp}</span>
                    <span className="history-badge">Space {spaceComp}</span>
                  </div>
                </div>

                <pre className="history-code-block">{item.source_code}</pre>

                <div className="history-card-footer">
                  <span className="history-date">{dateStr}</span>
                  <div className="history-card-actions">
                    <button
                      type="button"
                      className="btn btn-secondary nav-btn-sm"
                      onClick={() => {
                        onLoadSnippet(item.source_code, item.analysis_result);
                        onNavigate('analyzer');
                      }}
                    >
                      Open in Analyzer →
                    </button>
                    <button
                      type="button"
                      className="history-delete-btn"
                      onClick={(e) => handleDelete(item.id, e)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
