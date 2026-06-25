import { adminApi } from '../api/adminApi';
import { useAdminResource } from '../hooks/useAdminResource';
import { formatCurrency, formatPercent } from '../utils/adminFormatters';

function DashboardPage() {
  const { data, loading, error, reload } = useAdminResource(
    (signal) => adminApi.getDashboard({ signal }),
    [],
  );

  const revenueSeries = data?.revenueSeries ?? [];
  const maxRevenue = revenueSeries.length
    ? Math.max(...revenueSeries.map((item) => Number(item.value || 0)), 1)
    : 1;

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Dashboard vận hành</p>
          <h3 className="hero-title">Tổng quan doanh thu, vé bán và chuyến xe trong ngày.</h3>
          <p className="hero-copy">
            Dữ liệu được tổng hợp từ booking, trip, route và vehicle hiện có trong hệ thống.
          </p>
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
          <strong>Đang tải dashboard...</strong>
          <span>Hệ thống đang tổng hợp số liệu admin mới nhất.</span>
        </div>
      ) : null}

      {error ? (
        <div className="empty-state-card">
          <strong>Không tải được dashboard</strong>
          <span>{error}</span>
          <button type="button" onClick={reload}>
            Thử tải lại
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
                  <h3>Biểu đồ doanh thu 7 ngày gần nhất</h3>
                </div>
                <div className="section-note">Cập nhật: {data.updatedAtLabel}</div>
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
                  <p className="eyebrow">Tuyến nổi bật</p>
                  <h3>Các tuyến đang có tốc độ bán vé cao</h3>
                </div>
              </div>

              <ul className="route-list">
                {data.topRoutes.map((route) => (
                  <li key={route.name}>
                    <div className="list-title-row">
                      <strong>{route.name}</strong>
                      <span className="pill">{formatPercent(route.occupancyRate)}</span>
                    </div>
                    <span>{route.tickets} vé</span>
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
                  <p className="eyebrow">Chuyến xe sắp khởi hành</p>
                  <h3>Danh sách ưu tiên theo dõi trong 90 phút tới</h3>
                </div>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Mã chuyến</th>
                      <th>Tuyến</th>
                      <th>Giờ xuất bến</th>
                      <th>Bến/Ghi chú</th>
                      <th>Ghế đã giữ</th>
                      <th>Tài xế</th>
                      <th>Trạng thái</th>
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
                  <p className="eyebrow">Booking mới nhất</p>
                  <h3>Đơn đặt vé vừa được tạo trong hệ thống</h3>
                </div>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Mã đơn</th>
                      <th>Khách hàng</th>
                      <th>Tuyến</th>
                      <th>Số ghế</th>
                      <th>Số tiền</th>
                      <th>Thanh toán</th>
                      <th>Thời gian</th>
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
                  <p className="eyebrow">Cảnh báo hệ thống</p>
                  <h3>Những mục cần theo dõi trong ca trực</h3>
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
