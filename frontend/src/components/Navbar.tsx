import React, { useRef } from 'react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  currentRoute: 'home' | 'analyzer' | 'history';
  onNavigate: (route: 'home' | 'analyzer' | 'history') => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onAnalyze: () => void;
  onFileUpload: (code: string, filename: string) => void;
  onOpenAuthModal: (mode: 'login' | 'signup') => void;
  onSaveAnalysis: () => void;
  canSave: boolean;
  isAnalyzing: boolean;
  fileStatus: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRoute,
  onNavigate,
  theme,
  onToggleTheme,
  onAnalyze,
  onFileUpload,
  onOpenAuthModal,
  onSaveAnalysis,
  canSave,
  isAnalyzing,
  fileStatus,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, logout } = useAuth();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.py')) {
      alert('Only .py files are supported.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || '');
      onFileUpload(content, file.name);
      onNavigate('analyzer');
    };
    reader.readAsText(file);
  };

  return (
    <nav className="navbar">
      <div className="nav-left">
        <a
          className="brand"
          href="/home"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('home');
          }}
          aria-label="CodeAnalyzer AI home"
        >
          <span className="brand-mark">CA</span>
          <span>
            <strong>CodeAnalyzer AI</strong>
            <small>Static intelligence platform</small>
          </span>
        </a>

        <div className="nav-menu">
          <button
            type="button"
            className={`nav-link ${currentRoute === 'home' ? 'is-active' : ''}`}
            onClick={() => onNavigate('home')}
          >
            Home
          </button>
          <button
            type="button"
            className={`nav-link ${currentRoute === 'analyzer' ? 'is-active' : ''}`}
            onClick={() => onNavigate('analyzer')}
          >
            Analyzer
          </button>
          <button
            type="button"
            className={`nav-link ${currentRoute === 'history' ? 'is-active' : ''}`}
            onClick={() => onNavigate('history')}
          >
            History
          </button>
        </div>
      </div>

      <div className="nav-actions">
        <input
          ref={fileInputRef}
          className="file-input"
          type="file"
          accept=".py"
          onChange={handleFileChange}
        />

        {currentRoute === 'analyzer' && (
          <>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => fileInputRef.current?.click()}
            >
              Upload ({fileStatus})
            </button>

            {user && canSave && (
              <button
                className="btn btn-secondary"
                type="button"
                onClick={onSaveAnalysis}
                title="Save analysis to your account history"
              >
                Save Analysis
              </button>
            )}

            <button
              className="btn btn-primary"
              type="button"
              onClick={onAnalyze}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? 'Analyzing…' : 'Analyze'}
            </button>
          </>
        )}

        {user ? (
          <div className="user-profile">
            <span className="user-email" title={user.email}>
              {user.email}
            </span>
            <button
              type="button"
              className="btn btn-secondary nav-btn-sm"
              onClick={() => logout()}
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="auth-btn-group">
            <button
              type="button"
              className="btn btn-secondary nav-btn-sm"
              onClick={() => onOpenAuthModal('login')}
            >
              Sign In
            </button>
            <button
              type="button"
              className="btn btn-secondary nav-btn-sm"
              onClick={() => onOpenAuthModal('signup')}
            >
              Sign Up
            </button>
          </div>
        )}

        <button
          className="theme-toggle"
          type="button"
          onClick={onToggleTheme}
          aria-label="Toggle theme"
        >
          <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>
      </div>
    </nav>
  );
};
