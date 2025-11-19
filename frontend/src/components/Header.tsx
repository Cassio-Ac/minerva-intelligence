/**
 * Header Component
 * Navigation bar with user info and logout
 */

import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';
import { API_URL, API_BASE_URL } from '../config/api';

export const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { currentColors } = useSettingsStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });

  useEffect(() => {
    if (showUserMenu && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [showUserMenu]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Don't show header on login page
  if (location.pathname === '/login') {
    return null;
  }

  const navLinks = [
    { path: '/', label: 'Home', icon: '🏠' },
    { path: '/dashboards', label: 'Dashboards', icon: '📊' },
    { path: '/chat', label: 'Chat', icon: '💬', requiresLLM: true },
    { path: '/info', label: 'Info', icon: '📰' },
    { path: '/leaks', label: 'Data Leaks', icon: '⚠️' },
    { path: '/cves', label: 'CVEs', icon: '🛡️' },
    { path: '/telegram', label: 'Telegram', icon: '✈️' },
    { path: '/downloads', label: 'Downloads', icon: '⬇️' },
    { path: '/settings', label: 'Configurações', icon: '⚙️', requiresAdmin: true },
  ];

  const canAccessLink = (link: any) => {
    if (!user) return false;
    if (link.requiresAdmin) return user.can_configure_system;
    if (link.requiresLLM) return user.can_use_llm;
    return true;
  };

  const getRoleBadgeColor = () => {
    switch (user?.role) {
      case 'admin':
        return '#ef4444'; // red
      case 'power':
        return '#3b82f6'; // blue
      case 'reader':
        return '#10b981'; // green
      default:
        return '#6b7280'; // gray
    }
  };

  const getRoleLabel = () => {
    switch (user?.role) {
      case 'admin':
        return 'Admin';
      case 'power':
        return 'Power';
      case 'reader':
        return 'Reader';
      default:
        return 'Unknown';
    }
  };

  return (
    <header
      style={{
        backgroundColor: currentColors.bg.primary,
        borderBottom: `1px solid ${currentColors.border.default}`,
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 9999,
        width: '100%',
        maxWidth: '100vw',
        overflow: 'hidden',
      }}
    >
      {/* Logo/Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px', minWidth: 0, flex: 1, overflow: 'hidden' }}>
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '20px',
            fontWeight: '700',
            color: currentColors.text.primary,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          <img
            src="/assets/minerva-owl.png"
            alt="Minerva"
            style={{
              width: '32px',
              height: '32px',
              objectFit: 'contain',
            }}
          />
          Minerva
        </Link>

        {/* Navigation Links */}
        <nav style={{ display: 'flex', gap: '16px', alignItems: 'center', minWidth: 0, overflow: 'hidden' }}>
          {navLinks.map(
            (link) =>
              canAccessLink(link) && (
                <Link
                  key={link.path}
                  to={link.path}
                  style={{
                    color:
                      location.pathname === link.path
                        ? currentColors.accent.primary
                        : currentColors.text.secondary,
                    textDecoration: 'none',
                    fontSize: '14px',
                    fontWeight: location.pathname === link.path ? '600' : '400',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    backgroundColor:
                      location.pathname === link.path
                        ? `${currentColors.accent.primary}15`
                        : 'transparent',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (location.pathname !== link.path) {
                      e.currentTarget.style.backgroundColor = currentColors.bg.hover;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (location.pathname !== link.path) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {link.icon} {link.label}
                </Link>
              )
          )}
        </nav>
      </div>

      {/* User Menu */}
      {user && (
        <div style={{ flexShrink: 0 }}>
          <button
            ref={buttonRef}
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              backgroundColor: currentColors.bg.tertiary,
              border: `1px solid ${currentColors.border.default}`,
              borderRadius: '8px',
              color: currentColors.text.primary,
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = currentColors.bg.hover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = currentColors.bg.tertiary;
            }}
          >
            {user.profile_photo_url ? (
              <img
                src={`${API_BASE_URL}${user.profile_photo_url}`}
                alt={user.username}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: currentColors.accent.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontWeight: '600',
                  fontSize: '14px',
                }}
              >
                {user.username.charAt(0).toUpperCase()}
              </div>
            )}
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: '600', lineHeight: '1.2' }}>{user.username}</div>
              <div
                style={{
                  fontSize: '11px',
                  color: currentColors.text.muted,
                  lineHeight: '1.2',
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: getRoleBadgeColor(),
                    color: '#ffffff',
                    fontSize: '10px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                  }}
                >
                  {getRoleLabel()}
                </span>
              </div>
            </div>
            <span style={{ fontSize: '12px' }}>▼</span>
          </button>

          {/* Dropdown Menu */}
          {showUserMenu && (
            <>
              {/* Backdrop to close menu */}
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 10000,
                }}
                onClick={() => setShowUserMenu(false)}
              />

              <div
                style={{
                  position: 'fixed',
                  top: `${dropdownPosition.top}px`,
                  right: `${dropdownPosition.right}px`,
                  minWidth: '200px',
                  backgroundColor: currentColors.bg.primary,
                  border: `1px solid ${currentColors.border.default}`,
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  padding: '8px',
                  zIndex: 10001,
                }}
              >
                {/* User Info */}
                <div
                  style={{
                    padding: '8px 12px',
                    borderBottom: `1px solid ${currentColors.border.default}`,
                    marginBottom: '8px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: currentColors.text.primary,
                    }}
                  >
                    {user.full_name || user.username}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: currentColors.text.muted,
                      marginTop: '2px',
                    }}
                  >
                    {user.email}
                  </div>
                </div>

                {/* Permissions */}
                <div
                  style={{
                    padding: '8px 12px',
                    fontSize: '11px',
                    color: currentColors.text.muted,
                    borderBottom: `1px solid ${currentColors.border.default}`,
                    marginBottom: '8px',
                  }}
                >
                  <div>Permissões:</div>
                  <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {user.can_manage_users && <span>✓ Gerenciar usuários</span>}
                    {user.can_use_llm && <span>✓ Usar LLM</span>}
                    {user.can_create_dashboards && <span>✓ Criar dashboards</span>}
                    {user.can_configure_system && <span>✓ Configurar sistema</span>}
                    {!user.can_use_llm && !user.can_create_dashboards && (
                      <span style={{ color: currentColors.text.muted }}>Apenas visualização</span>
                    )}
                  </div>
                </div>

                {/* Profile Button */}
                <button
                  onClick={() => {
                    navigate('/profile');
                    setShowUserMenu(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    color: currentColors.text.primary,
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    borderBottom: `1px solid ${currentColors.border.default}`,
                    marginBottom: '8px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = currentColors.bg.hover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  👤 Meu Perfil
                </button>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    color: currentColors.accent.error,
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = `${currentColors.accent.error}15`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  🚪 Sair
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </header>
  );
};
