import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminApi, publicApi } from '../api/adminApi';
import { useAdminResource } from '../hooks/useAdminResource';
import { formatDuration } from '../utils/adminFormatters';
import {
  createDefaultRouteForm,
  createLocationDraft,
  createRouteFormFromDetail,
  LOCATION_TYPE_OPTIONS,
  normalizeCreatedLocation,
} from '../utils/routeUtils';

function RouteEditorPage() {
  const navigate = useNavigate();
  const params = useParams();
  const routeId = params.routeId ? Number(params.routeId) : null;
  const isEditing = Number.isFinite(routeId);

  const [form, setForm] = useState(createDefaultRouteForm);
  const [availableLocations, setAvailableLocations] = useState([]);
  const [locationDraft, setLocationDraft] = useState(null);
  const [creatingLocation, setCreatingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const { data, loading, error, reload } = useAdminResource(
    async (signal) => {
      const [selectedRoute, locations] = await Promise.all([
        isEditing ? adminApi.getRouteDetail(routeId, { signal }) : Promise.resolve(null),
        publicApi.getLocations({ signal }),
      ]);

      return { selectedRoute, locations };
    },
    [isEditing, routeId],
  );

  const selectedRoute = data?.selectedRoute ?? null;
  const locations = data?.locations ?? [];

  useEffect(() => {
    setAvailableLocations(locations);
  }, [locations]);

  useEffect(() => {
    if (!selectedRoute) {
      return;
    }

    setForm(createRouteFormFromDetail(selectedRoute));
  }, [selectedRoute]);

  const stopOptions = useMemo(
    () => form.stops.map((stop, index) => ({
      order: index + 1,
      name: availableLocations.find((location) => String(location.id) === String(stop.locationId))?.name
        || `Điểm dừng ${index + 1}`,
    })),
    [availableLocations, form.stops],
  );

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
      stops: [
        ...current.stops,
        {
          locationId: '',
          distanceFromStartKm: '',
          estimatedTimeFromStartMinutes: '',
        },
      ],
    }));
  }

  function removeStop(index) {
    setForm((current) => {
      if (current.stops.length <= 2) {
        return current;
      }

      const removedOrder = index + 1;
      const nextStops = current.stops.filter((_, stopIndex) => stopIndex !== index);
      const maxOrder = nextStops.length;
      const nextPrices = current.segmentPrices
        .filter((price) => Number(price.pickupStopOrder) !== removedOrder && Number(price.dropoffStopOrder) !== removedOrder)
        .map((price) => {
          const pickupStopOrder = Number(price.pickupStopOrder) > removedOrder
            ? Number(price.pickupStopOrder) - 1
            : Number(price.pickupStopOrder);
          const dropoffStopOrder = Number(price.dropoffStopOrder) > removedOrder
            ? Number(price.dropoffStopOrder) - 1
            : Number(price.dropoffStopOrder);

          return {
            ...price,
            pickupStopOrder: String(pickupStopOrder),
            dropoffStopOrder: String(dropoffStopOrder),
          };
        })
        .filter((price) => Number(price.pickupStopOrder) < Number(price.dropoffStopOrder) && Number(price.dropoffStopOrder) <= maxOrder);

      return {
        ...current,
        stops: nextStops,
        segmentPrices: nextPrices.length > 0
          ? nextPrices
          : [{ pickupStopOrder: '1', dropoffStopOrder: String(Math.min(2, maxOrder)), price: '' }],
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
          pickupStopOrder: '1',
          dropoffStopOrder: String(Math.min(2, current.stops.length)),
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
    setLocationDraft((current) => (current ? { ...current, [field]: value } : current));
  }

  function closeLocationDraft() {
    setLocationError('');
    setLocationDraft(null);
  }

  function resetForm() {
    setForm(selectedRoute ? createRouteFormFromDetail(selectedRoute) : createDefaultRouteForm());
    setLocationDraft(null);
    setLocationError('');
    setSubmitError('');
    setFeedbackMessage('');
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
        throw new Error('Địa điểm đã tạo nhưng không nhận được dữ liệu hợp lệ.');
      }

      setAvailableLocations((current) => {
        const withoutDuplicate = current.filter((location) => String(location.id) !== String(createdLocation.id));
        return [...withoutDuplicate, createdLocation].sort((left, right) => left.name.localeCompare(right.name, 'vi'));
      });
      updateStop(locationDraft.stopIndex, 'locationId', String(createdLocation.id));
      closeLocationDraft();
    } catch (requestError) {
      setLocationError(requestError.message || 'Không tạo được địa điểm mới.');
    } finally {
      setCreatingLocation(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    setFeedbackMessage('');

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

      if (isEditing) {
        await adminApi.updateRoute(routeId, payload);
        navigate('/tuyen-xe', {
          replace: true,
          state: { feedbackMessage: 'Đã cập nhật tuyến thành công.' },
        });
      } else {
        await adminApi.createRoute(payload);
        navigate('/tuyen-xe', {
          replace: true,
          state: { feedbackMessage: 'Đã tạo tuyến thành công.' },
        });
      }
    } catch (requestError) {
      setSubmitError(requestError.message || 'Không lưu được tuyến xe.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!isEditing || !selectedRoute?.canMutate) {
      return;
    }

    const confirmed = window.confirm(`Bạn có chắc muốn xóa tuyến #${routeId} không?`);
    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setSubmitError('');
    setFeedbackMessage('');

    try {
      await adminApi.deleteRoute(routeId);
      navigate('/tuyen-xe', {
        replace: true,
        state: { feedbackMessage: 'Đã xóa tuyến thành công.' },
      });
    } catch (requestError) {
      setSubmitError(requestError.message || 'Không xóa được tuyến xe.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="page-stack">
      <article className="data-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{isEditing ? 'Chỉnh sửa tuyến' : 'Tạo tuyến mới'}</p>
            <h3>{isEditing ? 'Cập nhật thông tin tuyến xe' : 'Khai báo tuyến, điểm dừng và bảng giá'}</h3>
          </div>

          <div className="editor-actions">
            <button type="button" className="ghost-button" onClick={() => navigate('/tuyen-xe')}>
              Quay lại danh sách
            </button>
            {isEditing ? (
              <button
                type="button"
                className="danger-button"
                onClick={handleDelete}
                disabled={deleting || !selectedRoute?.canMutate}
              >
                {deleting ? 'Đang xóa...' : 'Xóa tuyến'}
              </button>
            ) : null}
          </div>
        </div>

        {loading ? (
          <div className="empty-state-card">
            <strong>Đang tải dữ liệu tuyến xe...</strong>
            <span>Hệ thống đang lấy danh sách địa điểm và chi tiết tuyến cần chỉnh sửa.</span>
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

        {!loading && !error ? (
          <form className="editor-stack" onSubmit={handleSubmit}>
            {isEditing && selectedRoute ? (
              <div className="route-editor-summary">
                <div>
                  <span>Tuyến hiện tại</span>
                  <strong>{selectedRoute.route}</strong>
                </div>
                <div>
                  <span>Quãng đường</span>
                  <strong>{selectedRoute.distanceKm} km</strong>
                </div>
                <div>
                  <span>Thời gian dự kiến</span>
                  <strong>{formatDuration(selectedRoute.estimatedDurationMinutes)}</strong>
                </div>
              </div>
            ) : null}

            {isEditing && !selectedRoute?.canMutate ? (
              <div className="form-note">
                Tuyến này đã được gắn vào lịch chạy hoặc đã phát sinh trip, vì vậy không thể sửa hoặc xóa.
              </div>
            ) : (
              <div className="form-note">
                Điểm dừng đầu tiên được xem là điểm xuất phát, điểm cuối cùng là điểm đến của tuyến.
              </div>
            )}

            <section className="editor-section">
              <div className="list-title-row">
                <strong>Danh sách điểm dừng</strong>
                <button type="button" onClick={addStop} disabled={isEditing && !selectedRoute?.canMutate}>
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
                          disabled={isEditing && !selectedRoute?.canMutate}
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
                          disabled={index === 0 || (isEditing && !selectedRoute?.canMutate)}
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
                          disabled={index === 0 || (isEditing && !selectedRoute?.canMutate)}
                          required
                        />
                      </label>

                      <div className="editor-actions">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => openLocationDraft(index)}
                          disabled={creatingLocation || (isEditing && !selectedRoute?.canMutate)}
                        >
                          Thêm địa điểm
                        </button>
                        <button
                          type="button"
                          className="danger-button"
                          onClick={() => removeStop(index)}
                          disabled={index === 0 || form.stops.length <= 2 || (isEditing && !selectedRoute?.canMutate)}
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

                        {locationError ? <div className="auth-error">{locationError}</div> : null}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>

            <section className="editor-section">
              <div className="list-title-row">
                <strong>Mức giá theo chặng</strong>
                <button type="button" onClick={addPriceRule} disabled={isEditing && !selectedRoute?.canMutate}>
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
                        disabled={isEditing && !selectedRoute?.canMutate}
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
                        disabled={isEditing && !selectedRoute?.canMutate}
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
                        disabled={isEditing && !selectedRoute?.canMutate}
                        required
                      />
                    </label>

                    <div className="editor-actions">
                      <button
                        type="button"
                        className="danger-button"
                        onClick={() => removePriceRule(index)}
                        disabled={form.segmentPrices.length <= 1 || (isEditing && !selectedRoute?.canMutate)}
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

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
              <button
                type="submit"
                className="auth-submit"
                disabled={submitting || availableLocations.length === 0 || (isEditing && !selectedRoute?.canMutate)}
              >
                {submitting ? 'Đang lưu...' : isEditing ? 'Lưu thay đổi' : 'Tạo tuyến'}
              </button>
            </div>
          </form>
        ) : null}
      </article>
    </div>
  );
}

export default RouteEditorPage;
