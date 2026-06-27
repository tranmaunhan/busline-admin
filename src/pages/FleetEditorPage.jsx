import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminApi } from '../api/adminApi';
import { useAdminResource } from '../hooks/useAdminResource';

function createVehicleForm() {
  return {
    licensePlate: '',
    brand: '',
    manufactureYear: '',
    vehicleTypeId: '',
    status: 'ACTIVE',
  };
}

function buildVehicleForm(vehicle) {
  return {
    licensePlate: vehicle?.code || '',
    brand: vehicle?.brand === 'Chưa có hãng xe' ? '' : vehicle?.brand || '',
    manufactureYear: vehicle?.manufactureYear ?? '',
    vehicleTypeId: vehicle?.vehicleTypeId ? String(vehicle.vehicleTypeId) : '',
    status: vehicle?.rawStatus || 'ACTIVE',
  };
}

function FleetEditorPage() {
  const navigate = useNavigate();
  const params = useParams();
  const vehicleId = params.vehicleId ? Number(params.vehicleId) : null;
  const isEditing = Number.isFinite(vehicleId);

  const [form, setForm] = useState(createVehicleForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const { data, loading, error, reload } = useAdminResource(
    (signal) => adminApi.getFleet({ signal }),
    [],
  );

  const vehicleTypes = data?.vehicleTypes ?? [];
  const statusOptions = data?.statusOptions ?? [];
  const vehicles = data?.vehicles ?? [];
  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.vehicleId === vehicleId) ?? null,
    [vehicleId, vehicles],
  );

  useEffect(() => {
    if (!isEditing || !selectedVehicle) {
      return;
    }

    setForm(buildVehicleForm(selectedVehicle));
  }, [isEditing, selectedVehicle]);

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm(selectedVehicle ? buildVehicleForm(selectedVehicle) : createVehicleForm());
    setSubmitError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError('');

    try {
      const payload = {
        licensePlate: form.licensePlate.trim(),
        brand: form.brand.trim(),
        manufactureYear: form.manufactureYear ? Number(form.manufactureYear) : null,
        vehicleTypeId: Number(form.vehicleTypeId),
        status: form.status,
      };

      if (isEditing) {
        await adminApi.updateVehicle(vehicleId, payload);
        navigate('/doi-xe', {
          replace: true,
          state: { feedbackMessage: 'Đã cập nhật thông tin xe.' },
        });
      } else {
        await adminApi.createVehicle(payload);
        navigate('/doi-xe', {
          replace: true,
          state: { feedbackMessage: 'Đã thêm xe mới vào đội xe.' },
        });
      }
    } catch (requestError) {
      setSubmitError(requestError.message || 'Không lưu được thông tin xe.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-stack">
      <article className="data-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{isEditing ? 'Chỉnh sửa xe' : 'Thêm xe mới'}</p>
            <h3>{isEditing ? 'Cập nhật phương tiện' : 'Thêm phương tiện vào đội xe'}</h3>
          </div>

          <div className="editor-actions">
            <button type="button" className="ghost-button" onClick={() => navigate('/doi-xe')}>
              Quay lại đội xe
            </button>
          </div>
        </div>

        {loading ? (
          <div className="empty-state-card">
            <strong>Đang tải dữ liệu đội xe...</strong>
            <span>Hệ thống đang lấy loại xe, trạng thái và thông tin phương tiện hiện có.</span>
          </div>
        ) : null}

        {error ? (
          <div className="empty-state-card">
            <strong>Không tải được thông tin đội xe</strong>
            <span>{error}</span>
            <button type="button" onClick={reload}>
              Thử tải lại
            </button>
          </div>
        ) : null}

        {!loading && !error ? (
          <form className="editor-stack" onSubmit={handleSubmit}>
            {isEditing && selectedVehicle ? (
              <div className="route-editor-summary">
                <div>
                  <span>Biển số</span>
                  <strong>{selectedVehicle.code}</strong>
                </div>
                <div>
                  <span>Loại xe</span>
                  <strong>{selectedVehicle.type}</strong>
                </div>
                <div>
                  <span>Trạng thái hiện tại</span>
                  <strong>{selectedVehicle.status}</strong>
                </div>
              </div>
            ) : null}

            <div className="fleet-editor-grid">
              <label className="filter-field">
                <span>Biển số xe</span>
                <input
                  className="form-input"
                  type="text"
                  value={form.licensePlate}
                  onChange={(event) => updateForm('licensePlate', event.target.value)}
                  placeholder="51B-12345"
                  required
                />
              </label>

              <label className="filter-field">
                <span>Loại xe</span>
                <select
                  value={form.vehicleTypeId}
                  onChange={(event) => updateForm('vehicleTypeId', event.target.value)}
                  required
                >
                  <option value="">Chọn loại xe</option>
                  {vehicleTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name} - {type.totalSeats} ghế
                    </option>
                  ))}
                </select>
              </label>

              <label className="filter-field">
                <span>Hãng xe</span>
                <input
                  className="form-input"
                  type="text"
                  value={form.brand}
                  onChange={(event) => updateForm('brand', event.target.value)}
                  placeholder="Thaco / Hyundai"
                />
              </label>

              <label className="filter-field">
                <span>Năm sản xuất</span>
                <input
                  className="form-input"
                  type="number"
                  min="1950"
                  max="2100"
                  value={form.manufactureYear}
                  onChange={(event) => updateForm('manufactureYear', event.target.value)}
                  placeholder="2024"
                />
              </label>

              <label className="filter-field">
                <span>Trạng thái</span>
                <select
                  value={form.status}
                  onChange={(event) => updateForm('status', event.target.value)}
                  required
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {submitError ? <div className="auth-error">{submitError}</div> : null}

            <div className="editor-actions">
              <button type="button" className="ghost-button" onClick={resetForm} disabled={submitting}>
                Đặt lại
              </button>
              <button type="submit" className="auth-submit" disabled={submitting}>
                {submitting ? 'Đang lưu...' : isEditing ? 'Lưu thay đổi' : 'Tạo xe'}
              </button>
            </div>
          </form>
        ) : null}
      </article>
    </div>
  );
}

export default FleetEditorPage;
