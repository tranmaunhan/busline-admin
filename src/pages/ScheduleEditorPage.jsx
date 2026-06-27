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
      const [tripSchedules, routesPayload, fleetPayload] = await Promise.all([
        adminApi.getTripSchedules({ signal }),
        adminApi.getRoutes({ signal }),
        adminApi.getFleet({ signal }),
      ]);

      const selectedSchedule = isEditing
        ? tripSchedules.find((schedule) => Number(schedule.id) === scheduleId) ?? null
        : null;

      if (isEditing && !selectedSchedule) {
        throw new Error(`Khong tim thay lich chay voi id = ${scheduleId}`);
      }

      return {
        tripSchedules,
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
        setFeedbackMessage('Cap nhat lich chay thanh cong.');
      } else {
        await adminApi.createTripSchedule(payload);
        setFeedbackMessage('Tao lich chay thanh cong.');
        setForm(createScheduleForm());
      }

      reload();
    } catch (requestError) {
      setSubmitError(requestError.message || 'Khong luu duoc lich chay.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!isEditing) {
      return;
    }

    const confirmed = window.confirm(`Ban co chac muon xoa lich #${scheduleId} khong?`);
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
        state: { feedbackMessage: 'Da xoa lich chay mau thanh cong.' },
      });
    } catch (requestError) {
      setSubmitError(requestError.message || 'Khong xoa duoc lich chay.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="page-stack">
      <article className="data-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{isEditing ? 'Chinh sua lich' : 'Tao lich moi'}</p>
            <h3>{isEditing ? 'Cap nhat thong tin lich chay' : 'Tao lich chay mau moi'}</h3>
            <p className="section-note">
              Chon tuyen, xe, gio khoi hanh va khoang hieu luc. Moi thong tin duoc load san tu co so du lieu de admin chon nhanh.
            </p>
          </div>

          <div className="editor-actions">
            <button type="button" className="ghost-button" onClick={() => navigate('/lich-chay')}>
              Quay lai lich chay
            </button>
            {isEditing ? (
              <button type="button" className="danger-button" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Dang xoa...' : 'Xoa lich'}
              </button>
            ) : null}
          </div>
        </div>

        {loading ? (
          <div className="empty-state-card">
            <strong>Dang tai du lieu lich chay...</strong>
            <span>He thong dang lay danh sach tuyen, xe va chi tiet lich can chinh sua.</span>
          </div>
        ) : null}

        {error ? (
          <div className="empty-state-card">
            <strong>Khong tai duoc thong tin lich chay</strong>
            <span>{error}</span>
            <button type="button" onClick={reload}>
              Thu tai lai
            </button>
          </div>
        ) : null}

        {!loading && !error ? (
          <form className="editor-stack" onSubmit={handleSubmit}>
            {selectedSchedule ? (
              <div className="schedule-editor-summary">
                <div>
                  <span>Lich hien tai</span>
                  <strong>#{selectedSchedule.id} - {selectedSchedule.routeName}</strong>
                </div>
                <div>
                  <span>Gio chay</span>
                  <strong>{formatScheduleTime(selectedSchedule.departureTime)}</strong>
                </div>
                <div>
                  <span>Hieu luc</span>
                  <strong>
                    {formatScheduleDate(selectedSchedule.startDate, 'Chua co')}
                    {' '}den{' '}
                    {formatScheduleDate(selectedSchedule.endDate, 'Khong gioi han')}
                  </strong>
                </div>
              </div>
            ) : null}

            <div className="schedule-form-grid">
              <label className="filter-field">
                <span>Tuyen xe</span>
                <select
                  value={form.routeId}
                  onChange={(event) => updateForm('routeId', event.target.value)}
                  required
                >
                  <option value="">Chon tuyen</option>
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
                  <option value="">Chon xe</option>
                  {vehicleSelectOptions.map((vehicle) => (
                    <option key={vehicle.value} value={vehicle.value}>
                      {vehicle.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="filter-field">
                <span>Gio khoi hanh</span>
                <input
                  className="form-input"
                  type="time"
                  value={form.departureTime}
                  onChange={(event) => updateForm('departureTime', event.target.value)}
                  required
                />
              </label>

              <label className="filter-field">
                <span>Trang thai</span>
                <select
                  value={form.status}
                  onChange={(event) => updateForm('status', event.target.value)}
                >
                  <option value="1">Dang hoat dong</option>
                  <option value="0">Ngung hoat dong</option>
                </select>
              </label>
            </div>

            <div className="schedule-form-grid schedule-form-grid-compact">
              <label className="filter-field">
                <span>Ngay bat dau</span>
                <input
                  className="form-input"
                  type="date"
                  value={form.startDate}
                  onChange={(event) => updateForm('startDate', event.target.value)}
                  required
                />
              </label>

              <label className="filter-field">
                <span>Ngay ket thuc</span>
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
                Dat lai
              </button>
              <button type="submit" className="auth-submit" disabled={submitting}>
                {submitting ? 'Dang luu...' : isEditing ? 'Luu thay doi' : 'Tao lich'}
              </button>
            </div>
          </form>
        ) : null}
      </article>
    </div>
  );
}

export default ScheduleEditorPage;
