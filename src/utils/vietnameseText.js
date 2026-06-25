const EXACT_TEXT_MAP = new Map([
  ['Bao tri / sua chua', 'Bảo trì / sửa chữa'],
  ['Bao tri/dang sua', 'Bảo trì/đang sửa'],
  ['Ca cao diem sang', 'Ca cao điểm sáng'],
  ['Ca chieu', 'Ca chiều'],
  ['Ca sang som', 'Ca sáng sớm'],
  ['Ca toi', 'Ca tối'],
  ['Ca trua', 'Ca trưa'],
  ['Cho thanh toan', 'Chờ thanh toán'],
  ['Chua cap nhat', 'Chưa cập nhật'],
  ['Chua cau hinh ben', 'Chưa cấu hình bến'],
  ['Chua cau hinh loai xe', 'Chưa cấu hình loại xe'],
  ['Chua co bien so', 'Chưa có biển số'],
  ['Chua co du lieu chuyen', 'Chưa có dữ liệu chuyến'],
  ['Chua co du lieu ghe cho cac chuyen trong ngay', 'Chưa có dữ liệu ghế cho các chuyến trong ngày'],
  ['Chua co ghe', 'Chưa có ghế'],
  ['Chua co hang xe', 'Chưa có hãng xe'],
  ['Chua co lien he', 'Chưa có liên hệ'],
  ['Chua co loai xe', 'Chưa có loại xe'],
  ['Chua co ten', 'Chưa có tên'],
  ['Chua dat ten', 'Chưa đặt tên'],
  ['Chua gan tai xe', 'Chưa gán tài xế'],
  ['Chua gan vai tro', 'Chưa gán vai trò'],
  ['Chua gan xe', 'Chưa gán xe'],
  ['Chua ro', 'Chưa rõ'],
  ['Chua ro diem den', 'Chưa rõ điểm đến'],
  ['Chua ro diem di', 'Chưa rõ điểm đi'],
  ['Chua xac dinh', 'Chưa xác định'],
  ['Chua xac dinh tuyen', 'Chưa xác định tuyến'],
  ['Dang hoat dong', 'Đang hoạt động'],
  ['Dang khai thac', 'Đang khai thác'],
  ['Dang mo ban', 'Đang mở bán'],
  ['Da thanh toan', 'Đã thanh toán'],
  ['Don cho thanh toan', 'Đơn chờ thanh toán'],
  ['Doanh thu hom nay', 'Doanh thu hôm nay'],
  ['Gan kin cho', 'Gần kín chỗ'],
  ['Hoat dong gan nhat', 'Hoạt động gần nhất'],
  ['Hom nay', 'Hôm nay'],
  ['Khach hang', 'Khách hàng'],
  ['Khach le', 'Khách lẻ'],
  ['Khong xac dinh', 'Không xác định'],
  ['Kin cho', 'Kín chỗ'],
  ['Lich chay ngay', 'Lịch chạy ngày'],
  ['Ngay mai', 'Ngày mai'],
  ['Ngung hoat dong', 'Ngừng hoạt động'],
  ['Nhan vien', 'Nhân viên'],
  ['Quan tri', 'Quản trị'],
  ['Sap khoi hanh', 'Sắp khởi hành'],
  ['So chuyen hom nay', 'Số chuyến hôm nay'],
  ['So ve dang giu/ban', 'Số vé đang giữ/bán'],
  ['Tai xe', 'Tài xế'],
  ['Tam khoa', 'Tạm khóa'],
  ['Thong tin', 'Thông tin'],
  ['Ti le lap day', 'Tỉ lệ lấp đầy'],
  ['Tong so xe', 'Tổng số xe'],
  ['Trung binh', 'Trung bình'],
  ['Ve giu/ban', 'Vé giữ/bán'],
  ['Xe can theo doi', 'Xe cần theo dõi'],
  ['Xe chua duoc cau hinh loai xe', 'Xe chưa được cấu hình loại xe'],
  ['Xe du phong', 'Xe dự phòng'],
]);

