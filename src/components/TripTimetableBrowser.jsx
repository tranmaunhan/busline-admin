import { useMemo, useState } from 'react';
import { adminApi, publicApi } from '../api/adminApi';
import { useAdminResource } from '../hooks/useAdminResource';

const TIME_SLOTS = [
  { slot: 'Sang', subtitle: '00:00 - 10:59', from: 0, to: 10 },
  { slot: 'Trua', subtitle: '11:00 - 13:59', from: 11, to: 13 },
  { slot: 'Chieu', subtitle: '14:00 - 17:59', from: 14, to: 17 },
  { slot: 'Toi', subtitle: '18:00 - 23:59', from: 18, to: 23 },
];

function getLocalDateValue(date = new Date()) {
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0, 10);
}

function formatDateText(date) {
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  });
}

function formatDateHeading(dateText) {
  const date = new Date(`${dateText}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateText;
  }

  return date.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatCurrency(value) {
  return new Intl.NumberFormat('vi-VN', {
    currency: 'VND',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(Number(value || 0));
}

function formatTime(value) {
  if (!value) {
    return '--:--';
  }

  const date = new Date(value);

  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return String(value).slice(0, 5);
}

function formatDuration(minutes) {
  const safeMinutes = Number(minutes || 0);

  if (!safeMinutes) {
    return 'Chua ro';
  }

  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;

  if (!hours) {
    return `${remainingMinutes} phut`;
  }

  if (!remainingMinutes) {
    return `${hours} gio`;
  }

  return `${hours} gio ${remainingMinutes} phut`;
}

function buildDateOptions(totalDays = 21) {
  const today = new Date();

  return Array.from({ length: totalDays }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    const id = getLocalDateValue(date);

    return {
      id,
      label: index === 0 ? 'Hom nay' : index === 1 ? 'Ngay mai' : date.toLocaleDateString('vi-VN', { weekday: 'short' }),
      dateText: formatDateText(date),
    };
  });
}

function getTripStartAt(trip, selectedDate) {
  if (trip.pickupTime || trip.departureTime) {
    const date = new Date(trip.pickupTime || trip.departureTime);

    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  if (trip.time) {
    const date = new Date(`${selectedDate}T${String(trip.time).slice(0, 5)}:00`);

    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
}

function isPastTrip(trip, selectedDate) {
  const startAt = getTripStartAt(trip, selectedDate);

  if (!startAt) {
    return false;
  }

  return startAt.getTime() <= Date.now();
}

function getHourFromTrip(trip) {
  const startAt = getTripStartAt(trip);

  if (startAt) {
    return startAt.getHours();
  }

  const hour = Number(String(trip.time || '0').slice(0, 2));
  return Number.isFinite(hour) ? hour : 0;
}

function normalizeSearchTrip(trip) {
  return {
    tripId: trip.tripId,
    time: formatTime(trip.pickupTime || trip.departureTime),
    dropoffTimeText: formatTime(trip.dropoffTime),
    originId: trip.pickupLocationId ?? trip.originId ?? null,
    origin: trip.pickupLocationName || trip.routeOrigin,
    destinationId: trip.dropoffLocationId ?? trip.destinationId ?? null,
    destination: trip.dropoffLocationName || trip.routeDestination,
    routeName: `${trip.routeOrigin} - ${trip.routeDestination}`,
    emptySeats: Number(trip.availableSeats || 0),
    plate: trip.licensePlate || 'Dang cap nhat',
    vehicleType: trip.vehicleType,
    price: trip.price,
    duration: trip.segmentDurationMinutes,
    pickupTime: trip.pickupTime,
    departureTime: trip.departureTime,
    dropoffTime: trip.dropoffTime,
  };
}

function groupSearchTripsBySlot(trips) {
  return TIME_SLOTS.map((slot) => ({
    slot: slot.slot,
    subtitle: slot.subtitle,
    trips: trips
      .filter((trip) => {
        const hour = getHourFromTrip(trip);
        return hour >= slot.from && hour <= slot.to;
      })
      .sort((left, right) => {
        const leftDate = getTripStartAt(left)?.getTime() ?? 0;
        const rightDate = getTripStartAt(right)?.getTime() ?? 0;
        return leftDate - rightDate;
      }),
  }));
}

function normalizeSearchPayload({ selectedDate, locations, trips }) {
  const normalizedTrips = trips.map(normalizeSearchTrip);

  return {
    selectedDate,
    heading: `Lich dat ve ${formatDateHeading(selectedDate)}`,
    summary: `${normalizedTrips.length} chuyen phu hop voi diem don/tra da chon.`,
    days: buildDateOptions(),
    locations,
    columns: groupSearchTripsBySlot(normalizedTrips),
    source: 'public-search',
  };
}

function LockIcon() {
  return (
    <svg aria-hidden="true" className="trip-lock-icon" viewBox="0 0 24 24">
      <path
        d="M8 10V7.8C8 5.1 9.7 3.5 12 3.5s4 1.6 4 4.3V10m-9.2 0h10.4c.7 0 1.3.6 1.3 1.3v7.1c0 .7-.6 1.3-1.3 1.3H6.8c-.7 0-1.3-.6-1.3-1.3v-7.1c0-.7.6-1.3 1.3-1.3Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function TripTimetableBrowser({
  eyebrow = 'Thoi khoa bieu chuyen da sinh',
  title = 'Xem lich xe theo tung ngay va tung khung gio',
  description = 'Hien thi gio chay, tuyen, so ghe trong va bien so xe cho tung chuyen.',
  onSelectTrip,
}) {
  const dateOptions = useMemo(() => buildDateOptions(), []);
  const [selectedDate, setSelectedDate] = useState(getLocalDateValue);
  const [selectedOrigin, setSelectedOrigin] = useState('all');
  const [selectedDestination, setSelectedDestination] = useState('all');

  const canSearchBySegment =
    selectedOrigin !== 'all'
    && selectedDestination !== 'all'
    && selectedOrigin !== selectedDestination;

  const { data, loading, error, reload } = useAdminResource(
    async (signal) => {
      if (canSearchBySegment) {
        const [locations, trips] = await Promise.all([
          publicApi.getLocations({ signal }),
          publicApi.searchTrips({
            pickupLocationId: selectedOrigin,
            dropoffLocationId: selectedDestination,
            departureDate: selectedDate,
            signal,
          }),
        ]);

        return normalizeSearchPayload({ selectedDate, locations, trips });
      }

      const schedule = await adminApi.getSchedule({
        date: selectedDate,
        originId: selectedOrigin === 'all' ? undefined : selectedOrigin,
        destinationId: selectedDestination === 'all' ? undefined : selectedDestination,
        signal,
      });

      return {
        ...schedule,
        days: dateOptions,
        source: 'admin-schedule',
      };
    },
    [selectedDate, selectedOrigin, selectedDestination],
  );

  const hasVisibleTrips = (data?.columns ?? []).some((column) => column.trips.length > 0);
  const isSameLocation = selectedOrigin !== 'all' && selectedOrigin === selectedDestination;

  return (
    <article className="data-card schedule-page-card">
      <div className="schedule-toolbar">
        <label className="date-input-field">
          <span>Chon ngay</span>
          <input
            type="date"
            value={selectedDate}
            min={getLocalDateValue()}
            onChange={(event) => setSelectedDate(event.target.value)}
          />
        </label>
      </div>

      <div className="date-selector scrollable" role="tablist" aria-label="Chon ngay xem lich">
        {dateOptions.map((day) => (
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

      <div className="route-filter-bar">
        <label className="filter-field">
          <span>Diem di</span>
          <select value={selectedOrigin} onChange={(event) => setSelectedOrigin(event.target.value)}>
            <option value="all">Tat ca diem di</option>
            {(data?.locations ?? []).map((location) => (
              <option key={`origin-${location.id}`} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-field">
          <span>Diem den</span>
          <select
            value={selectedDestination}
            onChange={(event) => setSelectedDestination(event.target.value)}
          >
            <option value="all">Tat ca diem den</option>
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
          Xoa loc
        </button>
      </div>

      {canSearchBySegment ? (
        <div className="selected-day-banner segment-search-banner">
          <strong>Tim theo diem doc tuyen</strong>
          <span>Dang dung API dat ve cua trang nguoi dung de tim dung chang don/tra.</span>
        </div>
      ) : null}

      {isSameLocation ? (
        <div className="empty-state-card">
          <strong>Diem di va diem den khong duoc trung nhau</strong>
          <span>Chon hai diem khac nhau de tim chuyen dat ve.</span>
        </div>
      ) : null}

      {loading ? (
        <div className="empty-state-card">
          <strong>Dang tai lich chay...</strong>
          <span>He thong dang tong hop du lieu chuyen xe theo ngay da chon.</span>
        </div>
      ) : null}

      {error ? (
        <div className="empty-state-card">
          <strong>Khong tai duoc lich chay</strong>
          <span>{error}</span>
          <button type="button" onClick={reload}>
            Thu tai lai
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
                      column.trips.map((trip) => {
                        const isExpired = isPastTrip(trip, selectedDate);
                        const isSoldOut = Number(trip.emptySeats || 0) <= 0;
                        const disabled = isExpired || isSoldOut;
                        const handleSelectTrip = () => {
                          if (disabled) {
                            return;
                          }

                          onSelectTrip?.(trip, {
                            selectedDate,
                            selectedOrigin,
                            selectedDestination,
                          });
                        };

                        return (
                          <article
                            className={`timetable-item detailed booking-trip-card${isExpired ? ' is-expired' : ''}${isSoldOut ? ' is-sold-out' : ''}`}
                            key={`${column.slot}-${trip.tripId}`}
                            aria-disabled={disabled}
                            onClick={handleSelectTrip}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                handleSelectTrip();
                              }
                            }}
                            role="button"
                            tabIndex={disabled ? -1 : 0}
                          >
                            <div className="timetable-topline">
                              <div>
                                <div className="timetable-time">{trip.time}</div>
                                {trip.dropoffTimeText ? (
                                  <small className="dropoff-time">Den {trip.dropoffTimeText}</small>
                                ) : null}
                              </div>

                              <span className={`mini-status${isExpired ? ' expired' : ''}`}>
                                {isExpired ? (
                                  <>
                                    <LockIcon />
                                    Da qua gio
                                  </>
                                ) : (
                                  `${trip.emptySeats} ghe trong`
                                )}
                              </span>
                            </div>

                            <div className="timetable-route">
                              <strong>
                                {trip.origin} - {trip.destination}
                              </strong>
                              {trip.routeName ? <small>Tuyen goc: {trip.routeName}</small> : null}
                            </div>

                            <div className="timetable-meta">
                              <div>
                                <span>Bien so xe</span>
                                <strong>{trip.plate}</strong>
                              </div>
                              <div>
                                <span>{trip.price ? 'Gia ve' : 'Ghe con trong'}</span>
                                <strong>{trip.price ? formatCurrency(trip.price) : trip.emptySeats}</strong>
                              </div>
                              {trip.vehicleType ? (
                                <div>
                                  <span>Loai xe</span>
                                  <strong>{trip.vehicleType}</strong>
                                </div>
                              ) : null}
                              {trip.duration ? (
                                <div>
                                  <span>Thoi gian</span>
                                  <strong>{formatDuration(trip.duration)}</strong>
                                </div>
                              ) : null}
                            </div>

                            <button
                              type="button"
                              className="booking-trip-action"
                              disabled={disabled}
                              onClick={(event) => {
                                event.stopPropagation();
                                handleSelectTrip();
                              }}
                            >
                              {isExpired ? 'Khong the dat chuyen da qua gio' : isSoldOut ? 'Het ghe' : 'Chon chuyen'}
                            </button>
                          </article>
                        );
                      })
                    ) : (
                      <div className="empty-slot">Khong co chuyen phu hop trong khung gio nay.</div>
                    )}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="empty-state-card">
              <strong>Khong tim thay chuyen phu hop</strong>
              <span>Hay doi ngay hoac bo loc diem di/diem den de xem cac chuyen khac.</span>
            </div>
          )}
        </>
      ) : null}
    </article>
  );
}

export default TripTimetableBrowser;
