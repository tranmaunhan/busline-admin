import { useState } from 'react';
import { adminApi } from '../api/adminApi';
import { useAdminResource } from '../hooks/useAdminResource';

function getLocalDateValue() {
  const now = new Date();
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0, 10);
}

function TripTimetableBrowser({
  eyebrow = 'Thời khóa biểu chuyến đã sinh',
  title = 'Xem lịch xe theo từng ngày và từng khung giờ',
  description = 'Hiển thị giờ chạy, tuyến, số ghế trống và biển số xe cho từng chuyến.',
}) {
  const [selectedDate, setSelectedDate] = useState(getLocalDateValue);
  const [selectedOrigin, setSelectedOrigin] = useState('all');
  const [selectedDestination, setSelectedDestination] = useState('all');

  const { data, loading, error, reload } = useAdminResource(
    (signal) =>
      adminApi.getSchedule({
        date: selectedDate,
        originId: selectedOrigin === 'all' ? undefined : selectedOrigin,
        destinationId: selectedDestination === 'all' ? undefined : selectedDestination,
        signal,
      }),
    [selectedDate, selectedOrigin, selectedDestination],
  );

  const hasVisibleTrips = (data?.columns ?? []).some((column) => column.trips.length > 0);

  return (
    <article className="data-card schedule-page-card">
      <div className="schedule-toolbar">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h3>{title}</h3>
          <p className="section-note">{description}</p>
        </div>

        <div className="date-selector" role="tablist" aria-label="Chọn ngày xem lịch">
          {(data?.days ?? []).map((day) => (
            <button
              key={day.id}
              type="button"
              className={`date-pill${day.id === selectedDate ? ' active' : ''}`}
              onClick={() => setSelectedDate(day.id)}
            >
              <span>{day.label}</span>
              <small>{day.dateText}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="route-filter-bar">
        <label className="filter-field">
          <span>Điểm đi</span>
          <select value={selectedOrigin} onChange={(event) => setSelectedOrigin(event.target.value)}>
            <option value="all">Tất cả điểm đi</option>
            {(data?.locations ?? []).map((location) => (
              <option key={`origin-${location.id}`} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-field">
          <span>Điểm đến</span>
          <select
            value={selectedDestination}
            onChange={(event) => setSelectedDestination(event.target.value)}
          >
            <option value="all">Tất cả điểm đến</option>
            {(data?.locations ?? []).map((location) => (
              <option key={`destination-${location.id}`} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="clear-filter-button"
          onClick={() => {
            setSelectedOrigin('all');
            setSelectedDestination('all');
          }}
        >
          Xóa lọc
        </button>
      </div>

      {loading ? (
        <div className="empty-state-card">
          <strong>Đang tải lịch chạy...</strong>
          <span>Hệ thống đang tổng hợp dữ liệu chuyến xe theo ngày đã chọn.</span>
        </div>
      ) : null}

      {error ? (
        <div className="empty-state-card">
          <strong>Không tải được lịch chạy</strong>
          <span>{error}</span>
          <button type="button" onClick={reload}>
            Thử tải lại
          </button>
        </div>
      ) : null}

      {!loading && !error && data ? (
        <>
          <div className="selected-day-banner">
            <strong>{data.heading}</strong>
            <span>{data.summary}</span>
          </div>

          {hasVisibleTrips ? (
            <div className="timetable-grid full-width">
              {data.columns.map((column) => (
                <section className="timetable-column" key={column.slot}>
                  <div className="timetable-head">
                    <strong>{column.slot}</strong>
                    <span>{column.subtitle}</span>
                  </div>

                  <div className="timetable-list">
                    {column.trips.length > 0 ? (
                      column.trips.map((trip) => (
                        <article
                          className="timetable-item detailed"
                          key={`${column.slot}-${trip.tripId}`}
                        >
                          <div className="timetable-topline">
                            <div className="timetable-time">{trip.time}</div>
                            <span className="mini-status">{trip.emptySeats} ghế trống</span>
                          </div>

                          <div className="timetable-route">
                            <strong>
                              {trip.origin} - {trip.destination}
                            </strong>
                          </div>

                          <div className="timetable-meta">
                            <div>
                              <span>Biển số xe</span>
                              <strong>{trip.plate}</strong>
                            </div>
                            <div>
                              <span>Ghế còn trống</span>
                              <strong>{trip.emptySeats}</strong>
                            </div>
                          </div>
                        </article>
                      ))
                    ) : (
                      <div className="empty-slot">Không có chuyến phù hợp trong khung giờ này.</div>
                    )}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="empty-state-card">
              <strong>Không tìm thấy chuyến phù hợp</strong>
              <span>Hãy đổi bộ lọc điểm đi/điểm đến để xem các chuyến khác.</span>
            </div>
          )}
        </>
      ) : null}
    </article>
  );
}

export default TripTimetableBrowser;
