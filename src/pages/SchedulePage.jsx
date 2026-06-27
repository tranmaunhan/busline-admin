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
    const confirmed = window.confirm(`Ban co chac muon xoa lich #${schedule.id} khong?`);
    if (!confirmed) {
      return;
    }

    setDeletingScheduleId(schedule.id);
    setScheduleFeedback('');
    setScheduleError('');

    try {
      await adminApi.deleteTripSchedule(schedule.id);
      setScheduleFeedback('Da xoa lich chay mau thanh cong.');
      reload();
    } catch (deleteError) {
      setScheduleError(deleteError.message || 'Khong xoa duoc lich chay mau.');
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
      setScheduleFeedback(`Da xu ly ${result.schedulesProcessed} lich va tao ${result.tripsCreated} chuyen.`);
      reload();
    } catch (submitError) {
      setGenerateError(submitError.message || 'Khong sinh duoc chuyen xe.');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="page-stack">
      <article className="data-card schedule-page-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Lich chay</p>
            <h3>Thoi khoa bieu lich chay mau</h3>
            <p className="section-note">
              Xem nhanh lich theo khung gio, chon sua de cap nhat thong tin lich hoac xoa lich khong con su dung.
            </p>
          </div>

          <div className="editor-actions">
            <button
              type="button"
              className="auth-submit"
              onClick={() => navigate('/lich-chay/tao-moi')}
            >
              Tao moi
            </button>
          </div>
        </div>

        <div className="schedule-generator-card">
          <div>
            <strong>Sinh chuyen tu lich</strong>
            <span>
              Chon khoang ngay de sinh `Trips` tu cac lich dang hoat dong. He thong se bo qua nhung chuyen da ton tai.
            </span>
          </div>

          <div className="schedule-generator-controls">
            <label className="filter-field">
              <span>Tu ngay</span>
              <input
                className="form-input"
                type="date"
                value={generateForm.fromDate}
                onChange={(event) => setGenerateForm((current) => ({ ...current, fromDate: event.target.value }))}
              />
            </label>

            <label className="filter-field">
              <span>Den ngay</span>
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
              {generating ? 'Dang sinh chuyen...' : 'Sinh tat ca lich dang hoat dong'}
            </button>
          </div>
        </div>

        <div className="schedule-summary-strip" aria-label="Tong quan lich chay mau">
          <span>{timetableColumns.length} khung gio</span>
          <span>{activeScheduleCount} lich hoat dong</span>
          <span>{tripSchedules.length} lich mau</span>
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
            <strong>Dang tai lich chay mau...</strong>
            <span>He thong dang doc du lieu lich chay va thong tin xe/tuyen.</span>
          </div>
        ) : null}

        {error ? (
          <div className="empty-state-card">
            <strong>Khong tai duoc lich chay mau</strong>
            <span>{error}</span>
            <button type="button" onClick={reload}>
              Thu tai lai
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
                              <small className="dropoff-time">Lich #{schedule.id}</small>
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
                              <span>Ngay bat dau</span>
                              <strong>{formatScheduleDate(schedule.startDate, 'Chua co')}</strong>
                            </div>
                            <div>
                              <span>Ngay ket thuc</span>
                              <strong>{formatScheduleDate(schedule.endDate, 'Khong gioi han')}</strong>
                            </div>
                          </div>

                          <div className="schedule-template-actions">
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => navigate(`/lich-chay/${schedule.id}/chinh-sua`)}
                            >
                              Sua thong tin
                            </button>

                            <label className="filter-field schedule-inline-date">
                              <span>Ngay can sinh</span>
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
                              Sinh 1 ngay
                            </button>

                            <button
                              type="button"
                              className="danger-button"
                              onClick={() => handleDeleteSchedule(schedule)}
                              disabled={deletingScheduleId === schedule.id}
                            >
                              {deletingScheduleId === schedule.id ? 'Dang xoa...' : 'Xoa'}
                            </button>
                          </div>
                        </article>
                      ))
                    ) : (
                      <div className="empty-slot">Khong co lich nao trong khung gio nay.</div>
                    )}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="empty-state-card">
              <strong>Chua co lich chay mau nao duoc tao</strong>
              <span>Nhan nut `Tao moi` de cau hinh lich moi cho tuyen va xe.</span>
            </div>
          )
        ) : null}
      </article>

      {lastGeneration?.createdTrips?.length ? (
        <article className="data-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Chuyen vua sinh</p>
              <h3>Ket qua lan chay lich gan nhat</h3>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Lich</th>
                  <th>Trip ID</th>
                  <th>Tuyen</th>
                  <th>Xe</th>
                  <th>Khoi hanh</th>
                  <th>So ghe</th>
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
