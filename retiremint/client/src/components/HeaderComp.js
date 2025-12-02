import { useNavigate, useLocation } from 'react-router-dom';
import React from 'react';
import '../Stylesheets/Header.css';

// Minimalist white SVG icons
const Icons = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"></rect>
      <rect x="14" y="3" width="7" height="7"></rect>
      <rect x="14" y="14" width="7" height="7"></rect>
      <rect x="3" y="14" width="7" height="7"></rect>
    </svg>
  ),
  plus: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  ),
  user: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  ),
  logout: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
      <polyline points="16 17 21 12 16 7"></polyline>
      <line x1="21" y1="12" x2="9" y2="12"></line>
    </svg>
  )
};

function Header() {
  const isLoggedIn = !!localStorage.getItem('userId');
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('latestReportId');
    navigate('/login');
  };

  const navigateTo = (path) => {
    navigate(path);
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo">🌿</div>
        <h1 className="sidebar-title" onClick={() => navigateTo('/dashboard')}>RetireMint</h1>
      </div>

      {isLoggedIn && (
        <nav className="sidebar-nav">
          <button 
            className={`sidebar-link ${isActive('/dashboard') ? 'active' : ''}`} 
            onClick={() => navigateTo('/dashboard')}
          >
            <span className="sidebar-icon">{Icons.dashboard}</span>
            <span>Dashboard</span>
          </button>
          <button 
            className={`sidebar-link ${isActive('/scenario/new') ? 'active' : ''}`} 
            onClick={() => navigateTo('/scenario/new')}
          >
            <span className="sidebar-icon">{Icons.plus}</span>
            <span>New Scenario</span>
          </button>
          <button 
            className={`sidebar-link ${isActive('/profile') ? 'active' : ''}`} 
            onClick={() => navigateTo('/profile')}
          >
            <span className="sidebar-icon">{Icons.user}</span>
            <span>Profile</span>
          </button>
        </nav>
      )}

    </div>
  );
}

export default Header;
