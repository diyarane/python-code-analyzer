import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { IconEye, IconEyeOff } from './Icons';

interface SignupPageProps {
  onNavigate: (route: string) => void;
}

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const SignupPage: React.FC<SignupPageProps> = ({ onNavigate }) => {
  const { signup } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await signup(email.trim(), password);
      if (res.success) {
        onNavigate('home');
      } else {
        setError(res.error || 'Failed to create account.');
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
          <h2>Create your account</h2>
          <p className="auth-card-sub">Start analyzing Python AST structure and complexity.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-error-banner">{error}</div>}

          <div className="auth-field">
            <label htmlFor="signup-email">Email Address</label>
            <input
              id="signup-email"
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
            <label htmlFor="signup-password">Password (minimum 8 characters)</label>
            <div className="password-input-wrapper">
              <input
                id="signup-password"
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

          <div className="auth-field">
            <label htmlFor="signup-confirm">Confirm Password</label>
            <input
              id="signup-confirm"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary auth-submit-btn"
            disabled={isSubmitting || (emailTouched && !isEmailValid)}
          >
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </button>

          <div className="auth-footer-link">
            Already have an account?{' '}
            <button
              type="button"
              className="text-link"
              onClick={() => onNavigate('login')}
            >
              Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
