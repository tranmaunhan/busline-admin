import { useEffect, useMemo, useState } from 'react';
import { adminApi, publicApi } from '../api/adminApi';
import { useAdminResource } from '../hooks/useAdminResource';
import {
  formatCompactCurrency,
  formatCurrency,
  formatDuration,
  formatPercent,
  formatTripFrequency,
} from '../utils/adminFormatters';

function createEmptyStop() {
  return {
    locationId: '',
    distanceFromStartKm: '',
    estimatedTimeFromStartMinutes: '',
  };
}

function createDefaultForm() {
  return {
    stops: [
      { locationId: '', distanceFromStartKm: 0, estimatedTimeFromStartMinutes: 0 },
      createEmptyStop(),
    ],
    segmentPrices: [
      {
        pickupStopOrder: 1,
        dropoffStopOrder: 2,
        price: '',
      },
    ],
  };
}

function createRouteFormFromDetail(routeDetail) {
  const stops = (routeDetail.stops ?? []).map((stop) => ({
    locationId: String(stop.locationId ?? ''),
    distanceFromStartKm: String(stop.distanceFromStartKm ?? 0),
    estimatedTimeFromStartMinutes: String(stop.estimatedTimeFromStartMinutes ?? 0),
  }));

  const segmentPrices = (routeDetail.segmentPrices ?? []).map((item) => ({
    pickupStopOrder: String(item.pickupStopOrder ?? 1),
    dropoffStopOrder: String(item.dropoffStopOrder ?? 2),
    price: String(item.price ?? ''),
  }));

  return {
    stops: stops.length >= 2 ? stops : createDefaultForm().stops,
    segmentPrices: segmentPrices.length > 0
      ? segmentPrices
      : [{ pickupStopOrder: 1, dropoffStopOrder: 2, price: '' }],
  };
}

const LOCATION_TYPE_OPTIONS = [
  { value: 'STATION', label: 'Bến xe' },
  { value: 'STOP', label: 'Điểm đón / trả' },
];

function createLocationDraft(stopIndex) {
  return {
    stopIndex,
    name: '',
    address: '',
    type: 'STOP',
  };
}

function normalizeCreatedLocation(response, fallbackPayload) {
  if (!response || typeof response !== 'object') {
    return null;
  }

  const location = response.location ?? response.data ?? response;
  const id = location.id ?? location.locationId;

  if (!id) {
    return null;
  }

  return {
    id,
    name: location.name ?? fallbackPayload.name,
    address: location.address ?? fallbackPayload.address,
    type: location.type ?? fallbackPayload.type,
  };
}

