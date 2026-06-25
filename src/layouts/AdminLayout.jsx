import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../auth/AdminAuthContext';
import { navItems } from '../data/adminData';

function AdminLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAdminAuth();

  const primaryRole = user?.roles?.[0] ?? 'ADMIN';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Busline Admin</p>
          {/* <h1>Quản lý nhà xe thông minh</h1> */}
          {/* <p className="sidebar-copy">
            Điều hành vé, chuyến, tuyến và đội xe trong cùng một hệ thống quản trị.
          </p> */}
        </div>

        <nav className="nav-list">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              to={item.to}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-panel">
          <span className="panel-label">Phiên đăng nhập</span>
          <strong>{user?.fullName || 'Admin'}</strong>
          <p>{primaryRole} - {user?.email || 'Chưa có email'}</p>
          <button
            type="button"
            className="logout-button"
            onClick={() => {
              logout();
              navigate('/login', { replace: true });
            }}
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Phòng điều hành</p>
            <h2>Bảng quản trị vận hành nhà xe</h2>
          </div>

          <div className="topbar-actions">
            <div className="status-badge">{primaryRole}</div>
            <button type="button" onClick={() => navigate('/dashboard')}>
              Về dashboard
            </button>
          </div>
        </header>

        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;
