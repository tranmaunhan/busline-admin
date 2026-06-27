import { normalizeVietnameseText, normalizeVietnameseTextInPayload } from '../utils/vietnameseText';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://api.aihost.io.vn/api';

export const ADMIN_AUTH_STORAGE_KEYS = {
  token: 'adminAuthToken',
  tokenType: 'adminAuthTokenType',
  expiresAt: 'adminAuthExpiresAt',
  user: 'adminUserData',
};

function buildUrl(path, params = {}) {
  const url = new URL(`${API_BASE_URL}${path}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'all') {
      url.searchParams.set(key, value);
    }
  });

  return url;
}

function getAdminAuthHeaders() {
  const token = localStorage.getItem(ADMIN_AUTH_STORAGE_KEYS.token);
  const tokenType = localStorage.getItem(ADMIN_AUTH_STORAGE_KEYS.tokenType) || 'Bearer';

  if (!token) {
    return {};
  }

  return {
    Authorization: `${tokenType} ${token}`,
  };
}

async function parseApiResponse(response, fallbackMessage) {
  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      clearAdminSession();
    }

    const error = new Error(
      normalizeVietnameseText(payload?.message)
      || (response.status === 401
        ? 'Bạn cần đăng nhập để tiếp tục.'
        : response.status === 403
          ? 'Tài khoản này không có quyền truy cập admin.'
          : fallbackMessage)
    );
    error.status = response.status;

    throw error;
  }

  return normalizeVietnameseTextInPayload(payload);
}

async function apiFetch(path, { method = 'GET', body, params, signal, auth = true } = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(auth ? getAdminAuthHeaders() : {}),
  };

  const response = await fetch(buildUrl(path, params), {
    method,
    headers,
    signal,
    body: body ? JSON.stringify(body) : undefined,
  });

  return parseApiResponse(response, 'Không tải được dữ liệu admin.');
}

export function clearAdminSession() {
  Object.values(ADMIN_AUTH_STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
  window.dispatchEvent(new Event('admin-auth-changed'));
}

export function saveAdminSession(authResponse) {
  localStorage.setItem(ADMIN_AUTH_STORAGE_KEYS.token, authResponse.accessToken);
  localStorage.setItem(ADMIN_AUTH_STORAGE_KEYS.tokenType, authResponse.tokenType);
  localStorage.setItem(
    ADMIN_AUTH_STORAGE_KEYS.expiresAt,
    String(Date.now() + Number(authResponse.expiresInMs || 0)),
  );
  localStorage.setItem(ADMIN_AUTH_STORAGE_KEYS.user, JSON.stringify(authResponse.user));
  window.dispatchEvent(new Event('admin-auth-changed'));
}

export function getStoredAdminUser() {
  const rawUser = localStorage.getItem(ADMIN_AUTH_STORAGE_KEYS.user);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch {
    clearAdminSession();
    return null;
  }
}

export function hasActiveAdminToken() {
  const token = localStorage.getItem(ADMIN_AUTH_STORAGE_KEYS.token);
  const expiresAt = Number(localStorage.getItem(ADMIN_AUTH_STORAGE_KEYS.expiresAt) || 0);

  return Boolean(token) && expiresAt > Date.now();
}

export const adminAuthApi = {
  login: ({ email, password }, signal) =>
    apiFetch('/admin/auth/login', {
      method: 'POST',
      body: { email, password },
      signal,
      auth: false,
    }),
  me: (signal) => apiFetch('/admin/auth/me', { signal }),
};

export const adminApi = {
  getDashboard: ({ signal } = {}) => apiFetch('/admin/dashboard', { signal }),
  deleteExpiredBookings: ({ signal } = {}) =>
    apiFetch('/admin/bookings/expired', {
      method: 'DELETE',
      signal,
    }),
  getSchedule: ({ date, originId, destinationId, signal } = {}) =>
    apiFetch('/admin/schedule', {
      params: { date, originId, destinationId },
      signal,
    }),
  getTripBookingSeatMap: (tripId, { pickupLocationId, dropoffLocationId, signal } = {}) =>
    apiFetch(`/admin/trips/${tripId}/booking-seat-map`, {
      params: { pickupLocationId, dropoffLocationId },
      signal,
    }),
  getBookingDetail: (bookingId, { signal } = {}) =>
    apiFetch(`/admin/bookings/${bookingId}`, {
      signal,
    }),
  updateBooking: (bookingId, payload, { signal } = {}) =>
    apiFetch(`/admin/bookings/${bookingId}`, {
      method: 'PUT',
      body: payload,
      signal,
    }),
  cancelBooking: (bookingId, { signal } = {}) =>
    apiFetch(`/admin/bookings/${bookingId}`, {
      method: 'DELETE',
      signal,
    }),
  createGuestBooking: (payload, { signal } = {}) =>
    apiFetch('/admin/bookings/guest', {
      method: 'POST',
      body: payload,
      signal,
    }),
  getTripSchedules: ({ signal } = {}) => apiFetch('/admin/trip-schedules', { signal }),
  getTripSchedule: (scheduleId, { signal } = {}) => apiFetch(`/admin/trip-schedules/${scheduleId}`, { signal }),
  createTripSchedule: (payload, { signal } = {}) =>
    apiFetch('/admin/trip-schedules', {
      method: 'POST',
      body: payload,
      signal,
    }),
  updateTripSchedule: (scheduleId, payload, { signal } = {}) =>
    apiFetch(`/admin/trip-schedules/${scheduleId}`, {
      method: 'PUT',
      body: payload,
      signal,
    }),
  deleteTripSchedule: (scheduleId, { signal } = {}) =>
    apiFetch(`/admin/trip-schedules/${scheduleId}`, {
      method: 'DELETE',
      signal,
    }),
  generateTripsFromSchedules: (payload, { signal } = {}) =>
    apiFetch('/admin/trip-schedules/generate', {
      method: 'POST',
      body: payload,
      signal,
    }),
  getRoutes: ({ signal } = {}) => apiFetch('/admin/routes', { signal }),
  getRouteDetail: (routeId, { signal } = {}) => apiFetch(`/admin/routes/${routeId}`, { signal }),
  createRoute: (payload, { signal } = {}) =>
    apiFetch('/admin/routes', {
      method: 'POST',
      body: payload,
      signal,
    }),
  updateRoute: (routeId, payload, { signal } = {}) =>
    apiFetch(`/admin/routes/${routeId}`, {
      method: 'PUT',
      body: payload,
      signal,
    }),
  deleteRoute: (routeId, { signal } = {}) =>
    apiFetch(`/admin/routes/${routeId}`, {
      method: 'DELETE',
      signal,
    }),
  createLocation: async (payload, { signal } = {}) => {
    try {
      return await apiFetch('/locations', {
        method: 'POST',
        body: payload,
        signal,
      });
    } catch (error) {
      if (error.status === 404 || error.status === 405) {
        return apiFetch('/admin/locations', {
          method: 'POST',
          body: payload,
          signal,
        });
      }

      throw error;
    }
  },
  getFleet: ({ signal } = {}) => apiFetch('/admin/fleet', { signal }),
  createVehicle: (payload, { signal } = {}) =>
    apiFetch('/admin/fleet/vehicles', {
      method: 'POST',
      body: payload,
      signal,
    }),
  updateVehicle: (vehicleId, payload, { signal } = {}) =>
    apiFetch(`/admin/fleet/vehicles/${vehicleId}`, {
      method: 'PUT',
      body: payload,
      signal,
    }),
  updateVehicleStatus: (vehicleId, status, { signal } = {}) =>
    apiFetch(`/admin/fleet/vehicles/${vehicleId}/status`, {
      method: 'PATCH',
      body: { status },
      signal,
    }),
  getStaff: ({ signal } = {}) => apiFetch('/admin/staff', { signal }),
};

export const publicApi = {
  getLocations: ({ signal } = {}) => apiFetch('/locations', { signal, auth: false }),
  searchTrips: ({ pickupLocationId, dropoffLocationId, departureDate, signal } = {}) =>
    apiFetch('/trips/search', {
      params: { pickupLocationId, dropoffLocationId, departureDate },
      signal,
      auth: false,
    }),
};
