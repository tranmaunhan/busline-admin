import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminApi } from '../api/adminApi';
import { useAdminResource } from '../hooks/useAdminResource';
import {
  createScheduleForm,
  createScheduleFormFromSchedule,
  formatScheduleDate,
  formatScheduleTime,
} from '../utils/scheduleUtils';

function ScheduleEditorPage() {
  const navigate = useNavigate();
  const params = useParams();
  const scheduleId = params.scheduleId ? Number(params.scheduleId) : null;
  const isEditing = Number.isFinite(scheduleId);

  const [form, setForm] = useState(createScheduleForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const { data, loading, error, reload } = useAdminResource(
    async (signal) => {
      const [selectedSchedule, routesPayload, fleetPayload] = await Promise.all([
        isEditing ? adminApi.getTripSchedule(scheduleId, { signal }) : Promise.resolve(null),
        adminApi.getRoutes({ signal }),
        adminApi.getFleet({ signal }),
      ]);

      return {
        routesPayload,
        fleetPayload,
        selectedSchedule,
      };
    },
    [isEditing, scheduleId],
  );

  const selectedSchedule = data?.selectedSchedule ?? null;
  const routeOptions = data?.routesPayload?.routes ?? [];
  const vehicleOptions = data?.fleetPayload?.vehicles ?? [];

  useEffect(() => {
    if (!selectedSchedule) {
      return;
    }

    setForm(createScheduleFormFromSchedule(selectedSchedule));
  }, [selectedSchedule]);

  const vehicleSelectOptions = useMemo(
    () => vehicleOptions.map((vehicle) => ({
      value: String(vehicle.vehicleId),
      label: `${vehicle.code} - ${vehicle.type}`,
    })),
    [vehicleOptions],
  );

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm(selectedSchedule ? createScheduleFormFromSchedule(selectedSchedule) : createScheduleForm());
    setSubmitError('');
    setFeedbackMessage('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    setFeedbackMessage('');

    try {
      const payload = {
        routeId: Number(form.routeId),
        vehicleId: Number(form.vehicleId),
        departureTime: form.departureTime,
        startDate: form.startDate,
        endDate: form.endDate || null,
        status: Number(form.status),
      };

      if (isEditing) {
        await adminApi.updateTripSchedule(scheduleId, payload);
        navigate('/lich-chay', {
          replace: true,
          state: { feedbackMessage: 'Đã cập nhật lịch chạy thành công.' },
        });
      } else {
        await adminApi.createTripSchedule(payload);
        navigate('/lich-chay', {
          replace: true,
          state: { feedbackMessage: 'Đã tạo lịch chạy thành công.' },
        });
      }
    } catch (requestError) {
      setSubmitError(requestError.message || 'Không lưu được lịch chạy.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!isEditing) {
      return;
    }

    const confirmed = window.confirm(`Bạn có chắc muốn xóa lịch #${scheduleId} không?`);
    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setSubmitError('');
    setFeedbackMessage('');

    try {
      await adminApi.deleteTripSchedule(scheduleId);
      navigate('/lich-chay', {
        replace: true,
        state: { feedbackMessage: 'Đã xóa lịch chạy mẫu thành công.' },
      });
    } catch (requestError) {
      setSubmitError(requestError.message || 'Không xóa được lịch chạy.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="page-stack">
      <article className="data-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{isEditing ? 'Chỉnh sửa lịch' : 'Tạo lịch mới'}</p>
            <h3>{isEditing ? 'Cập nhật thông tin lịch chạy' : 'Tạo lịch chạy mẫu mới'}</h3>
          </div>

          <div className="editor-actions">
            <button type="button" className="ghost-button" onClick={() => navigate('/lich-chay')}>
              Quay lại lịch chạy
            </button>
            {isEditing ? (
              <button type="button" className="danger-button" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Đang xóa...' : 'Xóa lịch'}
              </button>
            ) : null}
          </div>
        </div>

        {loading ? (
          <div className="empty-state-card">
            <strong>Đang tải dữ liệu lịch chạy...</strong>
            <span>Hệ thống đang lấy danh sách tuyến, xe và chi tiết lịch cần chỉnh sửa.</span>
          </div>
        ) : null}

        {error ? (
          <div className="empty-state-card">
            <strong>Không tải được thông tin lịch chạy</strong>
            <span>{error}</span>
            <button type="button" onClick={reload}>
              Thử tải lại
            </button>
          </div>
        ) : null}

        {!loading && !error ? (
          <form className="editor-stack" onSubmit={handleSubmit}>
            {selectedSchedule ? (
              <div className="schedule-editor-summary">
                <div>
                  <span>Lịch hiện tại</span>
                  <strong>#{selectedSchedule.id} - {selectedSchedule.routeName}</strong>
                </div>
                <div>
                  <span>Giờ chạy</span>
                  <strong>{formatScheduleTime(selectedSchedule.departureTime)}</strong>
                </div>
                <div>
                  <span>Hiệu lực</span>
                  <strong>
                    {formatScheduleDate(selectedSchedule.startDate, 'Chưa có')}
                    {' '}đến{' '}
                    {formatScheduleDate(selectedSchedule.endDate, 'Không giới hạn')}
                  </strong>
                </div>
              </div>
            ) : null}

            <div className="schedule-form-grid">
              <label className="filter-field">
                <span>Tuyến xe</span>
                <select
                  value={form.routeId}
                  onChange={(event) => updateForm('routeId', event.target.value)}
                  required
                >
                  <option value="">Chọn tuyến</option>
                  {routeOptions.map((route) => (
                    <option key={route.routeId} value={route.routeId}>
                      {route.route}
                    </option>
                  ))}
                </select>
              </label>

              <label className="filter-field">
                <span>Xe</span>
                <select
                  value={form.vehicleId}
                  onChange={(event) => updateForm('vehicleId', event.target.value)}
                  required
                >
                  <option value="">Chọn xe</option>
                  {vehicleSelectOptions.map((vehicle) => (
                    <option key={vehicle.value} value={vehicle.value}>
                      {vehicle.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="filter-field">
                <span>Giờ khởi hành</span>
                <input
                  className="form-input"
                  type="time"
                  value={form.departureTime}
                  onChange={(event) => updateForm('departureTime', event.target.value)}
                  required
                />
              </label>

              <label className="filter-field">
                <span>Trạng thái</span>
                <select
                  value={form.status}
                  onChange={(event) => updateForm('status', event.target.value)}
                >
                  <option value="1">Đang hoạt động</option>
                  <option value="0">Ngừng hoạt động</option>
                </select>
              </label>
            </div>

            <div className="schedule-form-grid schedule-form-grid-compact">
              <label className="filter-field">
                <span>Ngày bắt đầu</span>
                <input
                  className="form-input"
                  type="date"
                  value={form.startDate}
                  onChange={(event) => updateForm('startDate', event.target.value)}
                  required
                />
              </label>

              <label className="filter-field">
                <span>Ngày kết thúc</span>
                <input
                  className="form-input"
                  type="date"
                  value={form.endDate}
                  onChange={(event) => updateForm('endDate', event.target.value)}
                />
              </label>
            </div>

            {feedbackMessage ? (
              <div className="success-banner">
                <strong>{feedbackMessage}</strong>
              </div>
            ) : null}

            {submitError ? <div className="auth-error">{submitError}</div> : null}

            <div className="editor-actions">
              <button type="button" className="ghost-button" onClick={resetForm} disabled={submitting}>
                Đặt lại
              </button>
              <button type="submit" className="auth-submit" disabled={submitting}>
                {submitting ? 'Đang lưu...' : isEditing ? 'Lưu thay đổi' : 'Tạo lịch'}
              </button>
            </div>
          </form>
        ) : null}
      </article>
    </div>
  );
}

export default ScheduleEditorPage;
