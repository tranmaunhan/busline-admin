import { useState } from 'react';
import { adminApi } from '../api/adminApi';
import { useAdminResource } from '../hooks/useAdminResource';
import { formatCurrency, formatPercent } from '../utils/adminFormatters';

function DashboardPage() {
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const { data, loading, error, reload } = useAdminResource(
    (signal) => adminApi.getDashboard({ signal }),
    [],
  );

  const revenueSeries = data?.revenueSeries ?? [];
  const maxRevenue = revenueSeries.length
    ? Math.max(...revenueSeries.map((item) => Number(item.value || 0)), 1)
    : 1;

  const handleCleanupExpiredBookings = async () => {
    try {
      setCleanupLoading(true);
      await adminApi.deleteExpiredBookings();
      await reload();
    } finally {
      setCleanupLoading(false);
    }
  };

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Dashboard van hanh</p>
          <h3 className="hero-title">Tong quan doanh thu, ve ban va chuyen xe trong ngay.</h3>
          <p className="hero-copy">
            Du lieu duoc tong hop tu booking, trip, route va vehicle hien co trong he thong.
          </p>
          <button
            type="button"
            className="clear-filter-button"
            onClick={handleCleanupExpiredBookings}
            disabled={cleanupLoading}
            style={{ marginTop: '1rem' }}
          >
            {cleanupLoading ? 'Dang don booking het han...' : 'Xoa booking het han thanh toan'}
          </button>
        </div>

        <div className="hero-metrics">
          {(data?.overviewStats ?? []).map((item) => (
            <div key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <p>{item.caption}</p>
            </div>
          ))}
        </div>
      </section>

      {loading ? (
        <div className="empty-state-card">
          <strong>Dang tai dashboard...</strong>
          <span>He thong dang tong hop so lieu admin moi nhat.</span>
        </div>
      ) : null}

      {error ? (
        <div className="empty-state-card">
          <strong>Khong tai duoc dashboard</strong>
          <span>{error}</span>
          <button type="button" onClick={reload}>
            Thu tai lai
          </button>
        </div>
      ) : null}

      {!loading && !error && data ? (
        <>
          <section className="stats-grid six-cols">
            {data.metricCards.map((card) => (
              <article className={`stat-card tone-${card.tone}`} key={card.label}>
                <span>{card.label}</span>
                <strong>{card.value}</strong>
                <p>{card.detail}</p>
              </article>
            ))}
          </section>

          <section className="content-grid chart-layout">
            <article className="data-card wide">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Doanh thu</p>
                  <h3>Bieu do doanh thu 7 ngay gan nhat</h3>
                </div>
                <div className="section-note">Cap nhat: {data.updatedAtLabel}</div>
              </div>

              <div className="chart-card">
                {data.revenueSeries.map((item) => (
                  <div className="chart-column" key={item.label}>
                    <span className="chart-value">{formatCurrency(item.value)}</span>
                    <div className="chart-bar-track">
                      <div
                        className="chart-bar"
                        style={{ height: `${Math.max((Number(item.value || 0) / maxRevenue) * 100, 18)}%` }}
                      />
                    </div>
                    <span className="chart-label">{item.label}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="data-card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Tuyen noi bat</p>
                  <h3>Cac tuyen dang co toc do ban ve cao</h3>
                </div>
              </div>

              <ul className="route-list">
                {data.topRoutes.map((route) => (
                  <li key={route.name}>
                    <div className="list-title-row">
                      <strong>{route.name}</strong>
                      <span className="pill">{formatPercent(route.occupancyRate)}</span>
                    </div>
                    <span>{route.tickets} ve</span>
                    <small>Doanh thu {formatCurrency(route.revenue)}</small>
                  </li>
                ))}
              </ul>
            </article>
          </section>

          <section className="page-section">
            <article className="data-card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Chuyen xe sap khoi hanh</p>
                  <h3>Danh sach uu tien theo doi trong 90 phut toi</h3>
                </div>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Ma chuyen</th>
                      <th>Tuyen</th>
                      <th>Gio xuat ben</th>
                      <th>Ben/Ghi chu</th>
                      <th>Ghe da giu</th>
                      <th>Tai xe</th>
                      <th>Trang thai</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.upcomingTrips.map((trip) => (
                      <tr key={trip.tripId}>
                        <td>{trip.code}</td>
                        <td>{trip.route}</td>
                        <td>{trip.departure}</td>
                        <td>{trip.gate}</td>
                        <td>{trip.seats}</td>
                        <td>{trip.driver}</td>
                        <td>
                          <span className="status-pill">{trip.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </section>

          <section className="page-section">
            <article className="data-card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Booking moi nhat</p>
                  <h3>Don dat ve vua duoc tao trong he thong</h3>
                </div>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Ma don</th>
                      <th>Khach hang</th>
                      <th>Tuyen</th>
                      <th>So ghe</th>
                      <th>So tien</th>
                      <th>Thanh toan</th>
                      <th>Thoi gian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.latestBookings.map((booking) => (
                      <tr key={booking.bookingId}>
                        <td>{booking.bookingCode}</td>
                        <td>{booking.customer}</td>
                        <td>{booking.route}</td>
                        <td>{booking.seats}</td>
                        <td>{formatCurrency(booking.amount)}</td>
                        <td>
                          <span className="status-pill alt">{booking.payment}</span>
                        </td>
                        <td>{booking.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </section>

          <section className="page-section">
            <article className="data-card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Canh bao he thong</p>
                  <h3>Nhung muc can theo doi trong ca truc</h3>
                </div>
              </div>

              <div className="alert-list">
                {data.alerts.map((alert) => (
                  <div className="alert-item" key={`${alert.level}-${alert.title}`}>
                    <div className="alert-level">{alert.level}</div>
                    <div>
                      <strong>{alert.title}</strong>
                      <p>{alert.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </>
      ) : null}
    </div>
  );
}

export default DashboardPage;
