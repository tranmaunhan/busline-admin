import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../auth/AdminAuthContext';
import { CollapseIcon, ExpandIcon, LogoutIcon } from '../components/AdminIcons';
import { navItems } from '../data/adminData';

const SIDEBAR_STORAGE_KEY = 'adminSidebarCollapsed';

function getInitials(fullName) {
  if (!fullName) {
    return 'AD';
  }

  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('');
  return initials || 'AD';
}

function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAdminAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1',
  );

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, isSidebarCollapsed ? '1' : '0');
  }, [isSidebarCollapsed]);

  const primaryRole = user?.roles?.[0] ?? 'ADMIN';
  const activeNavItem = useMemo(
    () => navItems.find((item) => location.pathname.startsWith(item.to)) ?? navItems[0],
    [location.pathname],
  );

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className={`app-shell${isSidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <p className="eyebrow">Busline Admin</p>
            {!isSidebarCollapsed ? <h1>Điều hành</h1> : null}
          </div>

          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setIsSidebarCollapsed((current) => !current)}
            aria-label={isSidebarCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
            title={isSidebarCollapsed ? 'Mở rộng' : 'Thu gọn'}
          >
            {isSidebarCollapsed ? <ExpandIcon className="nav-svg-icon" /> : <CollapseIcon className="nav-svg-icon" />}
          </button>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                to={item.to}
                title={item.label}
              >
                <span className="nav-item-icon">
                  <Icon />
                </span>
                {!isSidebarCollapsed ? <span className="nav-item-label">{item.label}</span> : null}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Busline Admin</p>
            <h2>{activeNavItem.label}</h2>
          </div>

          <div className="topbar-actions">
            <div className="topbar-user-panel">
              <div className="topbar-user-avatar">{getInitials(user?.fullName)}</div>

              <div className="topbar-user-badge">
                <strong>{user?.fullName || 'Admin'}</strong>
                <span>{user?.email || 'Chưa có email'}</span>
                <small>{primaryRole}</small>
              </div>
            </div>

            <button
              type="button"
              className="logout-button topbar-logout-button"
              onClick={handleLogout}
              title="Đăng xuất"
            >
              <LogoutIcon className="nav-svg-icon" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </header>

        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;
