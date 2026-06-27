import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { adminApi } from '../api/adminApi';
import { useAdminResource } from '../hooks/useAdminResource';

function FleetPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data, loading, error, reload } = useAdminResource(
    (signal) => adminApi.getFleet({ signal }),
    [],
  );

  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [statusDrafts, setStatusDrafts] = useState({});
  const [statusSubmittingId, setStatusSubmittingId] = useState(null);
  const [statusError, setStatusError] = useState('');

  const statusOptions = data?.statusOptions ?? [];
  const vehicles = data?.vehicles ?? [];

  useEffect(() => {
    if (location.state?.feedbackMessage) {
      setFeedbackMessage(location.state.feedbackMessage);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!statusOptions.length) {
      return;
    }

    setStatusDrafts(
      Object.fromEntries(
        vehicles.map((vehicle) => [vehicle.vehicleId, vehicle.rawStatus || statusOptions[0]?.value || 'ACTIVE']),
      ),
    );
  }, [vehicles, statusOptions]);

  async function handleQuickStatusUpdate(vehicleId) {
    setStatusSubmittingId(vehicleId);
    setStatusError('');
    setFeedbackMessage('');

    try {
      await adminApi.updateVehicleStatus(vehicleId, statusDrafts[vehicleId]);
      setFeedbackMessage('Đã cập nhật trạng thái xe.');
      reload();
    } catch (requestError) {
      setStatusError(requestError.message || 'Không đổi được trạng thái xe.');
    } finally {
      setStatusSubmittingId(null);
    }
  }

  return (
    <div className="page-stack">
      <article className="data-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Đội xe</p>
            <h3>Danh sách phương tiện đang quản lý</h3>
            <p className="section-note">
              Màn hình danh sách chỉ giữ các thao tác cần thiết. Phần thêm và chỉnh sửa đã được tách ra trang riêng để thao tác gọn hơn.
            </p>
          </div>

          <div className="editor-actions">
            <button type="button" className="auth-submit" onClick={() => navigate('/doi-xe/tao-moi')}>
              Thêm xe
            </button>
          </div>
        </div>

        {feedbackMessage ? (
          <div className="success-banner">
            <strong>{feedbackMessage}</strong>
          </div>
        ) : null}

        {statusError ? <div className="auth-error">{statusError}</div> : null}
      </article>

      {loading ? (
        <div className="empty-state-card">
          <strong>Đang tải đội xe...</strong>
          <span>Hệ thống đang tổng hợp trạng thái phương tiện và hoạt động gần nhất.</span>
        </div>
      ) : null}

      {error ? (
        <div className="empty-state-card">
          <strong>Không tải được thông tin đội xe</strong>
          <span>{error}</span>
          <button type="button" onClick={reload}>
            Thử tải lại
          </button>
        </div>
      ) : null}

      {!loading && !error && data ? (
        <>
          <section className="stats-grid">
            {data.summary.map((item) => (
              <article className="stat-card" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <p>{item.note}</p>
              </article>
            ))}
          </section>

          <article className="data-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Phương tiện</p>
                <h3>Tình trạng phương tiện và thao tác nhanh</h3>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Biển số</th>
                    <th>Loại xe</th>
                    <th>Trạng thái</th>
                    <th>Hoạt động gần nhất</th>
                    <th>Hãng xe</th>
                    <th>Năm SX</th>
                    <th>Số ghế</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((row) => (
                    <tr key={row.vehicleId}>
                      <td>{row.code}</td>
                      <td>{row.type}</td>
                      <td>
                        <span className="status-pill">{row.status}</span>
                      </td>
                      <td>{row.activityValue}</td>
                      <td>{row.brand}</td>
                      <td>{row.manufactureYear ?? 'Chưa có'}</td>
                      <td>{row.totalSeats ?? 'Chưa rõ'}</td>
                      <td>
                        <div className="table-inline-actions">
                          <button
                            type="button"
                            className="ghost-button"
                            onClick={() => navigate(`/doi-xe/${row.vehicleId}/chinh-sua`)}
                          >
                            Sửa
                          </button>
                          <select
                            className="table-inline-select"
                            value={statusDrafts[row.vehicleId] ?? row.rawStatus}
                            onChange={(event) => setStatusDrafts((current) => ({
                              ...current,
                              [row.vehicleId]: event.target.value,
                            }))}
                          >
                            {statusOptions.map((option) => (
                              <option key={`${row.vehicleId}-${option.value}`} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={statusSubmittingId === row.vehicleId}
                            onClick={() => handleQuickStatusUpdate(row.vehicleId)}
                          >
                            {statusSubmittingId === row.vehicleId ? 'Đang đổi...' : 'Đổi trạng thái'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {vehicles.length === 0 ? (
                    <tr>
                      <td colSpan="8">
                        <div className="empty-slot">Chưa có xe nào trong đội xe.</div>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </article>
        </>
      ) : null}
    </div>
  );
}

export default FleetPage;
