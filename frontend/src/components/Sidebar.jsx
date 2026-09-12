import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCase } from '../context/CaseContext';

export default function Sidebar({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }) {
  const { user, logout } = useAuth();
  const { activeCaseId } = useCase();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navSections = [
    {
      title: 'INVESTIGATE',
      items: [
        { label: 'Overview', path: '/', icon: '📊', end: true },
        { label: 'Cases', path: '/cases', icon: '📁' },
        { label: 'Money Trail', path: '/money-trail', icon: '💸', badge: 'HERO' },
        { label: 'Wallet Intelligence', path: '/wallets', icon: '🔎' },
        { label: 'Transaction Graph', path: '/graph', icon: '🕸️' },
      ]
    },
    {
      title: 'INTELLIGENCE',
      items: [
        { label: 'Entities / VASP', path: '/entities', icon: '🏦' },
        { label: 'Cross-Chain', path: '/cross-chain', icon: '⚡' },
        { label: 'Risk & Alerts', path: '/alerts', icon: '🚨' },
        { label: 'Analytics', path: '/analytics', icon: '📈' },
      ]
    },
    {
      title: 'OUTPUT',
      items: [
        { label: 'Reports', path: '/reports', icon: '📑' },
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        { label: 'System Status', path: '/system-status', icon: '🟢' },
        { label: 'Settings', path: '/settings', icon: '⚙️' },
      ]
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="mobile-backdrop"
          onClick={() => setIsMobileOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)', zIndex: 998, display: 'none'
          }}
        />
      )}

      <aside className={`app-sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
        {/* Top Brand Header */}
        <div className="sidebar-brand-header">
          <div className="brand-logo-icon">🔗</div>
          {!isCollapsed && (
            <div className="brand-text-block">
              <div className="brand-name">CFAS FORENSICS</div>
              <div className="brand-tag">CRYPTO ATTRIBUTION OS</div>
            </div>
          )}
          <button
            className="sidebar-collapse-btn"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? '▶' : '◀'}
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="sidebar-nav-scroll">
          {navSections.map((sec, idx) => (
            <div key={idx} className="sidebar-section">
              {!isCollapsed && (
                <div className="sidebar-section-title">{sec.title}</div>
              )}
              <ul className="sidebar-nav-list">
                {sec.items.map((item, itemIdx) => (
                  <li key={itemIdx}>
                    <NavLink
                      to={item.path}
                      end={item.end}
                      className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                      onClick={() => setIsMobileOpen(false)}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <span className="nav-icon">{item.icon}</span>
                      {!isCollapsed && <span className="nav-label">{item.label}</span>}
                      {!isCollapsed && item.badge && (
                        <span className="nav-badge-tag">{item.badge}</span>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* User Card & Logout Deck */}
        <div className="sidebar-footer">
          <div className="user-mini-card">
            <div className="user-avatar-badge">
              {user?.full_name ? user.full_name.charAt(0) : 'O'}
            </div>
            {!isCollapsed && (
              <div className="user-info-block">
                <div className="user-name">{user?.full_name || 'Officer'}</div>
                <div className="user-role-tag">{user?.role?.toUpperCase() || 'ANALYST'}</div>
              </div>
            )}
          </div>
          <button
            className="sidebar-logout-btn"
            onClick={handleLogout}
            title="Logout Session"
          >
            ⏻ {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
