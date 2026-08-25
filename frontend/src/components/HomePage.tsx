import React, { useState, useEffect, useRef } from 'react';
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

const HeroDotBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;
    let width = (canvas.width = canvas.parentElement?.offsetWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.offsetHeight || 600);

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const spacing = 36;
    const dots: { x: number; y: number; originX: number; originY: number; targetX: number; targetY: number }[] = [];

    for (let x = spacing / 2; x < width; x += spacing) {
      for (let y = spacing / 2; y < height; y += spacing) {
        dots.push({
          x,
          y,
          originX: x,
          originY: y,
          targetX: x,
          targetY: y,
        });
      }
    }

    let mouseX = -1000;
    let mouseY = -1000;

    const handleMouseMove = (e: MouseEvent) => {
      if (prefersReducedMotion) return;
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouseX = -1000;
      mouseY = -1000;
    };

    const parent = canvas.parentElement;
    if (parent) {
      parent.addEventListener('mousemove', handleMouseMove);
      parent.addEventListener('mouseleave', handleMouseLeave);
    }

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.offsetWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement?.offsetHeight || 600;
    };

    window.addEventListener('resize', handleResize);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const maxDist = 140;

      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];

        if (!prefersReducedMotion) {
          const dx = mouseX - dot.originX;
          const dy = mouseY - dot.originY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDist) {
            const force = (1 - dist / maxDist) * 14;
            const angle = Math.atan2(dy, dx);
            dot.targetX = dot.originX - Math.cos(angle) * force;
            dot.targetY = dot.originY - Math.sin(angle) * force;
          } else {
            dot.targetX = dot.originX;
            dot.targetY = dot.originY;
          }

          dot.x += (dot.targetX - dot.x) * 0.1;
          dot.y += (dot.targetY - dot.y) * 0.1;
        }

        ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!prefersReducedMotion) {
        animFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animFrameId) cancelAnimationFrame(animFrameId);
      if (parent) {
        parent.removeEventListener('mousemove', handleMouseMove);
        parent.removeEventListener('mouseleave', handleMouseLeave);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="hero-dot-canvas" aria-hidden="true" />;
};

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
      {/* Full-Viewport Opening Scene Hero */}
      <section className="home-hero-full">
        <HeroDotBackground />
        <div className="hero-content">
          <p className="hero-eyebrow">CODE ANALYSIS PLATFORM</p>
          <h1 className="hero-headline">
            Understand your <br />
            <span className="gradient-text">source code.</span>
          </h1>
          <p className="hero-subhead">
            CodeAnalyzer AI parses Python, JavaScript, TypeScript, Java, C, C++, Go, and Rust source code, visualizes Abstract Syntax Trees, calculates complexity metrics, and provides actionable recommendations.
          </p>

          <div className="hero-actions">
            <button
              type="button"
              className="btn btn-primary hero-cta"
              onClick={() => onNavigate('analyzer')}
            >
              Start Analyzing <IconArrowRight size={16} />
            </button>
            <button
              type="button"
              className="btn btn-secondary hero-cta"
              onClick={() => onNavigate('history')}
            >
              View History
            </button>
          </div>
        </div>

        <div className="scroll-indicator" onClick={scrollToCapabilities} role="button" tabIndex={0}>
          <span>Scroll to discover</span>
          <IconArrowDown size={16} />
        </div>
      </section>

      {/* Feature Capabilities Grid */}
      <section id="capabilities" className="home-section">
        <div className="home-section-header">
          <p className="home-section-eyebrow">CORE CAPABILITIES</p>
          <h2 className="home-section-heading">Everything you need to inspect source code</h2>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <IconAst size={24} />
            </div>
            <h3>Interactive AST</h3>
            <p>Visual tree representations generated from native AST and Tree-sitter parsers with complexity weighting.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <IconZap size={24} />
            </div>
            <h3>Complexity Metrics</h3>
            <p>Estimated time and space complexity based on loop nesting, control flow, and recursion analysis.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <IconSearch size={24} />
            </div>
            <h3>Dead Code Detection</h3>
            <p>Identifies unused functions and unreachable code statements where supported by language adapters.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <IconBot size={24} />
            </div>
            <h3>AI Explanation</h3>
            <p>Clear, natural-language explanations explaining findings and optimization steps.</p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="home-section">
        <div className="home-section-header">
          <p className="home-section-eyebrow">WORKFLOW</p>
          <h2 className="home-section-heading">How CodeAnalyzer AI Works</h2>
        </div>

        <div className="how-it-works-grid">
          <div className="step-card">
            <span className="step-num">01</span>
            <h3>Provide Code</h3>
            <p>Write, paste, or upload your source code directly into the editor.</p>
          </div>
          <div className="step-card">
            <span className="step-num">02</span>
            <h3>Run Analysis</h3>
            <p>Click Analyze to trigger AST parsing, complexity scoring, and dead-code scanning.</p>
          </div>
          <div className="step-card">
            <span className="step-num">03</span>
            <h3>Explore & Save</h3>
            <p>Inspect the interactive syntax tree, review AI explanations, and save results to your account.</p>
          </div>
        </div>
      </section>

      {/* Recent Analysis History (Authenticated User) */}
      {user && (
        <section className="home-section">
          <div className="home-section-header">
            <p className="home-section-eyebrow">RECENT ACTIVITY</p>
            <h2 className="home-section-heading">Your Saved Analyses</h2>
          </div>

          {loadingHistory ? (
            <div className="home-empty-card">Loading recent history...</div>
          ) : recentAnalyses.length === 0 ? (
            <div className="home-empty-card">
              <p>No saved analyses found. Run an analysis and click "Save Explanation" to store results.</p>
              <button
                type="button"
                className="btn btn-primary nav-btn-sm"
                onClick={() => onNavigate('analyzer')}
              >
                Analyze Code Now
              </button>
            </div>
          ) : (
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
                  <span className="recent-title">{item.title}</span>
                  <pre className="recent-code-preview">{item.source_code}</pre>
                  <div className="recent-card-footer">
                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    <span className="recent-action">Open in Analyzer →</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
