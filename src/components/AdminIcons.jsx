function createIcon(path) {
  return function Icon({ className = 'nav-svg-icon' }) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d={path}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };
}

export const DashboardIcon = createIcon('M4 13.5h6.5V20H4v-6.5Zm9.5-9.5H20v16h-6.5V4ZM4 4h6.5v6.5H4V4Zm9.5 12H20');
export const TicketIcon = createIcon('M5 8.5A2.5 2.5 0 0 0 7.5 6H18a2 2 0 0 1 2 2v2a2.5 2.5 0 0 0 0 4v2a2 2 0 0 1-2 2H7.5A2.5 2.5 0 0 0 5 20V8.5Zm6-2.5v12m3-12v12');
export const ScheduleIcon = createIcon('M8 3v3m8-3v3M5 8h14M6 5h12a1 1 0 0 1 1 1v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1Zm2.5 6h2m2 0h2m-6 4h2m2 0h2');
export const RouteIcon = createIcon('M6 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm12-12a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM7.8 15.3l8.4-8.6M10 18h8a2 2 0 0 0 2-2V9');
export const FleetIcon = createIcon('M4 15V9.5A2.5 2.5 0 0 1 6.5 7H15l3 3h1a2 2 0 0 1 2 2v3H4Zm2 4a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm12 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z');
export const StaffIcon = createIcon('M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 7a6 6 0 0 1 12 0M18 10a2.5 2.5 0 1 0 0-5m2.5 13a4.5 4.5 0 0 0-4.5-4.5');
export const CollapseIcon = createIcon('M15 5l-6 7 6 7M5 5v14');
export const ExpandIcon = createIcon('M9 5l6 7-6 7M19 5v14');
export const LogoutIcon = createIcon('M10 7V5a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2v-2M15 12H4m0 0 3-3m-3 3 3 3');
