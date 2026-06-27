import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../auth/AdminAuthContext';
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

  return (
    <div className={`app-shell${isSidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <p className="eyebrow">Busline Admin</p>
            {!isSidebarCollapsed ? (
              <>
                <h1>Điều hành nhà xe</h1>
                <p className="sidebar-copy">
                  Thanh điều hướng luôn cố định bên trái để thao tác nhanh hơn khi cuộn và quản trị.
                </p>
              </>
            ) : null}
          </div>

          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setIsSidebarCollapsed((current) => !current)}
            aria-label={isSidebarCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
            title={isSidebarCollapsed ? 'Mở rộng' : 'Thu gọn'}
          >
            {isSidebarCollapsed ? '»' : '«'}
          </button>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              to={item.to}
              title={item.label}
            >
              <span className="nav-item-icon">{item.shortLabel}</span>
              {!isSidebarCollapsed ? <span className="nav-item-label">{item.label}</span> : null}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user-card">
          <div className="sidebar-user-avatar">{getInitials(user?.fullName)}</div>

          {!isSidebarCollapsed ? (
            <div className="sidebar-user-meta">
              <strong>{user?.fullName || 'Admin'}</strong>
              <span>{user?.email || 'Chưa có email'}</span>
              <small>{primaryRole}</small>
            </div>
          ) : null}

          <button
            type="button"
            className="logout-button"
            onClick={() => {
              logout();
              navigate('/login', { replace: true });
            }}
            title="Đăng xuất"
          >
            {isSidebarCollapsed ? '⎋' : 'Đăng xuất'}
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Phòng điều hành</p>
            <h2>{activeNavItem.title}</h2>
          </div>

          <div className="topbar-actions">
            <div className="topbar-user-badge">
              <strong>{user?.fullName || 'Admin'}</strong>
              <span>{primaryRole}</span>
            </div>
          </div>
        </header>

        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;
