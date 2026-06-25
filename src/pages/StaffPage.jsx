import { adminApi } from '../api/adminApi';
import { useAdminResource } from '../hooks/useAdminResource';

function StaffPage() {
  const { data, loading, error, reload } = useAdminResource(
    (signal) => adminApi.getStaff({ signal }),
    [],
  );

  return (
    <div className="page-stack">
      {loading ? (
        <div className="empty-state-card">
          <strong>Đang tải dữ liệu nhân sự...</strong>
          <span>Hệ thống đang đọc danh sách người dùng và vai trò hiện có.</span>
        </div>
      ) : null}

      {error ? (
        <div className="empty-state-card">
          <strong>Không tải được thông tin nhân sự</strong>
          <span>{error}</span>
          <button type="button" onClick={reload}>
            Thử tải lại
          </button>
        </div>
      ) : null}

      {!loading && !error && data ? (
        <>
          <article className="data-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Nhân sự</p>
                <h3>Danh sách người dùng và vai trò vận hành</h3>
              </div>
            </div>

            <ul className="team-list large">
              {data.staff.map((member) => (
                <li key={member.userId}>
                  <div className="list-title-row">
                    <strong>{member.name}</strong>
                    <span className="pill">{member.status}</span>
                  </div>
                  <span>{member.role}</span>
                  <small>{member.focus}</small>
                  <small>
                    Liên hệ: {member.contact} - Tạo lúc: {member.joinedAt}
                  </small>
                </li>
              ))}
            </ul>
          </article>

          <article className="data-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Ghi chú dữ liệu</p>
                <h3>Phạm vi dữ liệu nhân sự hiện tại</h3>
              </div>
            </div>

            <div className="empty-state-card">
              <strong>Trạng thái hiện tại</strong>
              <span>{data.note}</span>
            </div>
          </article>
        </>
      ) : null}
    </div>
  );
}

export default StaffPage;
