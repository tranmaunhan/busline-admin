export const SCHEDULE_TIME_SLOTS = [
  { slot: 'Sang', subtitle: '00:00 - 10:59', from: 0, to: 10 },
  { slot: 'Trua', subtitle: '11:00 - 13:59', from: 11, to: 13 },
  { slot: 'Chieu', subtitle: '14:00 - 17:59', from: 14, to: 17 },
  { slot: 'Toi', subtitle: '18:00 - 23:59', from: 18, to: 23 },
];

export function getLocalDateValue(date = new Date()) {
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0, 10);
}

export function createScheduleForm() {
  const today = getLocalDateValue();

  return {
    routeId: '',
    vehicleId: '',
    departureTime: '08:00',
    startDate: today,
    endDate: '',
    status: '1',
  };
}

export function formatScheduleTime(value) {
  if (!value) {
    return '--:--';
  }

  return String(value).slice(0, 5);
}

export function formatScheduleDate(value, fallback = 'Khong gioi han') {
  if (!value) {
    return fallback;
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function isActiveSchedule(schedule) {
  return Number(schedule?.status) === 1;
}

export function createScheduleFormFromSchedule(schedule) {
  return {
    routeId: String(schedule?.routeId ?? ''),
    vehicleId: String(schedule?.vehicleId ?? ''),
    departureTime: formatScheduleTime(schedule?.departureTime),
    startDate: schedule?.startDate ?? getLocalDateValue(),
    endDate: schedule?.endDate ?? '',
    status: String(schedule?.status ?? 0),
  };
}

export function getScheduleHour(schedule) {
  const rawTime = formatScheduleTime(schedule?.departureTime);
  const hour = Number(rawTime.slice(0, 2));
  return Number.isFinite(hour) ? hour : 0;
}

export function groupSchedulesBySlot(schedules) {
  return SCHEDULE_TIME_SLOTS.map((slot) => ({
    slot: slot.slot,
    subtitle: slot.subtitle,
    schedules: schedules
      .filter((schedule) => {
        const hour = getScheduleHour(schedule);
        return hour >= slot.from && hour <= slot.to;
      })
      .slice()
      .sort((left, right) => {
        const leftTime = formatScheduleTime(left.departureTime);
        const rightTime = formatScheduleTime(right.departureTime);

        if (leftTime !== rightTime) {
          return leftTime.localeCompare(rightTime);
        }

        return `${left.routeName}-${left.vehicleLabel}`.localeCompare(
          `${right.routeName}-${right.vehicleLabel}`,
          'vi',
        );
      }),
  }));
}
