import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { ReactNode } from 'react';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
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
          aria-label="Loading"
          role="status"
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
