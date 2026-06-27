import { useNavigate } from 'react-router-dom';
import TripTimetableBrowser from '../components/TripTimetableBrowser';

function BookingPage() {
  const navigate = useNavigate();

  return (
    <div className="page-stack">
      <TripTimetableBrowser
        eyebrow="Đặt vé"
        title="Thời khóa biểu đặt vé"
        description="Chọn ngày, điểm đi và điểm đến để tìm chuyến phù hợp. Luồng booking hiện đã hỗ trợ khách vãng lai nhập thông tin liên hệ, email nhận vé điện tử và giữ chỗ theo hạn thanh toán."
        onSelectTrip={(trip, context) => {
          navigate(`/dat-ve/chuyen/${trip.tripId}`, {
            state: {
              trip,
              context,
            },
          });
        }}
      />
    </div>
  );
}

export default BookingPage;
