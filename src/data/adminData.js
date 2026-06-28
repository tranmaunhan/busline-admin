import {
  DashboardIcon,
  FleetIcon,
  RouteIcon,
  ScheduleIcon,
  StaffIcon,
  TicketIcon,
} from '../components/AdminIcons';

export const navItems = [
  {
    label: 'Tổng quan',
    icon: DashboardIcon,
    to: '/dashboard',
  },
  {
    label: 'Đặt vé',
    icon: TicketIcon,
    to: '/dat-ve',
  },
  {
    label: 'Lịch chạy',
    icon: ScheduleIcon,
    to: '/lich-chay',
  },
  {
    label: 'Tuyến xe',
    icon: RouteIcon,
    to: '/tuyen-xe',
  },
  {
    label: 'Đội xe',
    icon: FleetIcon,
    to: '/doi-xe',
  },
  {
    label: 'Người dùng',
    icon: StaffIcon,
    to: '/nhan-su',
  },
];
