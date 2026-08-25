import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AnalyzeResponse } from '../types/analyzer';

export interface HistoryRecord {
  id: number;
  title: string;
  source_code: string;
  analysis_result: AnalyzeResponse;
  created_at: string;
}

interface HomePageProps {
  onNavigate: (route: 'home' | 'analyzer' | 'history') => void;
  onOpenAuth: (mode: 'login' | 'signup') => void;
  onLoadSnippet: (code: string, result: AnalyzeResponse) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  onOpenAuth,
  onLoadSnippet,
}) => {
  const { user } = useAuth();
  const [recentHistory, setRecentHistory] = useState<HistoryRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  useEffect(() => {
    if (user) {
      setLoadingHistory(true);
      fetch('/api/history', { credentials: 'include' })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.history) {
            setRecentHistory(data.history.slice(0, 3));
          }
        })
        .catch(() => {})
        .finally(() => setLoadingHistory(false));
    } else {
      setRecentHistory([]);
    }
  }, [user]);

  return (
    <div className="home-container">
      {/* Hero Welcome Section */}
      <section className="hero-section">
        <div className="hero-badge">Static Intelligence Platform</div>
        <h1 className="hero-title">
          {user ? `Welcome to CodeAnalyzer AI` : 'Analyze & Optimize Python Code'}
        </h1>
        <p className="hero-subhead">
          Parse Python AST graphs, compute time and space complexity, detect dead code signals, and receive instant AI recommendations.
        </p>
        <div className="hero-actions">
          <button
            type="button"
            className="btn btn-primary hero-cta"
            onClick={() => onNavigate('analyzer')}
          >
            Start Analyzing →
          </button>
          {!user && (
            <button
              type="button"
              className="btn btn-secondary hero-secondary-cta"
              onClick={() => onOpenAuth('signup')}
            >
              Create Free Account
            </button>
          )}
        </div>
      </section>

      {/* Feature Overview Cards */}
      <section className="home-section">
        <div className="section-header">
          <p className="eyebrow">Capabilities</p>
          <h2>Platform Features</h2>
        </div>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🌳</div>
            <h3>Interactive AST Visualizer</h3>
            <p>
              Render top-down hierarchical compiler syntax graphs powered by React Flow with zoom, pan, and line-sync highlighting.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Complexity Analysis</h3>
            <p>
              Automated time and space complexity estimation (O(1), O(n), O(n²)) based on loop depth and recursion heuristics.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🔍</div>
            <h3>Dead Code Detection</h3>
            <p>
              Identify unused function definitions, unreferenced variables, unimported aliases, and unreachable statements.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🤖</div>
            <h3>AI Recommendations</h3>
            <p>
              Receive optimization scores and actionable refactoring suggestions to improve execution speed and memory efficiency.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Flow */}
      <section className="home-section">
        <div className="section-header">
          <p className="eyebrow">Workflow</p>
          <h2>How It Works</h2>
        </div>
        <div className="how-it-works-grid">
          <div className="step-card">
            <span className="step-num">01</span>
            <h4>Write or Upload</h4>
            <p>Paste Python source code or upload a .py file into Monaco Editor.</p>
          </div>

          <div className="step-card">
            <span className="step-num">02</span>
            <h4>Run AST Engine</h4>
            <p>Static AST parser analyzes syntax tree, complexity, and dead code.</p>
          </div>

          <div className="step-card">
            <span className="step-num">03</span>
            <h4>Inspect Compiler Graph</h4>
            <p>Explore interactive React Flow node hierarchy and source line maps.</p>
          </div>

          <div className="step-card">
            <span className="step-num">04</span>
            <h4>Optimize Code</h4>
            <p>Review optimization scores, dead code warnings, and recommendations.</p>
          </div>
        </div>
      </section>

      {/* Recent History Preview Section */}
      <section className="home-section">
        <div className="section-header">
          <div className="header-flex">
            <div>
              <p className="eyebrow">Your Vault</p>
              <h2>Recent Analyses</h2>
            </div>
            {user && recentHistory.length > 0 && (
              <button
                type="button"
                className="btn btn-secondary nav-btn-sm"
                onClick={() => onNavigate('history')}
              >
                View All History →
              </button>
            )}
          </div>
        </div>

        {!user ? (
          <div className="home-empty-card">
            <p>Sign in to save and preview your recent Python analysis history.</p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => onOpenAuth('login')}
            >
              Sign In to Your Account
            </button>
          </div>
        ) : loadingHistory ? (
          <div className="home-empty-card">Loading recent analyses...</div>
        ) : recentHistory.length === 0 ? (
          <div className="home-empty-card">
            <p>No saved analyses yet. Run an analysis and click <strong>Save Analysis</strong> to populate your history.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onNavigate('analyzer')}
            >
              Start Your First Analysis
            </button>
          </div>
        ) : (
          <div className="recent-grid">
            {recentHistory.map((item) => {
              const timeComp = item.analysis_result?.metrics?.time_complexity || 'O(1)';
              const dateStr = new Date(item.created_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={item.id}
                  className="recent-card"
                  onClick={() => {
                    onLoadSnippet(item.source_code, item.analysis_result);
                    onNavigate('analyzer');
                  }}
                >
                  <div className="recent-card-top">
                    <span className="recent-title">{item.title}</span>
                    <span className="history-badge">{timeComp}</span>
                  </div>
                  <pre className="recent-code-preview">
                    {item.source_code.slice(0, 100)}...
                  </pre>
                  <div className="recent-card-footer">
                    <span>{dateStr}</span>
                    <span className="recent-action">Reopen →</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
