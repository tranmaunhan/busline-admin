import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../auth/AdminAuthContext';

function ProtectedRoute({ children }) {
  const { authReady, isAuthenticated } = useAdminAuth();
  const location = useLocation();

  if (!authReady) {
    return (
      <div className="auth-shell">
        <div className="auth-card compact">
          <p className="eyebrow">Busline Admin</p>
          <h1>Đang xác thực phiên làm việc</h1>
          <p className="auth-copy">Hệ thống đang kiểm tra token admin của bạn.</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const next = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate replace to={`/login?next=${encodeURIComponent(next)}`} />;
  }

  return children;
}

export default ProtectedRoute;
