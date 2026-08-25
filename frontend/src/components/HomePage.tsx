import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AnalyzeResponse } from '../types/analyzer';
import { IconAst, IconZap, IconSearch, IconBot } from './Icons';

export interface HistoryRecord {
  id: number;
  title: string;
  source_code: string;
  analysis_result: AnalyzeResponse;
  created_at: string;
}

interface HomePageProps {
  onNavigate: (route: string) => void;
  onLoadSnippet: (code: string, result: AnalyzeResponse) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
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
      {/* Premium Hero Section */}
      <section className="hero-section">
        <div className="hero-badge">CODE ANALYSIS PLATFORM</div>
        <h1 className="hero-title">Understand your Python code.</h1>
        <p className="hero-subhead">
          Analyze structure, complexity, dead code, and optimization opportunities from a single workspace.
        </p>
        <div className="hero-actions">
          <button
            type="button"
            className="btn btn-primary hero-cta"
            onClick={() => onNavigate('analyzer')}
          >
            Start Analyzing
          </button>
          <button
            type="button"
            className="btn btn-secondary hero-secondary-cta"
            onClick={() => onNavigate(user ? 'history' : 'signup')}
          >
            {user ? 'View History' : 'Create Account'}
          </button>
        </div>
      </section>

      {/* Feature Overview Cards with Clean SVG Icons */}
      <section className="home-section">
        <div className="section-header">
          <p className="eyebrow">Capabilities</p>
          <h2>Platform Features</h2>
        </div>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <IconAst size={22} />
            </div>
            <h3>AST Visualization</h3>
            <p>
              Explore the structure of your Python code through an interactive syntax tree powered by React Flow.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <IconZap size={22} />
            </div>
            <h3>Complexity Analysis</h3>
            <p>
              Understand time and space complexity calculated directly from control flow and loop structures.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <IconSearch size={22} />
            </div>
            <h3>Dead Code Detection</h3>
            <p>
              Identify unreachable branches, unreferenced variables, unimported aliases, and unused definitions.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <IconBot size={22} />
            </div>
            <h3>AI Recommendations</h3>
            <p>
              Get concise explanations, optimization scores, and actionable refactoring suggestions.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Workflow */}
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
            <h4>Analyze</h4>
            <p>Static AST parser analyzes syntax tree, control flow, and complexity.</p>
          </div>

          <div className="step-card">
            <span className="step-num">03</span>
            <h4>Explore AST</h4>
            <p>Explore interactive React Flow syntax graph and line maps.</p>
          </div>

          <div className="step-card">
            <span className="step-num">04</span>
            <h4>Review & Save</h4>
            <p>Inspect complexity scores, dead code warnings, and save results to your history.</p>
          </div>
        </div>
      </section>

      {/* Recent History Preview Section */}
      <section className="home-section">
        <div className="section-header">
          <div className="header-flex">
            <div>
              <p className="eyebrow">User Vault</p>
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
            <p>Sign in to save and view your Python analysis history.</p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => onNavigate('login')}
            >
              Sign In to Your Account
            </button>
          </div>
        ) : loadingHistory ? (
          <div className="home-empty-card">Loading recent analyses...</div>
        ) : recentHistory.length === 0 ? (
          <div className="home-empty-card">
            <p>No saved analyses yet. Run an analysis and save it to see your history here.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onNavigate('analyzer')}
            >
              Start Analyzing
            </button>
          </div>
        ) : (
          <div className="recent-grid">
            {recentHistory.map((item) => {
              const timeComp = item.analysis_result?.metrics?.time_complexity || 'O(1)';
              const dateStr = new Date(item.created_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
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
                    <span className="recent-action">Open →</span>
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
