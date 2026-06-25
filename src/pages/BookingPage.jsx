import TripTimetableBrowser from '../components/TripTimetableBrowser';

function BookingPage() {
  return (
    <div className="page-stack">
      <TripTimetableBrowser
      eyebrow="Đặt vé"
      title="Thời khóa biểu đặt vé"
      description="Chọn ngày, điểm đi và điểm đến để tìm chuyến phù hợp. Khi chọn đủ hai điểm, hệ thống dùng API đặt vé của trang người dùng để tìm được cả các chặng dọc tuyến."
      />
    </div>
  );
}

export default BookingPage;
