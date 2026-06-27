import { useNavigate } from 'react-router-dom';
import TripTimetableBrowser from '../components/TripTimetableBrowser';

function BookingPage() {
  const navigate = useNavigate();

  return (
    <div className="page-stack">
      <TripTimetableBrowser
        eyebrow="Dat ve"
        title="Thoi khoa bieu dat ve"
        description="Chon ngay, diem di va diem den de tim chuyen phu hop. Luong booking hien da ho tro khach vang lai nhap thong tin lien he, email nhan ve dien tu va giu cho theo han thanh toan."
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
