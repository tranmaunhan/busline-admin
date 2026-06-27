import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { adminApi } from '../api/adminApi';
import { useAdminResource } from '../hooks/useAdminResource';
import {
  formatScheduleDate,
  formatScheduleTime,
  getLocalDateValue,
  groupSchedulesBySlot,
  isActiveSchedule,
} from '../utils/scheduleUtils';

function SchedulePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [generateForm, setGenerateForm] = useState(() => ({
    fromDate: getLocalDateValue(),
    toDate: getLocalDateValue(),
  }));
  const [generating, setGenerating] = useState(false);
  const [deletingScheduleId, setDeletingScheduleId] = useState(null);
  const [scheduleFeedback, setScheduleFeedback] = useState('');
  const [scheduleError, setScheduleError] = useState('');
  const [generateError, setGenerateError] = useState('');
  const [lastGeneration, setLastGeneration] = useState(null);
  const [singleGenerateDates, setSingleGenerateDates] = useState({});

  const { data, loading, error, reload } = useAdminResource(
    (signal) => adminApi.getTripSchedules({ signal }),
    [],
  );

  const tripSchedules = data ?? [];
  const timetableColumns = useMemo(
    () => groupSchedulesBySlot(tripSchedules),
    [tripSchedules],
  );
  const activeScheduleCount = tripSchedules.filter(isActiveSchedule).length;
  const hasVisibleSchedules = timetableColumns.some((column) => column.schedules.length > 0);

  useEffect(() => {
    if (!location.state?.feedbackMessage) {
      return;
    }

    setScheduleFeedback(location.state.feedbackMessage);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!tripSchedules.length) {
      return;
    }

    setSingleGenerateDates((current) => {
      const next = { ...current };
      let changed = false;

      tripSchedules.forEach((schedule) => {
        if (!next[schedule.id]) {
          next[schedule.id] = getLocalDateValue();
          changed = true;
        }
      });

      return changed ? next : current;
    });
  }, [tripSchedules]);

  async function handleDeleteSchedule(schedule) {
    const confirmed = window.confirm(`Bạn có chắc muốn xóa lịch #${schedule.id} không?`);
    if (!confirmed) {
      return;
    }

    setDeletingScheduleId(schedule.id);
    setScheduleFeedback('');
    setScheduleError('');

    try {
      await adminApi.deleteTripSchedule(schedule.id);
      setScheduleFeedback('Đã xóa lịch chạy mẫu thành công.');
      reload();
    } catch (deleteError) {
      setScheduleError(deleteError.message || 'Không xóa được lịch chạy mẫu.');
    } finally {
      setDeletingScheduleId(null);
    }
  }

  async function handleGenerate(payload) {
    setGenerating(true);
    setGenerateError('');
    setScheduleFeedback('');

    try {
      const result = await adminApi.generateTripsFromSchedules(payload);
      setLastGeneration(result);
      setScheduleFeedback(`Đã xử lý ${result.schedulesProcessed} lịch và tạo ${result.tripsCreated} chuyến.`);
      reload();
    } catch (submitError) {
      setGenerateError(submitError.message || 'Không sinh được chuyến xe.');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="page-stack">
      <article className="data-card schedule-page-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Lịch chạy</p>
            <h3>Thời khóa biểu lịch chạy mẫu</h3>
          </div>

          <div className="editor-actions">
            <button
              type="button"
              className="auth-submit"
              onClick={() => navigate('/lich-chay/tao-moi')}
            >
              Tạo mới
            </button>
          </div>
        </div>

        <div className="schedule-generator-card">
          <div>
            <strong>Sinh chuyến từ lịch</strong>
            <span>
              Chọn khoảng ngày để sinh `Trips` từ các lịch đang hoạt động. Hệ thống sẽ bỏ qua những chuyến đã tồn tại.
            </span>
          </div>

          <div className="schedule-generator-controls">
            <label className="filter-field">
              <span>Từ ngày</span>
              <input
                className="form-input"
                type="date"
                value={generateForm.fromDate}
                onChange={(event) => setGenerateForm((current) => ({ ...current, fromDate: event.target.value }))}
              />
            </label>

            <label className="filter-field">
              <span>Đến ngày</span>
              <input
                className="form-input"
                type="date"
                value={generateForm.toDate}
                onChange={(event) => setGenerateForm((current) => ({ ...current, toDate: event.target.value }))}
              />
            </label>

            <button
              type="button"
              className="auth-submit"
              disabled={generating}
              onClick={() => handleGenerate({
                fromDate: generateForm.fromDate,
                toDate: generateForm.toDate,
                scheduleIds: [],
              })}
            >
              {generating ? 'Đang sinh chuyến...' : 'Sinh tất cả lịch đang hoạt động'}
            </button>
          </div>
        </div>

        <div className="schedule-summary-strip" aria-label="Tổng quan lịch chạy mẫu">
          <span>{timetableColumns.length} khung giờ</span>
          <span>{activeScheduleCount} lịch hoạt động</span>
          <span>{tripSchedules.length} lịch mẫu</span>
        </div>

        {scheduleFeedback ? (
          <div className="success-banner">
            <strong>{scheduleFeedback}</strong>
          </div>
        ) : null}

        {scheduleError ? <div className="auth-error">{scheduleError}</div> : null}
        {generateError ? <div className="auth-error">{generateError}</div> : null}

        {loading ? (
          <div className="empty-state-card">
            <strong>Đang tải lịch chạy mẫu...</strong>
            <span>Hệ thống đang đọc dữ liệu lịch chạy và thông tin xe/tuyến.</span>
          </div>
        ) : null}

        {error ? (
          <div className="empty-state-card">
            <strong>Không tải được lịch chạy mẫu</strong>
            <span>{error}</span>
            <button type="button" onClick={reload}>
              Thử tải lại
            </button>
          </div>
        ) : null}

        {!loading && !error ? (
          hasVisibleSchedules ? (
            <div className="timetable-grid full-width">
              {timetableColumns.map((column) => (
                <section className="timetable-column" key={column.slot}>
                  <div className="timetable-head">
                    <strong>{column.slot}</strong>
                    <span>{column.subtitle}</span>
                  </div>

                  <div className="timetable-list">
                    {column.schedules.length > 0 ? (
                      column.schedules.map((schedule) => (
                        <article className="timetable-item detailed booking-trip-card schedule-template-card" key={schedule.id}>
                          <div className="timetable-topline">
                            <div>
                              <div className="timetable-time">{formatScheduleTime(schedule.departureTime)}</div>
                              <small className="dropoff-time">Lịch #{schedule.id}</small>
                            </div>

                            <span className={`mini-status${isActiveSchedule(schedule) ? '' : ' expired'}`}>
                              {schedule.statusLabel}
                            </span>
                          </div>

                          <div className="timetable-route">
                            <strong>{schedule.routeName}</strong>
                            <small>{schedule.vehicleLabel}</small>
                          </div>

                          <div className="timetable-meta">
                            <div>
                              <span>Ngày bắt đầu</span>
                              <strong>{formatScheduleDate(schedule.startDate, 'Chưa có')}</strong>
                            </div>
                            <div>
                              <span>Ngày kết thúc</span>
                              <strong>{formatScheduleDate(schedule.endDate, 'Không giới hạn')}</strong>
                            </div>
                          </div>

                          <div className="schedule-template-actions">
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => navigate(`/lich-chay/${schedule.id}/chinh-sua`)}
                            >
                              Sửa thông tin
                            </button>

                            <label className="filter-field schedule-inline-date">
                              <span>Ngày cần sinh</span>
                              <input
                                className="form-input"
                                type="date"
                                value={singleGenerateDates[schedule.id] ?? getLocalDateValue()}
                                onChange={(event) => setSingleGenerateDates((current) => ({
                                  ...current,
                                  [schedule.id]: event.target.value,
                                }))}
                              />
                            </label>

                            <button
                              type="button"
                              onClick={() => handleGenerate({
                                fromDate: singleGenerateDates[schedule.id] ?? getLocalDateValue(),
                                toDate: singleGenerateDates[schedule.id] ?? getLocalDateValue(),
                                scheduleIds: [schedule.id],
                              })}
                              disabled={generating}
                            >
                              Sinh 1 ngày
                            </button>

                            <button
                              type="button"
                              className="danger-button"
                              onClick={() => handleDeleteSchedule(schedule)}
                              disabled={deletingScheduleId === schedule.id}
                            >
                              {deletingScheduleId === schedule.id ? 'Đang xóa...' : 'Xóa'}
                            </button>
                          </div>
                        </article>
                      ))
                    ) : (
                      <div className="empty-slot">Không có lịch nào trong khung giờ này.</div>
                    )}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="empty-state-card">
              <strong>Chưa có lịch chạy mẫu nào được tạo</strong>
              <span>Nhấn nút `Tạo mới` để cấu hình lịch mới cho tuyến và xe.</span>
            </div>
          )
        ) : null}
      </article>

      {lastGeneration?.createdTrips?.length ? (
        <article className="data-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Chuyến vừa sinh</p>
              <h3>Kết quả lần chạy lịch gần nhất</h3>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Lịch</th>
                  <th>Trip ID</th>
                  <th>Tuyến</th>
                  <th>Xe</th>
                  <th>Khởi hành</th>
                  <th>Số ghế</th>
                </tr>
              </thead>
              <tbody>
                {lastGeneration.createdTrips.map((trip) => (
                  <tr key={`${trip.scheduleId}-${trip.tripId}`}>
                    <td>{trip.scheduleId}</td>
                    <td>{trip.tripId}</td>
                    <td>{trip.routeName}</td>
                    <td>{trip.vehicleLabel}</td>
                    <td>{trip.departureTime}</td>
                    <td>{trip.generatedSeats}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {lastGeneration.skippedReasons?.length ? (
            <ul className="notes-list">
              {lastGeneration.skippedReasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ) : null}
        </article>
      ) : null}
    </div>
  );
}

export default SchedulePage;
