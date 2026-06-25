import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../auth/AdminAuthContext';

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, authReady } = useAdminAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const next = new URLSearchParams(location.search).get('next') || '/dashboard';

  if (!authReady) {
    return (
      <div className="auth-shell">
        <div className="auth-card compact">
          <p className="eyebrow">Busline Admin</p>
          <h1>Đang khởi tạo phiên admin</h1>
          <p className="auth-copy">Hệ thống đang kiểm tra trạng thái đăng nhập hiện tại.</p>
        </div>
      </div>
    );
  }

  if (authReady && isAuthenticated) {
    return <Navigate replace to={next} />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await login(form);
      navigate(next, { replace: true });
    } catch (loginError) {
      setError(loginError.message || 'Đăng nhập thất bại.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-hero">
          <p className="eyebrow">Busline Admin</p>
          <h1>Đăng nhập trang quản trị</h1>
          <p className="auth-copy">
            Sử dụng tài khoản có quyền ADMIN hoặc STAFF để truy cập dashboard vận hành.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="username"
              placeholder="admin@busline.vn"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              required
            />
          </label>

          <label className="auth-field">
            <span>Mật khẩu</span>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Nhập mật khẩu"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              required
            />
          </label>

          {error ? <div className="auth-error">{error}</div> : null}

          <button type="submit" className="auth-submit" disabled={submitting}>
            {submitting ? 'Đang đăng nhập...' : 'Đăng nhập admin'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
