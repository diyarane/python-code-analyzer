import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  IconAst,
  IconZap,
  IconSearch,
  IconBot,
  IconArrowRight,
  IconArrowDown,
} from './Icons';
import { AnalyzeResponse } from '../types/analyzer';

interface HomePageProps {
  onNavigate: (route: string) => void;
  onLoadSnippet: (code: string, res: AnalyzeResponse) => void;
}

interface SavedItem {
  id: number;
  title: string;
  source_code: string;
  analysis_result: AnalyzeResponse;
  created_at: string;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, onLoadSnippet }) => {
  const { user } = useAuth();
  const [recentAnalyses, setRecentAnalyses] = useState<SavedItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  useEffect(() => {
    if (!user) return;
    setLoadingHistory(true);
    fetch('/api/history', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.items)) {
          setRecentAnalyses(data.items.slice(0, 3));
        }
      })
      .catch((err) => console.error('Failed fetching recent items:', err))
      .finally(() => setLoadingHistory(false));
  }, [user]);

  const scrollToCapabilities = () => {
    const el = document.getElementById('capabilities');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="home-container">
      {/* Full-Viewport Opening Scene Hero (Not inside a card border!) */}
      <section className="home-hero-full">
        <div className="hero-content">
          <p className="hero-eyebrow">CODE ANALYSIS PLATFORM</p>
          <h1 className="hero-headline">
            Understand your <br />
            <span className="gradient-text">Python code.</span>
          </h1>
          <p className="hero-subhead">
            Analyze structure, complexity, dead code, and optimization opportunities from a single workspace.
          </p>

          <div className="hero-actions">
            <button
              className="btn btn-primary hero-cta"
              onClick={() => onNavigate('analyzer')}
            >
              Start Analyzing <IconArrowRight size={18} />
            </button>
            {user && (
              <button
                className="btn btn-secondary hero-cta"
                onClick={() => onNavigate('history')}
              >
                View History
              </button>
            )}
          </div>
        </div>

        {/* Scroll-to-discover Indicator */}
        <div
          className="scroll-indicator"
          onClick={scrollToCapabilities}
          role="button"
          tabIndex={0}
        >
          <span>Scroll to discover</span>
          <IconArrowDown size={16} className="scroll-arrow" />
        </div>
      </section>

      {/* Capabilities Section */}
      <section id="capabilities" className="home-section">
        <div className="home-section-header">
          <p className="home-section-eyebrow">CAPABILITIES</p>
          <h2 className="home-section-heading">Platform Features</h2>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <IconAst size={24} />
            </div>
            <h3>AST Visualization</h3>
            <p>
              Transform raw Python source code into an interactive, visual Abstract Syntax Tree powered by React Flow.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <IconZap size={24} />
            </div>
            <h3>Complexity Analysis</h3>
            <p>
              Calculate exact Big-O Time & Space complexity metrics using AST loop depth and control-flow evaluation.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <IconSearch size={24} />
            </div>
            <h3>Dead Code Detection</h3>
            <p>
              Identify unreachable statements, unused variable assignments, and redundant logic branches.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <IconBot size={24} />
            </div>
            <h3>AI Recommendations</h3>
            <p>
              Receive structured technical explanations, performance optimizations, and refactoring guidance.
            </p>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="home-section">
        <div className="home-section-header">
          <p className="home-section-eyebrow">WORKFLOW</p>
          <h2 className="home-section-heading">How It Works</h2>
        </div>

        <div className="how-it-works-grid">
          <div className="step-card">
            <span className="step-num">STEP 01</span>
            <h3>Write or Upload</h3>
            <p>Paste Python code directly into the Monaco Editor or upload any <code>.py</code> file.</p>
          </div>

          <div className="step-card">
            <span className="step-num">STEP 02</span>
            <h3>Analyze</h3>
            <p>Run AST analysis with progress stages and Redis-cached response times.</p>
          </div>

          <div className="step-card">
            <span className="step-num">STEP 03</span>
            <h3>Explore AST</h3>
            <p>Pan, zoom, and inspect AST nodes with real-time editor line highlighting.</p>
          </div>

          <div className="step-card">
            <span className="step-num">STEP 04</span>
            <h3>Review & Save</h3>
            <p>Review AI complexity explanations and save snippets to your persistent account history.</p>
          </div>
        </div>
      </section>

      {/* Recent Saved Analyses Section (for authenticated users) */}
      {user && (
        <section className="home-section">
          <div className="home-section-header">
            <p className="home-section-eyebrow">SAVED WORKSPACE</p>
            <h2 className="home-section-heading">Recent Analyses</h2>
          </div>

          {loadingHistory ? (
            <div className="home-empty-card">Loading recent analyses...</div>
          ) : recentAnalyses.length > 0 ? (
            <div className="recent-grid">
              {recentAnalyses.map((item) => (
                <div
                  key={item.id}
                  className="recent-card"
                  onClick={() => {
                    onLoadSnippet(item.source_code, item.analysis_result);
                    onNavigate('analyzer');
                  }}
                >
                  <div className="recent-title">{item.title}</div>
                  <pre className="recent-code-preview">{item.source_code}</pre>
                  <div className="recent-card-footer">
                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    <span className="recent-action">Open in Analyzer →</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="home-empty-card">
              <p>You haven't saved any code analyses yet.</p>
              <button
                className="btn btn-primary"
                onClick={() => onNavigate('analyzer')}
              >
                Analyze Python Code
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
};
