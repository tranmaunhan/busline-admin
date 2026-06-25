import { useEffect, useState } from 'react';
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

function FleetPage() {
  const { data, loading, error, reload } = useAdminResource(
    (signal) => adminApi.getFleet({ signal }),
    [],
  );

  const [form, setForm] = useState(createVehicleForm);
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [statusDrafts, setStatusDrafts] = useState({});
  const [statusSubmittingId, setStatusSubmittingId] = useState(null);
  const [statusError, setStatusError] = useState('');

  const vehicleTypes = data?.vehicleTypes ?? [];
  const statusOptions = data?.statusOptions ?? [];
  const vehicles = data?.vehicles ?? [];

  useEffect(() => {
    if (!statusOptions.length) {
      return;
    }

    setStatusDrafts(
      Object.fromEntries(
        vehicles.map((vehicle) => [vehicle.vehicleId, vehicle.rawStatus || statusOptions[0]?.value || 'ACTIVE']),
      ),
    );
  }, [vehicles, statusOptions]);

  function resetForm() {
    setForm(createVehicleForm());
    setEditingVehicleId(null);
    setSubmitError('');
  }

  function startEdit(vehicle) {
    setForm({
      licensePlate: vehicle.code || '',
      brand: vehicle.brand === 'Chưa có hãng xe' ? '' : vehicle.brand || '',
      manufactureYear: vehicle.manufactureYear ?? '',
      vehicleTypeId: vehicle.vehicleTypeId ? String(vehicle.vehicleTypeId) : '',
      status: vehicle.rawStatus || 'ACTIVE',
    });
    setEditingVehicleId(vehicle.vehicleId);
    setSubmitError('');
    setFeedbackMessage('');
  }

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    setFeedbackMessage('');

    try {
      const payload = {
        licensePlate: form.licensePlate.trim(),
        brand: form.brand.trim(),
        manufactureYear: form.manufactureYear ? Number(form.manufactureYear) : null,
        vehicleTypeId: Number(form.vehicleTypeId),
        status: form.status,
      };

      if (editingVehicleId) {
        await adminApi.updateVehicle(editingVehicleId, payload);
        setFeedbackMessage('Đã cập nhật thông tin xe.');
      } else {
        await adminApi.createVehicle(payload);
        setFeedbackMessage('Đã thêm xe mới vào đội xe.');
      }

      resetForm();
      reload();
    } catch (requestError) {
      setSubmitError(requestError.message || 'Không lưu được thông tin xe.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleQuickStatusUpdate(vehicleId) {
    setStatusSubmittingId(vehicleId);
    setStatusError('');
    setFeedbackMessage('');

    try {
      await adminApi.updateVehicleStatus(vehicleId, statusDrafts[vehicleId]);
      setFeedbackMessage('Đã cập nhật trạng thái xe.');
      reload();
    } catch (requestError) {
      setStatusError(requestError.message || 'Không đổi được trạng thái xe.');
    } finally {
      setStatusSubmittingId(null);
    }
  }

  return (
    <div className="page-stack">
      {loading ? (
        <div className="empty-state-card">
          <strong>Đang tải đội xe...</strong>
          <span>Hệ thống đang tổng hợp trạng thái phương tiện và hoạt động gần nhất.</span>
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

      {!loading && !error && data ? (
        <>
          <section className="stats-grid">
            {data.summary.map((item) => (
              <article className="stat-card" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <p>{item.note}</p>
              </article>
            ))}
          </section>

          <article className="data-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">{editingVehicleId ? 'Chỉnh sửa xe' : 'Thêm xe'}</p>
                <h3>{editingVehicleId ? 'Cập nhật thông tin phương tiện' : 'Thêm phương tiện mới vào đội xe'}</h3>
              </div>
            </div>

            <form className="editor-stack" onSubmit={handleSubmit}>
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
              {feedbackMessage ? <div className="success-banner"><strong>{feedbackMessage}</strong></div> : null}

              <div className="editor-actions">
                {editingVehicleId ? (
                  <button type="button" className="ghost-button" onClick={resetForm}>
                    Hủy sửa
                  </button>
                ) : null}
                <button type="submit" className="auth-submit" disabled={submitting}>
                  {submitting ? 'Đang lưu...' : editingVehicleId ? 'Cập nhật xe' : 'Thêm xe'}
                </button>
              </div>
            </form>
          </article>

          <article className="data-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Đội xe</p>
                <h3>Tình trạng phương tiện và thao tác nhanh</h3>
              </div>
            </div>

            {statusError ? <div className="auth-error">{statusError}</div> : null}

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Biển số</th>
                    <th>Loại xe</th>
                    <th>Trạng thái</th>
                    <th>Hoạt động gần nhất</th>
                    <th>Hãng xe</th>
                    <th>Nam SX</th>
                    <th>Số ghế</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((row) => (
                    <tr key={row.vehicleId}>
                      <td>{row.code}</td>
                      <td>{row.type}</td>
                      <td>
                        <span className="status-pill">{row.status}</span>
                      </td>
                      <td>{row.activityValue}</td>
                      <td>{row.brand}</td>
                      <td>{row.manufactureYear ?? 'Chưa có'}</td>
                      <td>{row.totalSeats ?? 'Chưa rõ'}</td>
                      <td>
                        <div className="table-inline-actions">
                          <button type="button" className="ghost-button" onClick={() => startEdit(row)}>
                            Sửa
                          </button>
                          <select
                            className="table-inline-select"
                            value={statusDrafts[row.vehicleId] ?? row.rawStatus}
                            onChange={(event) => setStatusDrafts((current) => ({
                              ...current,
                              [row.vehicleId]: event.target.value,
                            }))}
                          >
                            {statusOptions.map((option) => (
                              <option key={`${row.vehicleId}-${option.value}`} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={statusSubmittingId === row.vehicleId}
                            onClick={() => handleQuickStatusUpdate(row.vehicleId)}
                          >
                            {statusSubmittingId === row.vehicleId ? 'Đang đổi...' : 'Đổi trạng thái'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {vehicles.length === 0 ? (
                    <tr>
                      <td colSpan="8">
                        <div className="empty-slot">Chưa có xe nào trong đội xe.</div>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </article>
        </>
      ) : null}
    </div>
  );
}

export default FleetPage;
