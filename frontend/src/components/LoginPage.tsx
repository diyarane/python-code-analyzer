import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { IconEye, IconEyeOff } from './Icons';

interface LoginPageProps {
  onNavigate: (route: string) => void;
}

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailTouched, setEmailTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEmailValid = EMAIL_REGEX.test(email.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEmailTouched(true);

    if (!isEmailValid) {
      setError('Please enter a valid email address (e.g. user@example.com).');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await login(email.trim(), password);
      if (res.success) {
        onNavigate('home');
      } else {
        setError(res.error || 'Invalid email address or password.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-card-header">
          <a
            className="brand"
            href="/home"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('home');
            }}
          >
            <span className="brand-mark">CA</span>
            <span>
              <strong>CodeAnalyzer AI</strong>
            </span>
          </a>
          <h2>Sign in to CodeAnalyzer AI</h2>
          <p className="auth-card-sub">Access your Python AST graph history and static metrics.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-error-banner">{error}</div>}

          <div className="auth-field">
            <label htmlFor="login-email">Email Address</label>
            <input
              id="login-email"
              type="email"
              placeholder="developer@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              onBlur={() => setEmailTouched(true)}
              required
              autoFocus
            />
            {emailTouched && email.length > 0 && !isEmailValid && (
              <span className="field-error-text">Please enter a valid email address with domain (e.g. user@example.com).</span>
            )}
          </div>

          <div className="auth-field">
            <label htmlFor="login-password">Password</label>
            <div className="password-input-wrapper">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary auth-submit-btn"
            disabled={isSubmitting || (emailTouched && !isEmailValid)}
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>

          <div className="auth-footer-link">
            Don't have an account?{' '}
            <button
              type="button"
              className="text-link"
              onClick={() => onNavigate('signup')}
            >
              Create an account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