function RoutesPage() {
  const { data, loading, error, reload } = useAdminResource(
    async (signal) => {
      const [routesPayload, locations] = await Promise.all([
        adminApi.getRoutes({ signal }),
        publicApi.getLocations({ signal }),
      ]);

      return { routesPayload, locations };
    },
    [],
  );

  const [form, setForm] = useState(createDefaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [createdRoute, setCreatedRoute] = useState(null);
  const [editingRouteId, setEditingRouteId] = useState(null);
  const [loadingRouteId, setLoadingRouteId] = useState(null);
  const [deletingRouteId, setDeletingRouteId] = useState(null);
  const [formFeedback, setFormFeedback] = useState('');
  const [availableLocations, setAvailableLocations] = useState([]);
  const [locationDraft, setLocationDraft] = useState(null);
  const [creatingLocation, setCreatingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');

  const locations = data?.locations ?? [];
  const routesData = data?.routesPayload;

  useEffect(() => {
    setAvailableLocations(locations);
  }, [locations]);

  const stopOptions = useMemo(
    () =>
      form.stops.map((stop, index) => ({
        order: index + 1,
        name: availableLocations.find((location) => String(location.id) === String(stop.locationId))?.name
          || `Điểm dừng ${index + 1}`,
      })),
    [availableLocations, form.stops],
  );

  function resetRouteEditor() {
    setForm(createDefaultForm());
    setSubmitError('');
    setFormFeedback('');
    setCreatedRoute(null);
    setEditingRouteId(null);
    setLocationDraft(null);
    setLocationError('');
  }

  function updateStop(index, field, value) {
    setForm((current) => ({
      ...current,
      stops: current.stops.map((stop, stopIndex) => (
        stopIndex === index ? { ...stop, [field]: value } : stop
      )),
    }));
  }

  function addStop() {
    setForm((current) => ({
      ...current,
      stops: [...current.stops, createEmptyStop()],
    }));
  }

  function removeStop(index) {
    setForm((current) => {
      if (current.stops.length <= 2) {
        return current;
      }

      const nextStops = current.stops.filter((_, stopIndex) => stopIndex !== index);
      const maxOrder = nextStops.length;
      const nextPrices = current.segmentPrices
        .filter((price) => price.pickupStopOrder !== index + 1 && price.dropoffStopOrder !== index + 1)
        .map((price) => ({
          ...price,
          pickupStopOrder: price.pickupStopOrder > index + 1 ? price.pickupStopOrder - 1 : price.pickupStopOrder,
          dropoffStopOrder: price.dropoffStopOrder > index + 1 ? price.dropoffStopOrder - 1 : price.dropoffStopOrder,
        }))
        .filter((price) => price.pickupStopOrder < price.dropoffStopOrder && price.dropoffStopOrder <= maxOrder);

      return {
        ...current,
        stops: nextStops,
        segmentPrices: nextPrices.length > 0
          ? nextPrices
          : [{ pickupStopOrder: 1, dropoffStopOrder: Math.min(2, maxOrder), price: '' }],
      };
    });

    setLocationDraft((current) => {
      if (!current) {
        return current;
      }

      if (current.stopIndex === index) {
        return null;
      }

      if (current.stopIndex > index) {
        return { ...current, stopIndex: current.stopIndex - 1 };
      }

      return current;
    });
  }

  function updatePrice(index, field, value) {
    setForm((current) => ({
      ...current,
      segmentPrices: current.segmentPrices.map((item, itemIndex) => (
        itemIndex === index ? { ...item, [field]: value } : item
      )),
    }));
  }

  function addPriceRule() {
    setForm((current) => ({
      ...current,
      segmentPrices: [
        ...current.segmentPrices,
        {
          pickupStopOrder: 1,
          dropoffStopOrder: Math.min(2, current.stops.length),
          price: '',
        },
      ],
    }));
  }

  function removePriceRule(index) {
    setForm((current) => ({
      ...current,
      segmentPrices: current.segmentPrices.length <= 1
        ? current.segmentPrices
        : current.segmentPrices.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function openLocationDraft(stopIndex) {
    setLocationError('');
    setLocationDraft(createLocationDraft(stopIndex));
  }

  function updateLocationDraft(field, value) {
    setLocationDraft((current) => (
      current ? { ...current, [field]: value } : current
    ));
  }

  function closeLocationDraft() {
    setLocationError('');
    setLocationDraft(null);
  }

  async function handleCreateLocation() {
    if (!locationDraft) {
      return;
    }

    const payload = {
      name: locationDraft.name.trim(),
      address: locationDraft.address.trim(),
      type: locationDraft.type,
    };

    if (!payload.name || !payload.address) {
      setLocationError('Vui lòng nhập tên địa điểm và khu vực / địa chỉ.');
      return;
    }

    setCreatingLocation(true);
    setLocationError('');

    try {
      const response = await adminApi.createLocation(payload);
      const createdLocation = normalizeCreatedLocation(response, payload);

      if (!createdLocation) {
        throw new Error('Địa điểm đã tạo nhưng không nhận được dữ liệu trả về hợp lệ.');
      }

      setAvailableLocations((current) => {
        const withoutDuplicate = current.filter((location) => String(location.id) !== String(createdLocation.id));
        return [...withoutDuplicate, createdLocation].sort((left, right) => left.name.localeCompare(right.name, 'vi'));
      });
      updateStop(locationDraft.stopIndex, 'locationId', String(createdLocation.id));
      closeLocationDraft();
    } catch (createError) {
      setLocationError(createError.message || 'Không tạo được địa điểm mới.');
    } finally {
      setCreatingLocation(false);
    }
  }

  async function handleSaveRoute(event) {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    setFormFeedback('');

    const isEditing = editingRouteId !== null;

    try {
      const payload = {
        stops: form.stops.map((stop) => ({
          locationId: Number(stop.locationId),
          distanceFromStartKm: Number(stop.distanceFromStartKm),
          estimatedTimeFromStartMinutes: Number(stop.estimatedTimeFromStartMinutes),
        })),
        segmentPrices: form.segmentPrices.map((price) => ({
          pickupStopOrder: Number(price.pickupStopOrder),
          dropoffStopOrder: Number(price.dropoffStopOrder),
          price: Number(price.price),
        })),
      };

      const response = isEditing
        ? await adminApi.updateRoute(editingRouteId, payload)
        : await adminApi.createRoute(payload);
      setCreatedRoute(response);
      setForm(createDefaultForm());
      setEditingRouteId(null);
      setLocationDraft(null);
      setLocationError('');
      setFormFeedback(isEditing ? 'Cap nhat tuyen thanh cong.' : 'Tao tuyen thanh cong.');
      reload();
    } catch (createError) {
      setSubmitError(createError.message || 'Không tạo được tuyến xe.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEditRoute(routeId) {
    setLoadingRouteId(routeId);
    setSubmitError('');
    setFormFeedback('');

    try {
      const routeDetail = await adminApi.getRouteDetail(routeId);
      setEditingRouteId(routeId);
      setCreatedRoute(routeDetail);
      setForm(createRouteFormFromDetail(routeDetail));
      setLocationDraft(null);
      setLocationError('');
    } catch (loadError) {
      setSubmitError(loadError.message || 'Khong tai duoc chi tiet tuyen xe.');
    } finally {
      setLoadingRouteId(null);
    }
  }

  async function handleDeleteRoute(route) {
    const confirmed = window.confirm(`Ban co chac muon xoa tuyen ${route.route}?`);

    if (!confirmed) {
      return;
    }

    setDeletingRouteId(route.routeId);
    setSubmitError('');
    setFormFeedback('');

    try {
      await adminApi.deleteRoute(route.routeId);

      if (editingRouteId === route.routeId || createdRoute?.routeId === route.routeId) {
        setForm(createDefaultForm());
        setCreatedRoute(null);
        setEditingRouteId(null);
        setLocationDraft(null);
        setLocationError('');
      }

      setFormFeedback('Da xoa tuyen thanh cong.');
      reload();
    } catch (deleteError) {
      setSubmitError(deleteError.message || 'Khong xoa duoc tuyen xe.');
    } finally {
      setDeletingRouteId(null);
    }
  }

  return (
    <div className="page-stack">
      <article className="data-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Tạo tuyến mới</p>
            <h3>Khai báo tuyến, điểm dừng và mức giá theo chặng</h3>
          </div>
        </div>

        <form className="editor-stack" onSubmit={handleSaveRoute}>
          <div className="form-note">
            Điểm dừng đầu tiên sẽ được xem là điểm xuất phát, điểm cuối cùng là điểm đến của tuyến.
          </div>

          <section className="editor-section">
            <div className="list-title-row">
              <strong>Danh sách điểm dừng</strong>
              <button type="button" onClick={addStop}>
                Thêm điểm dừng
              </button>
            </div>

            <div className="editor-stack">
              {form.stops.map((stop, index) => (
                <div className="editor-item" key={`stop-${index}`}>
                  <div className="editor-grid">
                    <label className="filter-field">
                      <span>Điểm dừng {index + 1}</span>
                      <select
                        value={stop.locationId}
                        onChange={(event) => updateStop(index, 'locationId', event.target.value)}
                        required
                      >
                        <option value="">Chọn địa điểm</option>
                        {availableLocations.map((location) => (
                          <option key={location.id} value={location.id}>
                            {location.name}
                            {location.address ? ` - ${location.address}` : ''}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="filter-field">
                      <span>Khoảng cách tích lũy (km)</span>
                      <input
                        className="form-input"
                        type="number"
                        min="0"
                        step="0.1"
                        value={stop.distanceFromStartKm}
                        onChange={(event) => updateStop(index, 'distanceFromStartKm', event.target.value)}
                        disabled={index === 0}
                        required
                      />
                    </label>

                    <label className="filter-field">
                      <span>Thời gian tích lũy (phút)</span>
                      <input
                        className="form-input"
                        type="number"
                        min="0"
                        step="1"
                        value={stop.estimatedTimeFromStartMinutes}
                        onChange={(event) => updateStop(index, 'estimatedTimeFromStartMinutes', event.target.value)}
                        disabled={index === 0}
                        required
                      />
                    </label>

                    <div className="editor-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => openLocationDraft(index)}
                        disabled={creatingLocation}
                      >
                        Thêm địa điểm
                      </button>
                      <button
                        type="button"
                        className="danger-button"
                        onClick={() => removeStop(index)}
                        disabled={index === 0 || form.stops.length <= 2}
                      >
                        Xóa
                      </button>
                    </div>
                  </div>

                  {locationDraft?.stopIndex === index ? (
                    <div className="inline-editor-card">
                      <div className="inline-editor-heading">
                        <strong>Tạo địa điểm mới cho điểm dừng {index + 1}</strong>
                        <button type="button" className="ghost-button" onClick={closeLocationDraft}>
                          Đóng
                        </button>
                      </div>

                      <div className="editor-grid location-creator-grid">
                        <label className="filter-field">
                          <span>Tên địa điểm</span>
                          <input
                            className="form-input"
                            type="text"
                            value={locationDraft.name}
                            onChange={(event) => updateLocationDraft('name', event.target.value)}
                            placeholder="Ví dụ: Bến xe Ngã Bảy"
                            required
                          />
                        </label>

                        <label className="filter-field">
                          <span>Khu vực / địa chỉ</span>
                          <input
                            className="form-input"
                            type="text"
                            value={locationDraft.address}
                            onChange={(event) => updateLocationDraft('address', event.target.value)}
                            placeholder="Ví dụ: Hậu Giang"
                            required
                          />
                        </label>

                        <label className="filter-field">
                          <span>Loại địa điểm</span>
                          <select
                            value={locationDraft.type}
                            onChange={(event) => updateLocationDraft('type', event.target.value)}
                          >
                            {LOCATION_TYPE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <div className="editor-actions">
                          <button
                            type="button"
                            className="auth-submit"
                            onClick={handleCreateLocation}
                            disabled={creatingLocation}
                          >
                            {creatingLocation ? 'Đang tạo...' : 'Lưu địa điểm'}
                          </button>
                        </div>
                      </div>

                      {locationError ? (
                        <div className="auth-error">{locationError}</div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          <section className="editor-section">
            <div className="list-title-row">
              <strong>Mức giá theo chặng</strong>
              <button type="button" onClick={addPriceRule}>
                Thêm mức giá
              </button>
            </div>

            <div className="editor-stack">
              {form.segmentPrices.map((price, index) => (
                <div className="editor-grid price-grid" key={`price-${index}`}>
                  <label className="filter-field">
                    <span>Điểm đón</span>
                    <select
                      value={price.pickupStopOrder}
                      onChange={(event) => updatePrice(index, 'pickupStopOrder', event.target.value)}
                      required
                    >
                      {stopOptions.map((option) => (
                        <option key={`pickup-${option.order}`} value={option.order}>
                          {option.order}. {option.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="filter-field">
                    <span>Điểm trả</span>
                    <select
                      value={price.dropoffStopOrder}
                      onChange={(event) => updatePrice(index, 'dropoffStopOrder', event.target.value)}
                      required
                    >
                      {stopOptions.map((option) => (
                        <option key={`dropoff-${option.order}`} value={option.order}>
                          {option.order}. {option.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="filter-field">
                    <span>Giá vé (VND)</span>
                    <input
                      className="form-input"
                      type="number"
                      min="1000"
                      step="1000"
                      value={price.price}
                      onChange={(event) => updatePrice(index, 'price', event.target.value)}
                      required
                    />
                  </label>

                  <div className="editor-actions">
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => removePriceRule(index)}
                      disabled={form.segmentPrices.length <= 1}
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {editingRouteId ? (
            <div className="form-note">
              Ban dang chinh sua tuyen da chon. Nhan nut luu de cap nhat thay doi.
            </div>
          ) : null}

          {formFeedback ? (
            <div className="success-banner">
              <strong>{formFeedback}</strong>
            </div>
          ) : null}

          {submitError ? (
            <div className="auth-error">{submitError}</div>
          ) : null}

          <div className="stack-actions">
            <button type="submit" className="auth-submit" disabled={submitting || availableLocations.length === 0}>
              {submitting ? 'Đang tạo tuyến...' : 'Tạo tuyến xe'}
            </button>
            {editingRouteId ? (
              <button type="button" className="ghost-button" onClick={resetRouteEditor} disabled={submitting}>
                Huy chinh sua
              </button>
            ) : null}
          </div>
        </form>
      </article>

      {createdRoute ? (
        <article className="data-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Tuyến vừa tạo</p>
              <h3>{createdRoute.route}</h3>
            </div>
          </div>

          <div className="success-banner">
            <strong>Tạo tuyến thành công</strong>
            <span>
              Tổng quãng đường {createdRoute.distanceKm} km - Thời gian dự kiến{' '}
              {formatDuration(createdRoute.estimatedDurationMinutes)}
            </span>
          </div>

          <div className="content-grid">
            <article className="data-card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Điểm dừng</p>
                  <h3>Thứ tự đi qua</h3>
                </div>
              </div>

              <ul className="route-list">
                {createdRoute.stops.map((stop) => (
                  <li key={`${createdRoute.routeId}-stop-${stop.stopOrder}`}>
                    <strong>
                      {stop.stopOrder}. {stop.locationName}
                    </strong>
                    <span>{stop.distanceFromStartKm} km</span>
                    <small>{stop.estimatedTimeFromStartMinutes} phút từ điểm đầu</small>
                  </li>
                ))}
              </ul>
            </article>

            <article className="data-card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Bảng giá</p>
                  <h3>Giá theo chặng</h3>
                </div>
              </div>

              <ul className="route-list">
                {createdRoute.segmentPrices.map((item) => (
                  <li key={`${createdRoute.routeId}-${item.pickupStopOrder}-${item.dropoffStopOrder}`}>
                    <strong>
                      {item.pickupStopOrder}. {item.pickupLocationName} - {item.dropoffStopOrder}. {item.dropoffLocationName}
                    </strong>
                    <small>{formatCurrency(item.price)}</small>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </article>
      ) : null}

      {loading ? (
        <div className="empty-state-card">
          <strong>Đang tải dữ liệu tuyến xe...</strong>
          <span>Hệ thống đang tổng hợp tần suất, doanh thu và lấp đầy.</span>
        </div>
      ) : null}

      {error ? (
        <div className="empty-state-card">
          <strong>Không tải được thông tin tuyến xe</strong>
          <span>{error}</span>
          <button type="button" onClick={reload}>
            Thử tải lại
          </button>
        </div>
      ) : null}

      {!loading && !error && routesData ? (
        <section className="content-grid chart-layout">
          <article className="data-card wide">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Tuyến xe</p>
                <h3>Danh mục tuyến đang khai thác</h3>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tuyến</th>
                    <th>Tần suất</th>
                    <th>Doanh thu TB/ngày</th>
                    <th>Lấp đầy</th>
                    <th>Khoảng cách</th>
                    <th>Thời gian dự kiến</th>
                  </tr>
                </thead>
                <tbody>
                  {routesData.routes.map((route) => (
                    <tr key={route.routeId}>
                      <td>{route.route}</td>
                      <td>{formatTripFrequency(route.averageTripsPerDay)}</td>
                      <td>{formatCompactCurrency(route.averageRevenuePerDay)}</td>
                      <td>{formatPercent(route.occupancyRate)}</td>
                      <td>{route.distanceKm ? `${route.distanceKm} km` : 'Chưa có'}</td>
                      <td>{formatDuration(route.estimatedDurationMinutes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* <div className="editor-stack">
              {routesData.routes.map((route) => (
                <div className="table-inline-actions" key={`route-actions-${route.routeId}`}>
                  <strong>{route.route}</strong>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => handleEditRoute(route.routeId)}
                    disabled={submitting || deletingRouteId === route.routeId || loadingRouteId === route.routeId}
                  >
                    {loadingRouteId === route.routeId ? 'Dang tai...' : 'Sua'}
                  </button>
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => handleDeleteRoute(route)}
                    disabled={submitting || loadingRouteId === route.routeId || deletingRouteId === route.routeId}
                  >
                    {deletingRouteId === route.routeId ? 'Dang xoa...' : 'Xoa'}
                  </button>
                </div>
              ))}
            </div> */}
          </article>

          <article className="data-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Nổi bật</p>
                <h3>Tuyến ưu tiên tăng cường</h3>
              </div>
            </div>

            <ul className="route-list">
              {routesData.highlights.map((route) => (
                <li key={route.routeId}>
                  <strong>{route.name}</strong>
                  <span>{route.tickets} vé / 7 ngày</span>
                  <small>
                    Doanh thu {formatCurrency(route.revenue)} - Lấp đầy {formatPercent(route.occupancyRate)}
                  </small>
                </li>
              ))}
            </ul>
          </article>
        </section>
      ) : null}
    </div>
  );
}

export default RoutesPage;
