import { useMemo, useState } from 'react';
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

function formatScheduleTime(value) {
  if (!value) {
    return '--:--';
  }

  return String(value).slice(0, 5);
}

function formatScheduleDate(value, fallback = 'Không giới hạn') {
  if (!value) {
    return fallback;
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function isActiveSchedule(schedule) {
  return Number(schedule.status) === 1;
}

function createScheduleFormFromSchedule(schedule) {
  return {
    routeId: String(schedule.routeId ?? ''),
    vehicleId: String(schedule.vehicleId ?? ''),
    departureTime: formatScheduleTime(schedule.departureTime),
    startDate: schedule.startDate ?? getLocalDateValue(),
    endDate: schedule.endDate ?? '',
    status: String(schedule.status ?? 0),
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
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [deletingScheduleId, setDeletingScheduleId] = useState(null);
  const [scheduleFeedback, setScheduleFeedback] = useState('');
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

  const timetableRows = useMemo(() => {
    const groupedByTime = new Map();

    tripSchedules.forEach((schedule) => {
      const time = formatScheduleTime(schedule.departureTime);
      const currentGroup = groupedByTime.get(time) ?? [];

      currentGroup.push(schedule);
      groupedByTime.set(time, currentGroup);
    });

    return [...groupedByTime.entries()]
      .sort(([leftTime], [rightTime]) => leftTime.localeCompare(rightTime))
      .map(([time, schedules]) => ({
        time,
        schedules: schedules
          .slice()
          .sort((left, right) => `${left.routeName}-${left.vehicleLabel}`.localeCompare(
            `${right.routeName}-${right.vehicleLabel}`,
            'vi',
          )),
      }));
  }, [tripSchedules]);

  const activeScheduleCount = tripSchedules.filter(isActiveSchedule).length;

  function resetScheduleEditor() {
    setScheduleForm(createScheduleForm());
    setEditingScheduleId(null);
    setCreateError('');
    setScheduleFeedback('');
  }

  async function handleSaveSchedule(event) {
    event.preventDefault();
    setCreating(true);
    setCreateError('');
    setScheduleFeedback('');

    const isEditing = editingScheduleId !== null;

    try {
      const payload = {
        routeId: Number(scheduleForm.routeId),
        vehicleId: Number(scheduleForm.vehicleId),
        departureTime: scheduleForm.departureTime,
        startDate: scheduleForm.startDate,
        endDate: scheduleForm.endDate || null,
        status: Number(scheduleForm.status),
      };

      if (isEditing) {
        await adminApi.updateTripSchedule(editingScheduleId, payload);
      } else {
        await adminApi.createTripSchedule(payload);
      }

      setScheduleForm(createScheduleForm());
      setEditingScheduleId(null);
      setScheduleFeedback(isEditing ? 'Cap nhat lich chay thanh cong.' : 'Tao lich chay thanh cong.');
      reload();
    } catch (submitError) {
      setCreateError(submitError.message || 'Không tạo được lịch chạy.');
    } finally {
      setCreating(false);
    }
  }

  function handleEditSchedule(schedule) {
    setEditingScheduleId(schedule.id);
    setCreateError('');
    setScheduleFeedback('');
    setScheduleForm(createScheduleFormFromSchedule(schedule));
  }

  async function handleDeleteSchedule(schedule) {
    const confirmed = window.confirm(`Ban co chac muon xoa lich #${schedule.id}?`);

    if (!confirmed) {
      return;
    }

    setDeletingScheduleId(schedule.id);
    setCreateError('');
    setScheduleFeedback('');

    try {
      await adminApi.deleteTripSchedule(schedule.id);

      if (editingScheduleId === schedule.id) {
        setScheduleForm(createScheduleForm());
        setEditingScheduleId(null);
      }

      setScheduleFeedback('Da xoa lich chay mau thanh cong.');
      reload();
    } catch (deleteError) {
      setCreateError(deleteError.message || 'Khong xoa duoc lich chay mau.');
    } finally {
      setDeletingScheduleId(null);
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
        {/* <div className="schedule-toolbar">
          <div>
            <h3>Sắp xếp lịch trình </h3>
          </div>
        </div> */}

        <div className="schedule-workspace">
          <section className="schedule-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Tạo lịch</p>
                <h3>Cấu hình lịch hoạt động</h3>
              </div>
            </div>

            <form className="editor-stack" onSubmit={handleSaveSchedule}>
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

              {editingScheduleId ? (
                <div className="form-note">
                  Ban dang chinh sua lich da chon. Nhan nut luu de cap nhat thay doi.
                </div>
              ) : null}

              {scheduleFeedback ? (
                <div className="success-banner">
                  <strong>{scheduleFeedback}</strong>
                </div>
              ) : null}

              {createError ? <div className="auth-error">{createError}</div> : null}

              <div className="stack-actions">
                <button type="submit" className="auth-submit" disabled={creating}>
                  {creating ? 'Đang tạo lịch...' : 'Tạo lịch chạy'}
                </button>
                {editingScheduleId ? (
                  <button type="button" className="ghost-button" onClick={resetScheduleEditor} disabled={creating}>
                    Huy chinh sua
                  </button>
                ) : null}
              </div>
            </form>
          </section>

          <section className="schedule-panel schedule-panel-secondary">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Chạy lịch</p>
                <h3>Tạo chuyến xe</h3>
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
                Để đảm bảo độ ổn định của hệ thống vui lòng không thêm một lúc nhiều ngày liên tiếp
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
      <article className="data-card schedule-page-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Thời khóa biểu</p>
            <h3>Lịch chạy mẫu theo khung giờ</h3>
            <p className="section-note">
              Mỗi hàng là một giờ chạy; bên trong là các tuyến và xe đang được cấu hình cho khung giờ đó.
            </p>
          </div>
          <div className="schedule-summary-strip" aria-label="Tổng quan lịch chạy mẫu">
            <span>{timetableRows.length} khung giờ</span>
            <span>{activeScheduleCount} lịch hoạt động</span>
            <span>{tripSchedules.length} lịch mẫu</span>
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
          <div className="schedule-timetable-wrap">
            <table className="schedule-timetable">
              <thead>
                <tr>
                  <th>Giờ chạy</th>
                  <th>Tuyến và xe</th>
                  <th>Hiệu lực</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {timetableRows.map((row) => (
                  <tr key={row.time}>
                    <td className="schedule-time-cell">
                      <strong>{row.time}</strong>
                      <span>{row.schedules.length} lịch</span>
                    </td>
                    <td>
                      <div className="schedule-route-stack">
                        {row.schedules.map((schedule) => (
                          <div className="schedule-route-card" key={schedule.id}>
                            <div>
                              <strong>{schedule.routeName}</strong>
                              <span>{schedule.vehicleLabel}</span>
                            </div>
                            <small>#{schedule.id}</small>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="schedule-validity-stack">
                        {row.schedules.map((schedule) => (
                          <div key={`validity-${schedule.id}`} className="schedule-validity-item">
                            <span>{formatScheduleDate(schedule.startDate, 'Chưa có ngày bắt đầu')}</span>
                            <small>đến {formatScheduleDate(schedule.endDate)}</small>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="schedule-status-stack">
                        {row.schedules.map((schedule) => (
                          <span
                            className={`status-pill${isActiveSchedule(schedule) ? '' : ' inactive'}`}
                            key={`status-${schedule.id}`}
                          >
                            {schedule.statusLabel}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="schedule-action-stack">
                        {row.schedules.map((schedule) => (
                          <button
                            type="button"
                            key={`generate-${schedule.id}`}
                            disabled={generating}
                            onClick={() => handleGenerate({
                              fromDate: generateForm.fromDate,
                              toDate: generateForm.fromDate,
                              scheduleIds: [schedule.id],
                            })}
                          >
                            Sinh 1 ngày
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
                {timetableRows.length === 0 ? (
                  <tr>
                    <td colSpan="5">
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
