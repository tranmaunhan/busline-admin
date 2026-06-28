import { useMemo, useState } from 'react';
import { adminApi } from '../api/adminApi';
import { useAdminResource } from '../hooks/useAdminResource';
import { formatCompactCurrency, formatCurrency, formatPercent } from '../utils/adminFormatters';

const CHART_WIDTH = 760;
const CHART_HEIGHT = 320;
const CHART_PADDING = {
  top: 24,
  right: 18,
  bottom: 48,
  left: 72,
};

function normalizeLabel(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function isCurrencyMetric(label) {
  const normalizedLabel = normalizeLabel(label);
  return (
    normalizedLabel.includes('doanh thu')
    || normalizedLabel.includes('tong gia tri')
    || normalizedLabel.includes('gia tri booking')
    || normalizedLabel.includes('tong tien')
    || normalizedLabel.includes('vnd')
  );
}

function formatDashboardMetricValue(label, value) {
  if (value === null || value === undefined || value === '') {
    return '--';
  }

  if (!isCurrencyMetric(label)) {
    return value;
  }

  const numericValue = Number(
    typeof value === 'string' ? value.replace(/[^\d.-]/g, '') : value,
  );

  if (Number.isNaN(numericValue)) {
    return value;
  }

  return formatCurrency(numericValue);
}

function buildYAxisTicks(maxValue) {
  const safeMax = Math.max(Number(maxValue || 0), 0);
  if (safeMax <= 0) {
    return [0, 1];
  }

  const intervals = 5;
  const roughStep = safeMax / intervals;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalized = roughStep / magnitude;

  let niceStep;
  if (normalized <= 1) {
    niceStep = 1;
  } else if (normalized <= 2) {
    niceStep = 2;
  } else if (normalized <= 2.5) {
    niceStep = 2.5;
  } else if (normalized <= 5) {
    niceStep = 5;
  } else {
    niceStep = 10;
  }

  const step = niceStep * magnitude;
  const top = step * intervals;

  return Array.from({ length: intervals + 1 }, (_, index) => index * step);
}

function RevenueBarChart({ series, updatedAtLabel }) {
  const [hoveredBar, setHoveredBar] = useState(null);

  const totalRevenue = useMemo(
    () => series.reduce((sum, item) => sum + Number(item.value || 0), 0),
    [series],
  );

  const averageRevenue = series.length ? totalRevenue / series.length : 0;
  const peakRevenue = series.length
    ? series.reduce((max, item) => (Number(item.value || 0) > Number(max.value || 0) ? item : max), series[0])
    : null;

  const yAxisTicks = useMemo(
    () => buildYAxisTicks(Math.max(...series.map((item) => Number(item.value || 0)), 0)),
    [series],
  );
  const chartMax = yAxisTicks[yAxisTicks.length - 1] || 1;
  const plotWidth = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
  const plotHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;
  const slotWidth = plotWidth / Math.max(series.length, 1);
  const barWidth = Math.min(54, slotWidth * 0.56);

  if (!series.length) {
    return (
      <div className="chart-empty-state">
        <strong>Chưa có dữ liệu doanh thu</strong>
        <span>Biểu đồ sẽ hiển thị khi hệ thống có dữ liệu tổng hợp theo ngày.</span>
      </div>
    );
  }

  return (
    <div className="chart-shell">
      <div className="chart-summary-row">
        <div className="chart-summary-card">
          <span>Tổng doanh thu 7 ngày</span>
          <strong>{formatCurrency(totalRevenue)}</strong>
          <small>Trung bình {formatCurrency(averageRevenue)} / ngày</small>
        </div>

        <div className="chart-summary-card subtle">
          <span>Ngày doanh thu cao nhất</span>
          <strong>{peakRevenue?.label || '--'}</strong>
          <small>{peakRevenue ? formatCurrency(peakRevenue.value) : 'Chưa có dữ liệu'}</small>
        </div>

        <div className="section-note">Cập nhật: {updatedAtLabel}</div>
      </div>

      <div
        className="revenue-chart-wrap"
        onMouseLeave={() => setHoveredBar(null)}
      >
        {hoveredBar ? (
          <div
            className="revenue-chart-tooltip"
            style={{
              left: `${hoveredBar.left}%`,
              top: `${hoveredBar.top}%`,
            }}
          >
            <strong>{hoveredBar.label}</strong>
            <span>{formatCurrency(hoveredBar.value)}</span>
          </div>
        ) : null}

        <svg
          className="revenue-chart-svg"
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          role="img"
          aria-label="Biểu đồ cột doanh thu 7 ngày gần nhất"
        >
          <defs>
            <linearGradient id="revenueBarGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fb923c" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
          </defs>

          {yAxisTicks.map((tick) => {
            const y =
              CHART_PADDING.top + plotHeight - (tick / chartMax) * plotHeight;

            return (
              <g key={tick}>
                <line
                  className="revenue-chart-grid"
                  x1={CHART_PADDING.left}
                  x2={CHART_WIDTH - CHART_PADDING.right}
                  y1={y}
                  y2={y}
                />
                <text
                  className="revenue-chart-axis-label"
                  x={CHART_PADDING.left - 12}
                  y={y + 4}
                  textAnchor="end"
                >
                  {formatCompactCurrency(tick)}
                </text>
              </g>
            );
          })}

          <line
            className="revenue-chart-axis"
            x1={CHART_PADDING.left}
            x2={CHART_PADDING.left}
            y1={CHART_PADDING.top}
            y2={CHART_PADDING.top + plotHeight}
          />
          <line
            className="revenue-chart-axis"
            x1={CHART_PADDING.left}
            x2={CHART_WIDTH - CHART_PADDING.right}
            y1={CHART_PADDING.top + plotHeight}
            y2={CHART_PADDING.top + plotHeight}
          />

          {series.map((item, index) => {
            const value = Number(item.value || 0);
            const height = value > 0 ? Math.max((value / chartMax) * plotHeight, 10) : 0;
            const x = CHART_PADDING.left + slotWidth * index + (slotWidth - barWidth) / 2;
            const y = CHART_PADDING.top + plotHeight - height;
            const centerX = x + barWidth / 2;

            return (
              <g key={item.label}>
                <rect
                  className="revenue-chart-bar"
                  x={x}
                  y={y}
                  width={barWidth}
                  height={height}
                  rx="14"
                  ry="14"
                />
                <rect
                  className="revenue-chart-hitbox"
                  x={x - Math.max((slotWidth - barWidth) / 2, 8)}
                  y={CHART_PADDING.top}
                  width={barWidth + Math.max(slotWidth - barWidth, 16)}
                  height={plotHeight}
                  onMouseEnter={() =>
                    setHoveredBar({
                      label: item.label,
                      value,
                      left: (centerX / CHART_WIDTH) * 100,
                      top: (Math.max(y - 18, CHART_PADDING.top + 16) / CHART_HEIGHT) * 100,
                    })
                  }
                />
                <text
                  className="revenue-chart-x-label"
                  x={centerX}
                  y={CHART_PADDING.top + plotHeight + 24}
                  textAnchor="middle"
                >
                  {item.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function DashboardPage() {
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const { data, loading, error, reload } = useAdminResource(
    (signal) => adminApi.getDashboard({ signal }),
    [],
  );

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
          <p className="eyebrow">Dashboard vận hành</p>
          <h3 className="hero-title">Tổng quan doanh thu, vé bán và chuyến xe trong ngày.</h3>
        </div>

        <div className="hero-metrics">
          {(data?.overviewStats ?? []).map((item) => (
            <div key={item.label}>
              <span>{item.label}</span>
              <strong>{formatDashboardMetricValue(item.label, item.value)}</strong>
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
                <strong>{formatDashboardMetricValue(card.label, card.value)}</strong>
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
              </div>

              <RevenueBarChart
                series={data.revenueSeries}
                updatedAtLabel={data.updatedAtLabel}
              />
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
