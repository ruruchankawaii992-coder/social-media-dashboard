import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // If already authenticated, go to dashboard
  if (authLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#0a0a0f',
      }}>
        <div
          style={{
            width: 40,
            height: 40,
            border: '3px solid #1a1a2e',
            borderTopColor: '#c084fc',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
          role="status"
          aria-label="Loading"
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    const trimmedUser = username.trim();
    if (!trimmedUser) {
      setError('Username is required');
      return;
    }
    if (!password) {
      setError('Password is required');
      return;
    }

    setSubmitting(true);
    try {
      await login(trimmedUser, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#0a0a0f',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          backgroundColor: '#12121a',
          borderRadius: 12,
          border: '1px solid #1a1a2e',
          padding: 40,
        }}
      >
        <h1
          style={{
            color: '#e8e8f0',
            fontSize: 24,
            fontWeight: 700,
            marginBottom: 8,
            textAlign: 'center',
          }}
        >
          SMM Dashboard
        </h1>
        <p
          style={{
            color: '#9a9ab0',
            fontSize: 14,
            marginBottom: 32,
            textAlign: 'center',
          }}
        >
          Sign in to your account
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: 20 }}>
            <label
              htmlFor="username"
              style={{
                display: 'block',
                color: '#e8e8f0',
                fontSize: 13,
                fontWeight: 500,
                marginBottom: 6,
              }}
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={submitting}
              placeholder="Enter your username"
              autoComplete="username"
              aria-required="true"
              style={{
                width: '100%',
                padding: '10px 14px',
                backgroundColor: '#0a0a0f',
                border: '1px solid #1a1a2e',
                borderRadius: 6,
                color: '#e8e8f0',
                fontSize: 14,
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => { e.target.style.borderColor = '#c084fc'; }}
              onBlur={(e) => { e.target.style.borderColor = '#1a1a2e'; }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label
              htmlFor="password"
              style={{
                display: 'block',
                color: '#e8e8f0',
                fontSize: 13,
                fontWeight: 500,
                marginBottom: 6,
              }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              placeholder="Enter your password"
              autoComplete="current-password"
              aria-required="true"
              style={{
                width: '100%',
                padding: '10px 14px',
                backgroundColor: '#0a0a0f',
                border: '1px solid #1a1a2e',
                borderRadius: 6,
                color: '#e8e8f0',
                fontSize: 14,
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => { e.target.style.borderColor = '#c084fc'; }}
              onBlur={(e) => { e.target.style.borderColor = '#1a1a2e'; }}
            />
          </div>

          {error && (
            <div
              role="alert"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                padding: '10px 14px',
                borderRadius: 6,
                fontSize: 13,
                marginBottom: 20,
                textAlign: 'center',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              padding: '10px 14px',
              backgroundColor: submitting ? '#6b3fa0' : '#c084fc',
              color: '#0a0a0f',
              border: 'none',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
            aria-label="Sign in"
          >
            {submitting ? (
              <>
                <span
                  style={{
                    width: 16,
                    height: 16,
                    border: '2px solid rgba(10, 10, 15, 0.3)',
                    borderTopColor: '#0a0a0f',
                    borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
