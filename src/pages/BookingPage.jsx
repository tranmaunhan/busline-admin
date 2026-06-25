import TripTimetableBrowser from '../components/TripTimetableBrowser';

function BookingPage() {
  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Đặt vé</p>
          <h3 className="hero-title">Màn hình nền cho đặt vé vãng lai tại quầy.</h3>
          <p className="hero-copy">
            Trang này được tách riêng để sau này phát triển quy trình chọn chuyến, chọn ghế và tạo booking nhanh cho khách vãng lai.
          </p>
        </div>

        <div className="hero-metrics">
          <div>
            <span>Mục tiêu</span>
            <strong>Bán vé nhanh</strong>
            <p>Chọn ngày, lọc tuyến và xem các chuyến còn chỗ trống theo khung giờ.</p>
          </div>
          <div>
            <span>Định hướng tiếp theo</span>
            <strong>Booking tại quầy</strong>
            <p>Có thể mở rộng thành luồng đặt vé trực tiếp cho nhân viên phòng vé.</p>
          </div>
        </div>
      </section>

      <TripTimetableBrowser
        eyebrow="Thời khóa biểu đặt vé"
        title="Xem lịch xe theo từng ngày và từng khung giờ"
        description="Dữ liệu này sẽ là nền cho chức năng đặt vé tại quầy, đặt vé vãng lai và giữ ghế nhanh."
      />
    </div>
  );
}

export default BookingPage;
