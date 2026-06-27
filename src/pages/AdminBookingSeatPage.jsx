import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { adminApi } from '../api/adminApi';

const DEFAULT_PAYMENT_HOLD_HOURS = 24;

function formatCurrency(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDateTime(value) {
  if (!value) {
    return '--';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--';
  }

  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function toDateTimeLocalValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function parseDateTimeLocalValue(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function buildDefaultPaymentExpiryValue(departureTime) {
  if (departureTime) {
    const tripStartTime = new Date(departureTime);
    if (!Number.isNaN(tripStartTime.getTime())) {
      return toDateTimeLocalValue(tripStartTime);
    }
  }

  const fallbackExpiry = new Date(Date.now() + DEFAULT_PAYMENT_HOLD_HOURS * 60 * 60 * 1000);
  return toDateTimeLocalValue(fallbackExpiry);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getSeatStateClass(seat) {
  if (Number(seat.status) === 0) {
    return 'admin-seat-card available';
  }

  if (Number(seat.bookingStatus) === 1) {
    return 'admin-seat-card paid';
  }

  return 'admin-seat-card pending';
}

function resolveSeatStateLabel(seat) {
  if (Number(seat.status) === 0) {
    return 'Con trong';
  }

  if (Number(seat.bookingStatus) === 1) {
    return 'Da thanh toan';
  }

  return 'Cho thanh toan';
}

function resolveBookingStatusLabel(status) {
  return Number(status) === 1 ? 'Da thanh toan' : 'Cho thanh toan';
}

function createEmptyEditForm() {
  return {
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    note: '',
    paymentExpiryInput: '',
  };
}

function buildEditFormFromBooking(booking) {
  return {
    contactName: booking?.contactName || '',
    contactPhone: booking?.contactPhone || '',
    contactEmail: booking?.contactEmail || '',
    note: booking?.note || '',
    paymentExpiryInput: booking?.paymentExpiry
      ? buildDefaultPaymentExpiryValue(booking.paymentExpiry)
      : '',
  };
}

function AdminBookingSeatPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const tripId = Number(params.tripId);
  const initialTrip = location.state?.trip ?? null;

  const [seatMap, setSeatMap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedPickupId, setSelectedPickupId] = useState(initialTrip?.originId ? String(initialTrip.originId) : '');
  const [selectedDropoffId, setSelectedDropoffId] = useState(initialTrip?.destinationId ? String(initialTrip.destinationId) : '');
  const [selectedSeatIds, setSelectedSeatIds] = useState([]);
  const [activeDeck, setActiveDeck] = useState('LOWER');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [note, setNote] = useState('');
  const [paymentExpiryInput, setPaymentExpiryInput] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);
  const [inspectedSeatId, setInspectedSeatId] = useState(null);
  const [inspectedBookingId, setInspectedBookingId] = useState(null);
  const [bookingDetail, setBookingDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [editingBooking, setEditingBooking] = useState(false);
  const [editForm, setEditForm] = useState(createEmptyEditForm);
  const [adminActionLoading, setAdminActionLoading] = useState(false);
  const [adminActionError, setAdminActionError] = useState('');
  const [adminActionSuccess, setAdminActionSuccess] = useState('');

  useEffect(() => {
    if (!Number.isFinite(tripId)) {
      setError('Trip id khong hop le.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadSeatMap() {
      setLoading(true);
      setError('');

      try {
        const response = await adminApi.getTripBookingSeatMap(tripId, {
          pickupLocationId: selectedPickupId ? Number(selectedPickupId) : undefined,
          dropoffLocationId: selectedDropoffId ? Number(selectedDropoffId) : undefined,
        });

        if (cancelled) {
          return;
        }

        setSeatMap(response);

        if ((!selectedPickupId || !selectedDropoffId) && Array.isArray(response.stops) && response.stops.length > 1) {
          const stopIds = new Set(response.stops.map((stop) => String(stop.locationId)));
          const preferredPickupId = initialTrip?.originId && stopIds.has(String(initialTrip.originId))
            ? String(initialTrip.originId)
            : String(response.stops[0].locationId);
          const preferredDropoffId = initialTrip?.destinationId && stopIds.has(String(initialTrip.destinationId))
            ? String(initialTrip.destinationId)
            : String(response.stops[response.stops.length - 1].locationId);

          if (!selectedPickupId) {
            setSelectedPickupId(preferredPickupId);
          }

          if (!selectedDropoffId) {
            setSelectedDropoffId(preferredDropoffId);
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setSeatMap(null);
          setError(loadError.message || 'Khong tai duoc so do ghe admin.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSeatMap();

    return () => {
      cancelled = true;
    };
  }, [initialTrip?.destinationId, initialTrip?.originId, refreshKey, selectedDropoffId, selectedPickupId, tripId]);

  useEffect(() => {
    if (!seatMap?.seats?.length) {
      setActiveDeck('LOWER');
      return;
    }

    const deckOptions = [...new Set(seatMap.seats.map((seat) => seat.deck))];
    if (deckOptions.includes('LOWER')) {
      setActiveDeck('LOWER');
      return;
    }

    setActiveDeck(deckOptions[0]);
  }, [seatMap]);

  useEffect(() => {
    if (!seatMap?.departureTime) {
      return;
    }

    setPaymentExpiryInput((current) => current || buildDefaultPaymentExpiryValue(seatMap.departureTime));
  }, [seatMap?.departureTime]);

  useEffect(() => {
    if (!inspectedBookingId) {
      setBookingDetail(null);
      setDetailError('');
      setDetailLoading(false);
      setEditingBooking(false);
      setEditForm(createEmptyEditForm());
      return;
    }

    let cancelled = false;

    async function loadBookingDetail() {
      setDetailLoading(true);
      setDetailError('');

      try {
        const response = await adminApi.getBookingDetail(inspectedBookingId);
        if (cancelled) {
          return;
        }

        setBookingDetail(response);
        setEditForm(buildEditFormFromBooking(response));
      } catch (loadError) {
        if (!cancelled) {
          setBookingDetail(null);
          setDetailError(loadError.message || 'Khong tai duoc chi tiet booking.');
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    }

    loadBookingDetail();

    return () => {
      cancelled = true;
    };
  }, [inspectedBookingId, refreshKey]);

  useEffect(() => {
    if (!inspectedSeatId || !seatMap?.seats?.length) {
      return;
    }

    const matchedSeat = seatMap.seats.find((seat) => seat.tripSeatId === inspectedSeatId);
    if (!matchedSeat || Number(matchedSeat.status) === 0 || !matchedSeat.bookingId) {
      setInspectedSeatId(null);
      setInspectedBookingId(null);
      setBookingDetail(null);
      setEditingBooking(false);
      setAdminActionError('');
      setAdminActionSuccess('');
      return;
    }

    if (matchedSeat.bookingId !== inspectedBookingId) {
      setInspectedBookingId(matchedSeat.bookingId);
    }
  }, [inspectedBookingId, inspectedSeatId, seatMap]);

  const deckOptions = useMemo(() => {
    if (!seatMap?.seats?.length) {
      return [];
    }

    return [...new Set(seatMap.seats.map((seat) => seat.deck))];
  }, [seatMap]);

  const stopOrderById = useMemo(() => {
    const entries = (seatMap?.stops ?? []).map((stop) => [String(stop.locationId), Number(stop.stopOrder)]);
    return new Map(entries);
  }, [seatMap?.stops]);

  const filteredSeats = useMemo(() => (
    seatMap?.seats?.filter((seat) => seat.deck === activeDeck) ?? []
  ), [activeDeck, seatMap]);

  const selectedSeats = useMemo(() => (
    seatMap?.seats?.filter((seat) => selectedSeatIds.includes(seat.tripSeatId)) ?? []
  ), [seatMap, selectedSeatIds]);

  const inspectedSeat = useMemo(() => (
    seatMap?.seats?.find((seat) => seat.tripSeatId === inspectedSeatId) ?? null
  ), [inspectedSeatId, seatMap]);

  const hasSegmentPrice = seatMap?.segmentPrice !== null && seatMap?.segmentPrice !== undefined;
  const selectedTotalAmount = Number(seatMap?.segmentPrice || 0) * selectedSeats.length;
  const availableSeatCount = seatMap?.seats?.filter((seat) => Number(seat.status) === 0).length ?? 0;

  useEffect(() => {
    setSelectedSeatIds([]);
    setBookingResult(null);
    setSubmitError('');
  }, [selectedDropoffId, selectedPickupId]);

  const seatByPosition = new Map();
  let maxRow = 0;
  let maxCol = 0;

  filteredSeats.forEach((seat) => {
    seatByPosition.set(`${seat.rowIndex}-${seat.colIndex}`, seat);
    if (seat.rowIndex > maxRow) {
      maxRow = seat.rowIndex;
    }
    if (seat.colIndex > maxCol) {
      maxCol = seat.colIndex;
    }
  });

  function resetBookingInspection() {
    setInspectedSeatId(null);
    setInspectedBookingId(null);
    setBookingDetail(null);
    setDetailError('');
    setEditingBooking(false);
    setEditForm(createEmptyEditForm());
    setAdminActionError('');
    setAdminActionSuccess('');
  }

  function validateAdminBookingForm({ name, phone, email, paymentExpiryDate, departureTime }) {
    if (!name) {
      return 'Vui long nhap ten khach dat.';
    }

    if (!phone) {
      return 'Vui long nhap so dien thoai khach dat.';
    }

    if (!email) {
      return 'Vui long nhap email nhan ve dien tu.';
    }

    if (!isValidEmail(email)) {
      return 'Email nhan ve khong hop le.';
    }

    if (!paymentExpiryDate) {
      return 'Han thanh toan khong hop le.';
    }

    if (paymentExpiryDate.getTime() <= Date.now()) {
      return 'Han thanh toan phai lon hon thoi diem hien tai.';
    }

    if (departureTime && !Number.isNaN(departureTime.getTime()) && paymentExpiryDate.getTime() > departureTime.getTime()) {
      return 'Han thanh toan khong duoc sau gio khoi hanh.';
    }

    return '';
  }

  function handleSeatClick(seat) {
    if (Number(seat.status) === 0) {
      resetBookingInspection();
      setSelectedSeatIds((current) => (
        current.includes(seat.tripSeatId)
          ? current.filter((item) => item !== seat.tripSeatId)
          : [...current, seat.tripSeatId]
      ));
      return;
    }

    setSelectedSeatIds([]);
    setSubmitError('');
    setBookingResult(null);
    setInspectedSeatId(seat.tripSeatId);
    setInspectedBookingId(seat.bookingId || null);
    setAdminActionError('');
    setAdminActionSuccess('');
    setEditingBooking(false);
  }

  async function handleCreateBooking(event) {
    event.preventDefault();

    const trimmedName = contactName.trim();
    const trimmedPhone = contactPhone.trim();
    const trimmedEmail = contactEmail.trim();
    const trimmedNote = note.trim();
    const paymentExpiryDate = parseDateTimeLocalValue(paymentExpiryInput);
    const departureTime = seatMap?.departureTime ? new Date(seatMap.departureTime) : null;

    if (selectedSeatIds.length === 0) {
      setSubmitError('Can chon it nhat mot ghe trong so do.');
      return;
    }

    if (!selectedPickupId || !selectedDropoffId) {
      setSubmitError('Can chon day du diem don va diem tra.');
      return;
    }

    if (selectedPickupId === selectedDropoffId) {
      setSubmitError('Diem don va diem tra khong duoc giong nhau.');
      return;
    }

    const validationMessage = validateAdminBookingForm({
      name: trimmedName,
      phone: trimmedPhone,
      email: trimmedEmail,
      paymentExpiryDate,
      departureTime,
    });

    if (validationMessage) {
      setSubmitError(validationMessage);
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const response = await adminApi.createGuestBooking({
        tripId,
        tripSeatIds: selectedSeatIds,
        pickupLocationId: Number(selectedPickupId),
        dropoffLocationId: Number(selectedDropoffId),
        contactName: trimmedName,
        contactPhone: trimmedPhone,
        contactEmail: trimmedEmail,
        note: trimmedNote || null,
        paymentExpiry: paymentExpiryDate.toISOString(),
      });

      setBookingResult(response);
      setSelectedSeatIds([]);
      setNote('');
      setContactName('');
      setContactPhone('');
      setContactEmail('');
      setPaymentExpiryInput(buildDefaultPaymentExpiryValue(seatMap?.departureTime));
      setRefreshKey((current) => current + 1);
    } catch (submitBookingError) {
      setSubmitError(submitBookingError.message || 'Khong tao duoc booking guest.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveBookingUpdate() {
    if (!bookingDetail?.bookingId) {
      return;
    }

    const trimmedName = editForm.contactName.trim();
    const trimmedPhone = editForm.contactPhone.trim();
    const trimmedEmail = editForm.contactEmail.trim();
    const trimmedNote = editForm.note.trim();
    const paymentExpiryDate = parseDateTimeLocalValue(editForm.paymentExpiryInput);
    const departureTime = bookingDetail?.tripDepartureTime ? new Date(bookingDetail.tripDepartureTime) : null;

    const validationMessage = validateAdminBookingForm({
      name: trimmedName,
      phone: trimmedPhone,
      email: trimmedEmail,
      paymentExpiryDate,
      departureTime,
    });

    if (validationMessage) {
      setAdminActionError(validationMessage);
      return;
    }

    setAdminActionLoading(true);
    setAdminActionError('');
    setAdminActionSuccess('');

    try {
      const response = await adminApi.updateBooking(bookingDetail.bookingId, {
        contactName: trimmedName,
        contactPhone: trimmedPhone,
        contactEmail: trimmedEmail,
        note: trimmedNote || null,
        paymentExpiry: paymentExpiryDate.toISOString(),
      });

      setBookingDetail(response);
      setEditForm(buildEditFormFromBooking(response));
      setEditingBooking(false);
      setAdminActionSuccess(`Da cap nhat booking ${response.bookingCode}.`);
      setRefreshKey((current) => current + 1);
    } catch (updateError) {
      setAdminActionError(updateError.message || 'Khong cap nhat duoc booking.');
    } finally {
      setAdminActionLoading(false);
    }
  }

  async function handleCancelBooking() {
    if (!bookingDetail?.bookingId) {
      return;
    }

    const confirmed = window.confirm(`Ban co chac muon huy booking ${bookingDetail.bookingCode} khong?`);
    if (!confirmed) {
      return;
    }

    setAdminActionLoading(true);
    setAdminActionError('');
    setAdminActionSuccess('');

    try {
      const response = await adminApi.cancelBooking(bookingDetail.bookingId);
      setAdminActionSuccess(response.message || 'Da huy booking thanh cong.');
      resetBookingInspection();
      setRefreshKey((current) => current + 1);
    } catch (cancelError) {
      setAdminActionError(cancelError.message || 'Khong huy duoc booking.');
    } finally {
      setAdminActionLoading(false);
    }
  }

  return (
    <div className="page-stack">
      <article className="data-card admin-booking-seat-page">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Booking admin</p>
            <h3>Chon ghe va tao don cho khach vang lai</h3>
            <p className="section-note">
              Nhan vien co the xem ghe da co nguoi giu, phan biet da thanh toan hay chua, sau do tao booking moi cho khach le.
            </p>
          </div>

          <div className="admin-booking-toolbar">
            <button type="button" className="ghost-button" onClick={() => navigate('/dat-ve')}>
              Quay lai lich dat ve
            </button>
          </div>
        </div>

        {loading ? (
          <div className="empty-state-card">
            <strong>Dang tai so do ghe...</strong>
            <span>He thong dang lay du lieu ghe va thong tin booking theo tung cho.</span>
          </div>
        ) : null}

        {error ? (
          <div className="empty-state-card">
            <strong>Khong tai duoc so do ghe</strong>
            <span>{error}</span>
            <button type="button" onClick={() => setRefreshKey((current) => current + 1)}>
              Thu tai lai
            </button>
          </div>
        ) : null}

        {!loading && !error && seatMap ? (
          <div className="admin-booking-layout">
            <section className="admin-seat-browser">
              <div className="admin-seat-header">
                <div>
                  <div className="admin-seat-title">
                    {seatMap.routeOrigin} - {seatMap.routeDestination}
                  </div>
                  <div className="admin-seat-meta">
                    <span>Khoi hanh: {formatDateTime(seatMap.departureTime)}</span>
                    <span>Xe: {seatMap.licensePlate}</span>
                    <span>Loai: {seatMap.vehicleType}</span>
                  </div>
                </div>

                <div className="admin-seat-summary">
                  <span>{availableSeatCount} ghe trong</span>
                  <span>{seatMap.totalSeats} tong ghe</span>
                </div>
              </div>

              <div className="admin-seat-legend">
                <span className="legend-chip available">Con trong</span>
                <span className="legend-chip pending">Cho thanh toan</span>
                <span className="legend-chip paid">Da thanh toan</span>
              </div>

              <div className="admin-deck-switcher">
                {deckOptions.map((deck) => (
                  <button
                    key={deck}
                    type="button"
                    className={`date-pill${deck === activeDeck ? ' active' : ''}`}
                    onClick={() => setActiveDeck(deck)}
                  >
                    {deck}
                  </button>
                ))}
              </div>

              <div className="admin-seat-grid-card">
                {filteredSeats.length > 0 ? (
                  <div
                    className="admin-seat-grid"
                    style={{ gridTemplateColumns: `repeat(${Math.max(maxCol, 1)}, minmax(0, 1fr))` }}
                  >
                    {Array.from({ length: maxRow }, (_, rowOffset) => rowOffset + 1).flatMap((row) =>
                      Array.from({ length: maxCol }, (_, colOffset) => {
                        const col = colOffset + 1;
                        const seat = seatByPosition.get(`${row}-${col}`);

                        if (!seat) {
                          return <div key={`${activeDeck}-${row}-${col}`} className="admin-seat-placeholder" />;
                        }

                        const isSelected = selectedSeatIds.includes(seat.tripSeatId) || inspectedSeatId === seat.tripSeatId;
                        const className = `${getSeatStateClass(seat)}${isSelected ? ' selected' : ''}`;

                        return (
                          <button
                            key={seat.tripSeatId}
                            type="button"
                            className={className}
                            onClick={() => handleSeatClick(seat)}
                          >
                            <strong>{seat.seatCode}</strong>
                            <span>{resolveSeatStateLabel(seat)}</span>
                            {Number(seat.status) !== 0 ? (
                              <>
                                <small>{seat.contactName || 'Da co khach dat'}</small>
                                <small>{seat.contactPhone || seat.bookingCode || '--'}</small>
                              </>
                            ) : (
                              <small>{seat.seatType || 'Ghe'}</small>
                            )}
                          </button>
                        );
                      }))}
                  </div>
                ) : (
                  <div className="empty-slot">Khong co ghe nao de hien thi o tang nay.</div>
                )}
              </div>
            </section>

            <aside className="admin-booking-sidebar">
              <div className="admin-booking-panel">
                <h4>Thong tin chang dat</h4>
                <div className="schedule-form-grid schedule-form-grid-compact">
                  <label className="filter-field">
                    <span>Diem don</span>
                    <select value={selectedPickupId} onChange={(event) => setSelectedPickupId(event.target.value)}>
                      <option value="">Chon diem don</option>
                      {(seatMap.stops ?? []).map((stop) => (
                        <option
                          key={`pickup-${stop.locationId}`}
                          value={stop.locationId}
                          disabled={
                            selectedDropoffId
                            && Number(stop.stopOrder) >= Number(stopOrderById.get(String(selectedDropoffId)) || 0)
                          }
                        >
                          {stop.stopOrder}. {stop.locationName}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="filter-field">
                    <span>Diem tra</span>
                    <select value={selectedDropoffId} onChange={(event) => setSelectedDropoffId(event.target.value)}>
                      <option value="">Chon diem tra</option>
                      {(seatMap.stops ?? []).map((stop) => (
                        <option
                          key={`dropoff-${stop.locationId}`}
                          value={stop.locationId}
                          disabled={
                            selectedPickupId
                            && Number(stop.stopOrder) <= Number(stopOrderById.get(String(selectedPickupId)) || 0)
                          }
                        >
                          {stop.stopOrder}. {stop.locationName}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="admin-booking-summary-box">
                  <div>
                    <span>Don gia chang</span>
                    <strong>{hasSegmentPrice ? formatCurrency(seatMap.segmentPrice) : 'Chon diem don/tra'}</strong>
                  </div>
                  <div>
                    <span>Da chon</span>
                    <strong>{selectedSeats.length} ghe</strong>
                  </div>
                  <div>
                    <span>Tam tinh</span>
                    <strong>{hasSegmentPrice ? formatCurrency(selectedTotalAmount) : '--'}</strong>
                  </div>
                </div>

                <div className="selected-seat-stack">
                  {selectedSeats.length > 0 ? (
                    selectedSeats.map((seat) => (
                      <span key={seat.tripSeatId} className="pill">
                        {seat.seatCode}
                      </span>
                    ))
                  ) : (
                    <span className="section-note">Chua chon ghe nao.</span>
                  )}
                </div>
              </div>

              <div className="admin-booking-panel">
                <h4>
                  {inspectedSeat ? `Xu ly booking tren ghe ${inspectedSeat.seatCode}` : 'Xu ly ghe da dat'}
                </h4>

                {!inspectedSeat ? (
                  <div className="empty-state-card">
                    <strong>Chon mot ghe da duoc giu cho</strong>
                    <span>
                      Khi bam vao ghe cho thanh toan, he thong se hien 2 thao tac sua thong tin va huy booking.
                    </span>
                  </div>
                ) : null}

                {inspectedSeat ? (
                  <div className="form-note">
                    <strong>{inspectedSeat.seatCode}</strong>
                    <span>
                      Trang thai: {resolveSeatStateLabel(inspectedSeat)}{inspectedSeat.bookingCode ? ` - ${inspectedSeat.bookingCode}` : ''}
                    </span>
                  </div>
                ) : null}

                {detailLoading ? (
                  <div className="empty-state-card">
                    <strong>Dang tai chi tiet booking...</strong>
                    <span>He thong dang lay thong tin lien he, ghe va han thanh toan cua don nay.</span>
                  </div>
                ) : null}

                {detailError ? <div className="auth-error">{detailError}</div> : null}
                {adminActionError ? <div className="auth-error">{adminActionError}</div> : null}
                {adminActionSuccess ? <div className="success-banner"><strong>{adminActionSuccess}</strong></div> : null}

                {bookingDetail && !detailLoading ? (
                  <>
                    <div className="booking-detail-grid">
                      <div>
                        <span>Khach dat</span>
                        <strong>{bookingDetail.contactName || '--'}</strong>
                      </div>
                      <div>
                        <span>So dien thoai</span>
                        <strong>{bookingDetail.contactPhone || '--'}</strong>
                      </div>
                      <div>
                        <span>Email</span>
                        <strong>{bookingDetail.contactEmail || '--'}</strong>
                      </div>
                      <div>
                        <span>Trang thai</span>
                        <strong>{resolveBookingStatusLabel(bookingDetail.status)}</strong>
                      </div>
                      <div>
                        <span>Ma booking</span>
                        <strong>{bookingDetail.bookingCode || '--'}</strong>
                      </div>
                      <div>
                        <span>Han thanh toan</span>
                        <strong>{formatDateTime(bookingDetail.paymentExpiry)}</strong>
                      </div>
                    </div>

                    <div className="form-note">
                      <strong>Chang dat: {bookingDetail.pickupLocationName} - {bookingDetail.dropoffLocationName}</strong>
                      <span>Khoi hanh: {formatDateTime(bookingDetail.tripDepartureTime)}</span>
                    </div>

                    <div className="booking-ticket-pill-row">
                      {(bookingDetail.tickets ?? []).map((ticket) => (
                        <span key={ticket.ticketId} className="pill">
                          {ticket.seatCode}
                        </span>
                      ))}
                    </div>

                    {bookingDetail.note ? (
                      <div className="form-note">
                        <strong>Ghi chu</strong>
                        <span>{bookingDetail.note}</span>
                      </div>
                    ) : null}

                    {Number(bookingDetail.status) === 0 && !editingBooking ? (
                      <div className="admin-booking-action-row">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => {
                            setEditForm(buildEditFormFromBooking(bookingDetail));
                            setEditingBooking(true);
                            setAdminActionError('');
                            setAdminActionSuccess('');
                          }}
                          disabled={adminActionLoading}
                        >
                          Sua thong tin
                        </button>
                        <button
                          type="button"
                          className="danger-button"
                          onClick={handleCancelBooking}
                          disabled={adminActionLoading}
                        >
                          {adminActionLoading ? 'Dang huy booking...' : 'Xoa / huy booking'}
                        </button>
                      </div>
                    ) : null}

                    {Number(bookingDetail.status) === 1 ? (
                      <div className="form-note">
                        <strong>Booking da thanh toan</strong>
                        <span>Man hinh nay chi cho phep sua hoac huy doi voi booking dang cho thanh toan.</span>
                      </div>
                    ) : null}

                    {editingBooking ? (
                      <div className="inline-editor-card">
                        <div className="inline-editor-heading">
                          <strong>Cap nhat thong tin booking</strong>
                        </div>

                        <label className="filter-field">
                          <span>Ho ten khach dat</span>
                          <input
                            className="form-input"
                            value={editForm.contactName}
                            onChange={(event) => setEditForm((current) => ({ ...current, contactName: event.target.value }))}
                            placeholder="Nhap ho ten"
                          />
                        </label>

                        <label className="filter-field">
                          <span>So dien thoai</span>
                          <input
                            className="form-input"
                            value={editForm.contactPhone}
                            onChange={(event) => setEditForm((current) => ({ ...current, contactPhone: event.target.value }))}
                            placeholder="Nhap so dien thoai"
                          />
                        </label>

                        <label className="filter-field">
                          <span>Email nhan ve dien tu</span>
                          <input
                            className="form-input"
                            type="email"
                            value={editForm.contactEmail}
                            onChange={(event) => setEditForm((current) => ({ ...current, contactEmail: event.target.value }))}
                            placeholder="Nhap email"
                          />
                        </label>

                        <label className="filter-field">
                          <span>Han thanh toan</span>
                          <input
                            className="form-input"
                            type="datetime-local"
                            value={editForm.paymentExpiryInput}
                            onChange={(event) => setEditForm((current) => ({ ...current, paymentExpiryInput: event.target.value }))}
                          />
                        </label>

                        <label className="filter-field">
                          <span>Ghi chu</span>
                          <textarea
                            className="form-input admin-textarea"
                            rows="4"
                            value={editForm.note}
                            onChange={(event) => setEditForm((current) => ({ ...current, note: event.target.value }))}
                            placeholder="Cap nhat ghi chu cho nha xe"
                          />
                        </label>

                        <div className="editor-actions">
                          <button
                            type="button"
                            className="ghost-button"
                            onClick={() => {
                              setEditingBooking(false);
                              setEditForm(buildEditFormFromBooking(bookingDetail));
                              setAdminActionError('');
                            }}
                            disabled={adminActionLoading}
                          >
                            Huy sua
                          </button>
                          <button
                            type="button"
                            className="auth-submit"
                            onClick={handleSaveBookingUpdate}
                            disabled={adminActionLoading}
                          >
                            {adminActionLoading ? 'Dang luu...' : 'Luu thay doi'}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>

              <form className="admin-booking-panel admin-guest-form" onSubmit={handleCreateBooking}>
                <h4>Thong tin khach vang lai</h4>

                <label className="filter-field">
                  <span>Ho ten khach dat</span>
                  <input
                    className="form-input"
                    value={contactName}
                    onChange={(event) => setContactName(event.target.value)}
                    placeholder="Nhap ho ten"
                  />
                </label>

                <label className="filter-field">
                  <span>So dien thoai</span>
                  <input
                    className="form-input"
                    value={contactPhone}
                    onChange={(event) => setContactPhone(event.target.value)}
                    placeholder="Nhap so dien thoai"
                  />
                </label>

                <label className="filter-field">
                  <span>Email nhan ve dien tu</span>
                  <input
                    className="form-input"
                    type="email"
                    value={contactEmail}
                    onChange={(event) => setContactEmail(event.target.value)}
                    placeholder="Nhap email"
                  />
                </label>

                <label className="filter-field">
                  <span>Han thanh toan</span>
                  <input
                    className="form-input"
                    type="datetime-local"
                    value={paymentExpiryInput}
                    onChange={(event) => setPaymentExpiryInput(event.target.value)}
                  />
                </label>

                <label className="filter-field">
                  <span>Ghi chu</span>
                  <textarea
                    className="form-input admin-textarea"
                    rows="4"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Ghi chu trung chuyen, diem hen..."
                  />
                </label>

                {submitError ? <div className="auth-error">{submitError}</div> : null}

                {bookingResult ? (
                  <div className="success-banner">
                    <strong>Da tao booking {bookingResult.bookingCode}</strong>
                    <span>
                      Trang thai: {Number(bookingResult.status) === 1 ? 'Da thanh toan' : 'Cho thanh toan'} - Tong tien {formatCurrency(bookingResult.totalAmount)}
                    </span>
                  </div>
                ) : null}

                <button type="submit" className="auth-submit" disabled={submitting}>
                  {submitting ? 'Dang tao booking...' : 'Tao booking guest'}
                </button>
              </form>
            </aside>
          </div>
        ) : null}
      </article>
    </div>
  );
}

export default AdminBookingSeatPage;
