import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/insights', label: 'Insights' },
  { to: '/schedule', label: 'Schedule' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav
      style={{
        backgroundColor: '#12121a',
        borderBottom: '1px solid #1a1a2e',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
      role="navigation"
      aria-label="Main navigation"
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 60,
          maxWidth: 1200,
          margin: '0 auto',
        }}
      >
        {/* Logo */}
        <Link
          to="/dashboard"
          style={{
            color: '#e8e8f0',
            fontWeight: 700,
            fontSize: 18,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          SMM Dashboard
        </Link>

        {/* Hamburger toggle (mobile) */}
        <button
          onClick={() => setMenuOpen((prev) => !prev)}
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            color: '#e8e8f0',
            fontSize: 24,
            cursor: 'pointer',
            padding: 4,
          }}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          className="navbar-toggle"
        >
          {menuOpen ? '✕' : '☰'}
        </button>

        {/* Desktop links + logout */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
          className="navbar-links"
        >
          {NAV_LINKS.map((link) => {
            const isActive = location.pathname.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                style={{
                  color: isActive ? '#c084fc' : '#9a9ab0',
                  textDecoration: 'none',
                  padding: '8px 16px',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 400,
                  backgroundColor: isActive ? 'rgba(192, 132, 252, 0.1)' : 'transparent',
                  transition: 'color 0.2s, background-color 0.2s',
                }}
                aria-current={isActive ? 'page' : undefined}
              >
                {link.label}
              </Link>
            );
          })}

          <div style={{ flex: 1 }} />

          {user && (
            <span
              style={{
                color: '#9a9ab0',
                fontSize: 13,
                marginRight: 8,
                whiteSpace: 'nowrap',
              }}
            >
              {user.displayName || user.username}
            </span>
          )}

          <button
            onClick={logout}
            style={{
              background: 'none',
              border: '1px solid #1a1a2e',
              color: '#ef4444',
              padding: '6px 14px',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              transition: 'border-color 0.2s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ef4444'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1a1a2e'; }}
            aria-label="Logout"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div
          style={{
            display: 'none',
            flexDirection: 'column',
            padding: '8px 0 16px',
            gap: 4,
          }}
          className="navbar-mobile"
        >
          {NAV_LINKS.map((link) => {
            const isActive = location.pathname.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                style={{
                  color: isActive ? '#c084fc' : '#9a9ab0',
                  textDecoration: 'none',
                  padding: '10px 16px',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 400,
                  backgroundColor: isActive ? 'rgba(192, 132, 252, 0.1)' : 'transparent',
                }}
              >
                {link.label}
              </Link>
            );
          })}
          {user && (
            <span style={{ color: '#9a9ab0', fontSize: 13, padding: '8px 16px' }}>
              {user.displayName || user.username}
            </span>
          )}
          <button
            onClick={() => { setMenuOpen(false); logout(); }}
            style={{
              background: 'none',
              border: 'none',
              color: '#ef4444',
              padding: '10px 16px',
              fontSize: 14,
              textAlign: 'left',
              cursor: 'pointer',
            }}
            aria-label="Logout"
          >
            Logout
          </button>
        </div>
      )}

      {/* Inline styles for responsive behavior */}
      <style>{`
        @media (max-width: 767px) {
          .navbar-toggle { display: block !important; }
          .navbar-links { display: none !important; }
          .navbar-mobile { display: flex !important; }
        }
      `}</style>
    </nav>
  );
}
