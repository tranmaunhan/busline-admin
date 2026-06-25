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
      brand: vehicle.brand === 'Chua co hang xe' ? '' : vehicle.brand || '',
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
        setFeedbackMessage('Da cap nhat thong tin xe.');
      } else {
        await adminApi.createVehicle(payload);
        setFeedbackMessage('Da them xe moi vao doi xe.');
      }

      resetForm();
      reload();
    } catch (requestError) {
      setSubmitError(requestError.message || 'Khong luu duoc thong tin xe.');
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
      setFeedbackMessage('Da cap nhat trang thai xe.');
      reload();
    } catch (requestError) {
      setStatusError(requestError.message || 'Khong doi duoc trang thai xe.');
    } finally {
      setStatusSubmittingId(null);
    }
  }

  return (
    <div className="page-stack">
      {loading ? (
        <div className="empty-state-card">
          <strong>Dang tai doi xe...</strong>
          <span>He thong dang tong hop trang thai phuong tien va hoat dong gan nhat.</span>
        </div>
      ) : null}

      {error ? (
        <div className="empty-state-card">
          <strong>Khong tai duoc thong tin doi xe</strong>
          <span>{error}</span>
          <button type="button" onClick={reload}>
            Thu tai lai
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
                <p className="eyebrow">{editingVehicleId ? 'Chinh sua xe' : 'Them xe'}</p>
                <h3>{editingVehicleId ? 'Cap nhat thong tin phuong tien' : 'Them phuong tien moi vao doi xe'}</h3>
              </div>
            </div>

            <form className="editor-stack" onSubmit={handleSubmit}>
              <div className="fleet-editor-grid">
                <label className="filter-field">
                  <span>Bien so xe</span>
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
                  <span>Loai xe</span>
                  <select
                    value={form.vehicleTypeId}
                    onChange={(event) => updateForm('vehicleTypeId', event.target.value)}
                    required
                  >
                    <option value="">Chon loai xe</option>
                    {vehicleTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name} - {type.totalSeats} ghe
                      </option>
                    ))}
                  </select>
                </label>

                <label className="filter-field">
                  <span>Hang xe</span>
                  <input
                    className="form-input"
                    type="text"
                    value={form.brand}
                    onChange={(event) => updateForm('brand', event.target.value)}
                    placeholder="Thaco / Hyundai"
                  />
                </label>

                <label className="filter-field">
                  <span>Nam san xuat</span>
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
                  <span>Trang thai</span>
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
                    Huy sua
                  </button>
                ) : null}
                <button type="submit" className="auth-submit" disabled={submitting}>
                  {submitting ? 'Dang luu...' : editingVehicleId ? 'Cap nhat xe' : 'Them xe'}
                </button>
              </div>
            </form>
          </article>

          <article className="data-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Doi xe</p>
                <h3>Tinh trang phuong tien va thao tac nhanh</h3>
              </div>
            </div>

            {statusError ? <div className="auth-error">{statusError}</div> : null}

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Bien so</th>
                    <th>Loai xe</th>
                    <th>Trang thai</th>
                    <th>Hoat dong gan nhat</th>
                    <th>Hang xe</th>
                    <th>Nam SX</th>
                    <th>So ghe</th>
                    <th>Thao tac</th>
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
                      <td>{row.manufactureYear ?? 'Chua co'}</td>
                      <td>{row.totalSeats ?? 'Chua ro'}</td>
                      <td>
                        <div className="table-inline-actions">
                          <button type="button" className="ghost-button" onClick={() => startEdit(row)}>
                            Sua
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
                            {statusSubmittingId === row.vehicleId ? 'Dang doi...' : 'Doi trang thai'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {vehicles.length === 0 ? (
                    <tr>
                      <td colSpan="8">
                        <div className="empty-slot">Chua co xe nao trong doi xe.</div>
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
