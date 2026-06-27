import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { adminApi } from '../api/adminApi';
import { useAdminResource } from '../hooks/useAdminResource';
import {
  formatCompactCurrency,
  formatDuration,
  formatPercent,
  formatTripFrequency,
} from '../utils/adminFormatters';

function RoutesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: routesData, loading, error, reload } = useAdminResource(
    async (signal) => adminApi.getRoutes({ signal }),
    [],
  );

  const [deletingRouteId, setDeletingRouteId] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (location.state?.feedbackMessage) {
      setFeedbackMessage(location.state.feedbackMessage);
      setActionError('');
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  async function handleDeleteRoute(route) {
    if (!route.canMutate) {
      return;
    }

    const confirmed = window.confirm(`Bạn có chắc muốn xóa tuyến ${route.route}?`);
    if (!confirmed) {
      return;
    }

    setDeletingRouteId(route.routeId);
    setActionError('');
    setFeedbackMessage('');

    try {
      await adminApi.deleteRoute(route.routeId);
      setFeedbackMessage('Đã xóa tuyến thành công.');
      reload();
    } catch (deleteError) {
      setActionError(deleteError.message || 'Không xóa được tuyến xe.');
    } finally {
      setDeletingRouteId(null);
    }
  }

  return (
    <div className="page-stack">
      <article className="data-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Tuyến xe</p>
            <h3>Danh mục tuyến đang khai thác</h3>
          </div>

          <div className="editor-actions">
            <button type="button" className="auth-submit" onClick={() => navigate('/tuyen-xe/tao-moi')}>
              Tạo mới
            </button>
          </div>
        </div>

        {feedbackMessage ? (
          <div className="success-banner">
            <strong>{feedbackMessage}</strong>
          </div>
        ) : null}

        {actionError ? <div className="auth-error">{actionError}</div> : null}
      </article>

      {loading ? (
        <div className="empty-state-card">
          <strong>Đang tải dữ liệu tuyến xe...</strong>
          <span>Hệ thống đang tổng hợp tần suất, doanh thu và tỷ lệ lấp đầy.</span>
        </div>
      ) : null}

      {error ? (
        <div className="empty-state-card">
          <strong>Không tải được thông tin tuyến xe</strong>
          <span>{error}</span>
          <button type="button" onClick={reload}>
            Thử tải lại
          </button>
        </div>
      ) : null}

      {!loading && !error && routesData ? (
        <section className="content-grid chart-layout">
          <article className="data-card wide">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Tuyến xe</p>
                <h3>Danh mục tuyến đang khai thác</h3>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tuyến</th>
                    <th>Tần suất</th>
                    <th>Doanh thu TB/ngày</th>
                    <th>Lấp đầy</th>
                    <th>Khoảng cách</th>
                    <th>Thời gian dự kiến</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {routesData.routes.map((route) => (
                    <tr key={route.routeId}>
                      <td>{route.route}</td>
                      <td>{formatTripFrequency(route.averageTripsPerDay)}</td>
                      <td>{formatCompactCurrency(route.averageRevenuePerDay)}</td>
                      <td>{formatPercent(route.occupancyRate)}</td>
                      <td>{route.distanceKm ? `${route.distanceKm} km` : 'Chưa có'}</td>
                      <td>{formatDuration(route.estimatedDurationMinutes)}</td>
                      <td>
                        <div className="table-inline-actions route-action-cell">
                          <button
                            type="button"
                            className="ghost-button"
                            onClick={() => navigate(`/tuyen-xe/${route.routeId}/chinh-sua`)}
                            disabled={!route.canMutate || deletingRouteId === route.routeId}
                            title={route.canMutate ? 'Sửa tuyến' : 'Tuyến đã được gắn vào lịch chạy hoặc trip'}
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            className="danger-button"
                            onClick={() => handleDeleteRoute(route)}
                            disabled={!route.canMutate || deletingRouteId === route.routeId}
                            title={route.canMutate ? 'Xóa tuyến' : 'Tuyến đã được gắn vào lịch chạy hoặc trip'}
                          >
                            {deletingRouteId === route.routeId ? 'Đang xóa...' : 'Xóa'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="data-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Nổi bật</p>
                <h3>Tuyến ưu tiên tăng cường</h3>
              </div>
            </div>

            <ul className="route-list">
              {routesData.highlights.map((route) => (
                <li key={route.routeId}>
                  <strong>{route.name}</strong>
                  <span>{route.tickets} vé / 7 ngày</span>
                  <small>
                    Doanh thu {formatCompactCurrency(route.revenue)} - Lấp đầy {formatPercent(route.occupancyRate)}
                  </small>
                </li>
              ))}
            </ul>
          </article>
        </section>
      ) : null}
    </div>
  );
}

export default RoutesPage;
