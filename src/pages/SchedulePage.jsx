import { useState } from 'react';
import { adminApi } from '../api/adminApi';
import { useAdminResource } from '../hooks/useAdminResource';

function getLocalDateValue() {
  const now = new Date();
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0, 10);
}

function createScheduleForm() {
  const today = getLocalDateValue();
  return {
    routeId: '',
    vehicleId: '',
    departureTime: '08:00',
    startDate: today,
    endDate: '',
    status: '1',
  };
}

function SchedulePage() {
  const [scheduleForm, setScheduleForm] = useState(createScheduleForm);
  const [generateForm, setGenerateForm] = useState(() => ({
    fromDate: getLocalDateValue(),
    toDate: getLocalDateValue(),
  }));
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [lastGeneration, setLastGeneration] = useState(null);

  const { data, loading, error, reload } = useAdminResource(
    async (signal) => {
      const [tripSchedules, routesPayload, fleetPayload] = await Promise.all([
        adminApi.getTripSchedules({ signal }),
        adminApi.getRoutes({ signal }),
        adminApi.getFleet({ signal }),
      ]);

      return {
        tripSchedules,
        routesPayload,
        fleetPayload,
      };
    },
    [],
  );

  const tripSchedules = data?.tripSchedules ?? [];
  const routeOptions = data?.routesPayload?.routes ?? [];
  const vehicleOptions = data?.fleetPayload?.vehicles ?? [];

  async function handleCreateSchedule(event) {
    event.preventDefault();
    setCreating(true);
    setCreateError('');

    try {
      await adminApi.createTripSchedule({
        routeId: Number(scheduleForm.routeId),
        vehicleId: Number(scheduleForm.vehicleId),
        departureTime: scheduleForm.departureTime,
        startDate: scheduleForm.startDate,
        endDate: scheduleForm.endDate || null,
        status: Number(scheduleForm.status),
      });

      setScheduleForm(createScheduleForm());
      reload();
    } catch (submitError) {
      setCreateError(submitError.message || 'Không tạo được lịch chạy.');
    } finally {
      setCreating(false);
    }
  }

  async function handleGenerate(payload) {
    setGenerating(true);
    setGenerateError('');

    try {
      const result = await adminApi.generateTripsFromSchedules(payload);
      setLastGeneration(result);
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
        <div className="schedule-toolbar">
          <div>
            <p className="eyebrow">Lịch chạy mẫu</p>
            <h3>Tạo lịch và sinh chuyến xe tự động</h3>

          </div>
        </div>

        <div className="schedule-workspace">
          <section className="schedule-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Tạo lịch</p>
                <h3>Cấu hình lịch chạy mẫu mới</h3>
              </div>
            </div>

            <form className="editor-stack" onSubmit={handleCreateSchedule}>
              <div className="schedule-form-grid">
                <label className="filter-field">
                  <span>Tuyến xe</span>
                  <select
                    value={scheduleForm.routeId}
                    onChange={(event) => setScheduleForm((current) => ({ ...current, routeId: event.target.value }))}
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
                    value={scheduleForm.vehicleId}
                    onChange={(event) => setScheduleForm((current) => ({ ...current, vehicleId: event.target.value }))}
                    required
                  >
                    <option value="">Chọn xe</option>
                    {vehicleOptions.map((vehicle) => (
                      <option key={vehicle.vehicleId} value={vehicle.vehicleId}>
                        {vehicle.code} - {vehicle.type}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="filter-field">
                  <span>Giờ khởi hành</span>
                  <input
                    className="form-input"
                    type="time"
                    value={scheduleForm.departureTime}
                    onChange={(event) => setScheduleForm((current) => ({ ...current, departureTime: event.target.value }))}
                    required
                  />
                </label>

                <label className="filter-field">
                  <span>Trạng thái</span>
                  <select
                    value={scheduleForm.status}
                    onChange={(event) => setScheduleForm((current) => ({ ...current, status: event.target.value }))}
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
                    value={scheduleForm.startDate}
                    onChange={(event) => setScheduleForm((current) => ({ ...current, startDate: event.target.value }))}
                    required
                  />
                </label>

                <label className="filter-field">
                  <span>Ngày kết thúc</span>
                  <input
                    className="form-input"
                    type="date"
                    value={scheduleForm.endDate}
                    onChange={(event) => setScheduleForm((current) => ({ ...current, endDate: event.target.value }))}
                  />
                </label>
              </div>

              {createError ? <div className="auth-error">{createError}</div> : null}

              <div className="stack-actions">
                <button type="submit" className="auth-submit" disabled={creating}>
                  {creating ? 'Đang tạo lịch...' : 'Tạo lịch chạy'}
                </button>
              </div>
            </form>
          </section>

          <section className="schedule-panel schedule-panel-secondary">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Chạy lịch</p>
                <h3>Sinh chuyến theo khoảng ngày</h3>
              </div>
            </div>

            <div className="editor-stack">
              <div className="schedule-form-grid schedule-form-grid-compact">
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
              </div>

              <div className="form-note">
                Hệ thống sẽ đối chiếu các lịch đang hoạt động trong khoảng ngày đã chọn và bỏ qua những chuyến đã tồn tại.
              </div>

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
                {generating ? 'Đang sinh chuyến...' : 'Sinh cho tất cả lịch đang hoạt động'}
              </button>

              {generateError ? <div className="auth-error">{generateError}</div> : null}

              {lastGeneration ? (
                <div className="success-banner">
                  <strong>
                    Đã tạo {lastGeneration.tripsCreated} chuyến, bỏ qua {lastGeneration.tripsSkipped} chuyến
                  </strong>
                  <span>
                    Xử lý {lastGeneration.schedulesProcessed} lịch trong khoảng {lastGeneration.fromDate} - {lastGeneration.toDate}
                  </span>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </article>

      <article className="data-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Danh sách lịch</p>
            <h3>Các lịch chạy mẫu hiện có</h3>
          </div>
        </div>

        {loading ? (
          <div className="empty-state-card">
            <strong>Đang tải lịch chạy mẫu...</strong>
            <span>Hệ thống đang đọc dữ liệu lịch chạy và cấu hình phương tiện.</span>
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
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tuyến</th>
                  <th>Xe</th>
                  <th>Giờ chạy</th>
                  <th>Áp dụng từ</th>
                  <th>Áp dụng đến</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {tripSchedules.map((schedule) => (
                  <tr key={schedule.id}>
                    <td>{schedule.id}</td>
                    <td>{schedule.routeName}</td>
                    <td>{schedule.vehicleLabel}</td>
                    <td>{schedule.departureTime}</td>
                    <td>{schedule.startDate}</td>
                    <td>{schedule.endDate || 'Không giới hạn'}</td>
                    <td>
                      <span className="status-pill">{schedule.statusLabel}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        disabled={generating}
                        onClick={() => handleGenerate({
                          fromDate: generateForm.fromDate,
                          toDate: generateForm.fromDate,
                          scheduleIds: [schedule.id],
                        })}
                      >
                        Sinh cho 1 ngày
                      </button>
                    </td>
                  </tr>
                ))}
                {tripSchedules.length === 0 ? (
                  <tr>
                    <td colSpan="8">
                      <div className="empty-slot">Chưa có lịch chạy mẫu nào được tạo.</div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
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
