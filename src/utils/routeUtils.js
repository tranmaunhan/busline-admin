export function createEmptyRouteStop() {
  return {
    locationId: '',
    distanceFromStartKm: '',
    estimatedTimeFromStartMinutes: '',
  };
}

export function createDefaultRouteForm() {
  return {
    stops: [
      { locationId: '', distanceFromStartKm: '0', estimatedTimeFromStartMinutes: '0' },
      createEmptyRouteStop(),
    ],
    segmentPrices: [
      {
        pickupStopOrder: '1',
        dropoffStopOrder: '2',
        price: '',
      },
    ],
  };
}

export function createRouteFormFromDetail(routeDetail) {
  const stops = (routeDetail?.stops ?? []).map((stop) => ({
    locationId: String(stop.locationId ?? ''),
    distanceFromStartKm: String(stop.distanceFromStartKm ?? 0),
    estimatedTimeFromStartMinutes: String(stop.estimatedTimeFromStartMinutes ?? 0),
  }));

  const segmentPrices = (routeDetail?.segmentPrices ?? []).map((item) => ({
    pickupStopOrder: String(item.pickupStopOrder ?? 1),
    dropoffStopOrder: String(item.dropoffStopOrder ?? 2),
    price: String(item.price ?? ''),
  }));

  return {
    stops: stops.length >= 2 ? stops : createDefaultRouteForm().stops,
    segmentPrices: segmentPrices.length > 0
      ? segmentPrices
      : [{ pickupStopOrder: '1', dropoffStopOrder: '2', price: '' }],
  };
}

export const LOCATION_TYPE_OPTIONS = [
  { value: 'STATION', label: 'Bến xe' },
  { value: 'STOP', label: 'Điểm đón / trả' },
];

export function createLocationDraft(stopIndex) {
  return {
    stopIndex,
    name: '',
    address: '',
    type: 'STOP',
  };
}

export function normalizeCreatedLocation(response, fallbackPayload) {
  if (!response || typeof response !== 'object') {
    return null;
  }

  const location = response.location ?? response.data ?? response;
  const id = location.id ?? location.locationId;

  if (!id) {
    return null;
  }

  return {
    id,
    name: location.name ?? fallbackPayload.name,
    address: location.address ?? fallbackPayload.address,
    type: location.type ?? fallbackPayload.type,
  };
}