const PHRASE_REPLACEMENTS = [
  [/\bCap nhat luc\b/g, 'Cập nhật lúc'],
  [/\bCan theo doi cac xe co trang thai bao tri\b/g, 'Cần theo dõi các xe có trạng thái bảo trì'],
  [/\bCan theo doi de tranh het han giu ghe\b/g, 'Cần theo dõi để tránh hết hạn giữ ghế'],
  [/\bCan xac nhan kha nang thay the bang xe du phong truoc khi day lich them\b/g, 'Cần xác nhận khả năng thay thế bằng xe dự phòng trước khi đẩy lịch thêm'],
  [/\bChua co chuyen nao phu hop voi bo loc da chon\b/g, 'Chưa có chuyến nào phù hợp với bộ lọc đã chọn'],
  [/\bChua co chuyen nao trong ngay\b/g, 'Chưa có chuyến nào trong ngày'],
  [/\bChua co du lieu ghe cho cac chuyen trong ngay\b/g, 'Chưa có dữ liệu ghế cho các chuyến trong ngày'],
  [/\bChua co truong phan ca va mo ta cong viec rieng trong co so du lieu hien tai\b/g, 'Chưa có trường phân ca và mô tả công việc riêng trong cơ sở dữ liệu hiện tại'],
  [/\bChua ghi nhan canh bao nghiem trong\b/g, 'Chưa ghi nhận cảnh báo nghiêm trọng'],
  [/\bCo ([0-9]+) chuyen\b/g, 'Có $1 chuyến'],
  [/\bCo diem dung khong ton tai trong he thong\b/g, 'Có điểm dừng không tồn tại trong hệ thống'],
  [/\bCo the uu tien dieu dong neu co chuyen can tang cuong trong gio cao diem\b/g, 'Có thể ưu tiên điều động nếu có chuyến cần tăng cường trong giờ cao điểm'],
  [/\bDashboard dang cho thay he thong van hanh on dinh trong khung hien tai\b/g, 'Dashboard đang cho thấy hệ thống vận hành ổn định trong khung hiện tại'],
  [/\bDiem dung dau tien phai co khoang cach va thoi gian bang 0\b/g, 'Điểm dừng đầu tiên phải có khoảng cách và thời gian bằng 0'],
  [/\bDieu phoi tong quan va theo doi dashboard van hanh\b/g, 'Điều phối tổng quan và theo dõi dashboard vận hành'],
  [/\bDoanh thu hom nay\b/g, 'Doanh thu hôm nay'],
  [/\bHe thong hien chua co bang phan ca rieng, nen man hinh nhan su dang hien thi du lieu nguoi dung va vai tro thuc te\./g, 'Hệ thống hiện chưa có bảng phân ca riêng, nên màn hình nhân sự đang hiển thị dữ liệu người dùng và vai trò thực tế.'],
  [/\bHo tro van hanh, xu ly booking va cap nhat thong tin chuyen\b/g, 'Hỗ trợ vận hành, xử lý booking và cập nhật thông tin chuyến'],
  [/\bKhong co booking treo trong ngay\b/g, 'Không có booking treo trong ngày'],
  [/\bKhong co don nao can nhac thanh toan\b/g, 'Không có đơn nào cần nhắc thanh toán'],
  [/\bKhong duoc khai bao trung muc gia cho cung mot cap diem dung\b/g, 'Không được khai báo trùng mức giá cho cùng một cặp điểm dừng'],
  [/\bKhong duoc lap diem dung trong cung mot tuyen\b/g, 'Không được lặp điểm dừng trong cùng một tuyến'],
  [/\bKhong tim thay lich chay voi id:/g, 'Không tìm thấy lịch chạy với id:'],
  [/\bKhong tim thay loai xe voi id =/g, 'Không tìm thấy loại xe với id ='],
  [/\bKhong tim thay tuyen voi id =/g, 'Không tìm thấy tuyến với id ='],
  [/\bKhong tim thay xe voi id =/g, 'Không tìm thấy xe với id ='],
  [/\bLich chay ngay\b/g, 'Lịch chạy ngày'],
  [/\bNen doi soat de tranh het han giu ghe o cac chuyen gan gio chay\b/g, 'Nên đối soát để tránh hết hạn giữ ghế ở các chuyến gần giờ chạy'],
  [/\bNgay ket thuc khong duoc truoc ngay bat dau\b/g, 'Ngày kết thúc không được trước ngày bắt đầu'],
  [/\bPhu trach cac chuyen duoc phan cong trong he thong\b/g, 'Phụ trách các chuyến được phân công trong hệ thống'],
  [/\bSo ve dang giu\/ban\b/g, 'Số vé đang giữ/bán'],
  [/\bTi le lap day hien tai dat\b/g, 'Tỉ lệ lấp đầy hiện tại đạt'],
  [/\bTi le lap day\b/g, 'Tỉ lệ lấp đầy'],
  [/\bTinh theo toan bo ticket con ton tai tren cac chuyen trong ngay\b/g, 'Tính theo toàn bộ ticket còn tồn tại trên các chuyến trong ngày'],
  [/\bTong gia tri booking da thanh toan trong ngay\b/g, 'Tổng giá trị booking đã thanh toán trong ngày'],
  [/\bTrang thai xe chi nhan ACTIVE, MAINTENANCE hoac RESERVE\b/g, 'Trạng thái xe chỉ nhận ACTIVE, MAINTENANCE hoặc RESERVE'],
  [/\bTrang thai xe khong duoc de trong\b/g, 'Trạng thái xe không được để trống'],
  [/\bTrang thai\b/g, 'Trạng thái'],
  [/\bTuyen xe phai co it nhat 2 diem dung\b/g, 'Tuyến xe phải có ít nhất 2 điểm dừng'],
  [/\bXe chua duoc cau hinh loai xe\b/g, 'Xe chưa được cấu hình loại xe'],
  [/\bchua xac dinh\b/g, 'chưa xác định'],
  [/\b(?:chuyen|chuyến) da roi ben\b/g, 'chuyến đã rời bến'],
  [/\b(?:chuyen|chuyến) da xuat ben\b/g, 'chuyến đã xuất bến'],
  [/\bchuyen con lai\b/g, 'chuyến còn lại'],
  [/\bchuyen nao trong ngay\b/g, 'chuyến nào trong ngày'],
  [/\bchuyen phu hop voi bo loc da chon\b/g, 'chuyến phù hợp với bộ lọc đã chọn'],
  [/\bchuyen trong ngay\b/g, 'chuyến trong ngày'],
  [/\bcon ton tai tren cac chuyen\b/g, 'còn tồn tại trên các chuyến'],
  [/\bda duoc danh dau san sang\b/g, 'đã được đánh dấu sẵn sàng'],
  [/\bda duoc giu hoac thanh toan\b/g, 'đã được giữ hoặc thanh toán'],
  [/\bdang cho thanh toan trong hom nay\b/g, 'đang chờ thanh toán trong hôm nay'],
  [/\bdang co nhu cau cao nhat\b/g, 'đang có nhu cầu cao nhất'],
  [/\bdang giu cho\b/g, 'đang giữ chỗ'],
  [/\bdang o trang thai bao tri hoac can sua\b/g, 'đang ở trạng thái bảo trì hoặc cần sửa'],
  [/\bdieu dong\b/g, 'điều động'],
  [/\bdu lieu so sanh voi hom qua\b/g, 'dữ liệu so sánh với hôm qua'],
  [/\bghe da duoc giu hoac thanh toan\b/g, 'ghế đã được giữ hoặc thanh toán'],
  [/\bghe da duoc giu\b/g, 'ghế đã được giữ'],
  [/\bgio cao diem\b/g, 'giờ cao điểm'],
  [/\bhien tai dat\b/g, 'hiện tại đạt'],
  [/\bhom qua\b/g, 'hôm qua'],
  [/\bkhung dong nhat la\b/g, 'khung đông nhất là'],
  [/\blap day hien tai dat\b/g, 'lấp đầy hiện tại đạt'],
  [/\bso voi hom qua\b/g, 'so với hôm qua'],
  [/\btrong 7 ngay gan day\b/g, 'trong 7 ngày gần đây'],
  [/\btrong ngay\b/g, 'trong ngày'],
  [/\bTrung binh\b/g, 'Trung bình'],
  [/\btrung binh\b/g, 'trung bình'],
  [/\bve\/chuyen\b/g, 'vé/chuyến'],
  [/\bxe bao tri\b/g, 'xe bảo trì'],
  [/\bxe du phong\b/g, 'xe dự phòng'],
  [/\bChua co\b/g, 'Chưa có'],
  [/\bTuyen\b/g, 'Tuyến'],
  [/\bTi le\b/g, 'Tỉ lệ'],
  [/\bdu lieu\b/g, 'dữ liệu'],
  [/\bcac chuyen\b/g, 'các chuyến'],
  [/\bghe\b/g, 'ghế'],
  [/\bve\b/g, 'vé'],
];

const SKIPPED_PAYLOAD_KEYS = new Set([
  'accessToken',
  'bookingCode',
  'code',
  'email',
  'expiresInMs',
  'id',
  'licensePlate',
  'password',
  'phone',
  'refreshToken',
  'token',
  'tokenType',
]);

export function normalizeVietnameseText(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return value;
  }

  const exact = EXACT_TEXT_MAP.get(value);
  if (exact) {
    return exact;
  }

  let normalized = value;

  PHRASE_REPLACEMENTS.forEach(([pattern, replacement]) => {
    normalized = normalized.replace(pattern, replacement);
  });

  return EXACT_TEXT_MAP.get(normalized) ?? normalized;
}

export function normalizeVietnameseTextInPayload(payload, key) {
  if (SKIPPED_PAYLOAD_KEYS.has(key)) {
    return payload;
  }

  if (Array.isArray(payload)) {
    return payload.map((item) => normalizeVietnameseTextInPayload(item));
  }

  if (!payload || typeof payload !== 'object') {
    return normalizeVietnameseText(payload);
  }

  return Object.fromEntries(
    Object.entries(payload).map(([entryKey, value]) => [
      entryKey,
      normalizeVietnameseTextInPayload(value, entryKey),
    ]),
  );
}
