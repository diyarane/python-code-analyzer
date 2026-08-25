import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { IconSun, IconMoon, IconUser, IconLogOut, IconHome, IconCode, IconHistory } from './Icons';

interface NavbarProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRoute,
  onNavigate,
  theme,
  onToggleTheme,
}) => {
  const { user, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          <span className="brand-name">
            <strong>CodeAnalyzer AI</strong>
          </span>
        </a>

        <div className="nav-menu">
          <button
            type="button"
            className={`nav-link ${currentRoute === 'home' ? 'is-active' : ''}`}
            onClick={() => onNavigate('home')}
          >
            <IconHome size={15} />
            <span>Home</span>
          </button>
          <button
            type="button"
            className={`nav-link ${currentRoute === 'analyzer' ? 'is-active' : ''}`}
            onClick={() => onNavigate('analyzer')}
          >
            <IconCode size={15} />
            <span>Analyzer</span>
          </button>
          <button
            type="button"
            className={`nav-link ${currentRoute === 'history' ? 'is-active' : ''}`}
            onClick={() => onNavigate('history')}
          >
            <IconHistory size={15} />
            <span>History</span>
          </button>
        </div>
      </div>

      <div className="nav-right">
        <button
          className="icon-btn theme-toggle-icon-btn"
          type="button"
          onClick={onToggleTheme}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
        </button>

        {user ? (
          <div className="user-dropdown-container" ref={dropdownRef}>
            <button
              type="button"
              className="avatar-btn"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              title={user.email}
            >
              <IconUser size={16} />
              <span className="user-email-text">{user.email}</span>
            </button>

            {isDropdownOpen && (
              <div className="user-dropdown-menu">
                <div className="user-dropdown-header">
                  <span className="user-dropdown-email">{user.email}</span>
                  <span className="user-dropdown-role">Authenticated User</span>
                </div>
                <div className="user-dropdown-divider"></div>
                <button
                  type="button"
                  className="user-dropdown-item"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onNavigate('history');
                  }}
                >
                  <IconHistory size={15} />
                  <span>Analysis History</span>
                </button>
                <button
                  type="button"
                  className="user-dropdown-item danger"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    logout();
                    onNavigate('login');
                  }}
                >
                  <IconLogOut size={15} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="auth-nav-buttons">
            <button
              type="button"
              className="btn btn-secondary nav-btn-sm"
              onClick={() => onNavigate('login')}
            >
              Sign In
            </button>
            <button
              type="button"
              className="btn btn-primary nav-btn-sm"
              onClick={() => onNavigate('signup')}
            >
              Sign Up
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};
