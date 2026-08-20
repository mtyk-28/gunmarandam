import { SPOTS } from '../data/spots';
import type { TransportType, TravelStyle, Spot } from '../types';

const TRANSPORT_MAX_DISTANCE: Record<TransportType, number> = {
  car: 999,
  train: 999,
  bicycle: 25,
  walking: 3,
};

const STYLE_CATEGORY_MAP: Record<TravelStyle, string[]> = {
  random: [],
  nature: ['nature'],
  onsen: ['onsen'],
  gourmet: ['gourmet'],
  photo: ['nature', 'history', 'urban'],
  active: ['nature', 'leisure'],
};

const DEFAULT_LAT = 36.3895;
const DEFAULT_LNG = 139.0634;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isTransportOK(
  spot: Spot,
  transports: TransportType[] | 'any',
  dist: number
): boolean {
  if (transports === 'any' || !Array.isArray(transports)) return true;
  return transports.some(
    t => spot.transports.includes(t) && dist <= TRANSPORT_MAX_DISTANCE[t]
  );
}

export function drawGacha(
  transports: TransportType[] | 'any',
  style: TravelStyle,
  visitedIds: string[],
  userLat?: number,
  userLng?: number
): Spot | null {
  const fromLat = userLat ?? DEFAULT_LAT;
  const fromLng = userLng ?? DEFAULT_LNG;
  const styleCategories = STYLE_CATEGORY_MAP[style];
  const visitedSet = new Set(visitedIds);

  function isStyleOK(spot: Spot): boolean {
    if (styleCategories.length === 0) return true;
    return spot.categories.some(c => styleCategories.includes(c));
  }

  let candidates = SPOTS.filter(spot => {
    if (visitedSet.has(spot.id)) return false;
    const dist = haversineKm(fromLat, fromLng, spot.lat, spot.lng);
    return isTransportOK(spot, transports, dist) && isStyleOK(spot);
  });

  if (candidates.length === 0) {
    candidates = SPOTS.filter(spot => {
      const dist = haversineKm(fromLat, fromLng, spot.lat, spot.lng);
      return isTransportOK(spot, transports, dist);
    });
  }

  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function getEligibleCount(
  transports: TransportType[] | 'any',
  userLat?: number,
  userLng?: number
): number {
  if (transports === 'any') return SPOTS.length;
  const fromLat = userLat ?? DEFAULT_LAT;
  const fromLng = userLng ?? DEFAULT_LNG;
  return SPOTS.filter(spot => {
    const dist = haversineKm(fromLat, fromLng, spot.lat, spot.lng);
    return isTransportOK(spot, transports, dist);
  }).length;
}

/** Pick the "best" single TransportType from multiple to store on a visit */
export function choosePrimaryTransport(
  spot: Spot,
  transports: TransportType[] | 'any'
): TransportType {
  const ORDER: TransportType[] = ['car', 'train', 'bicycle', 'walking'];
  if (transports === 'any') {
    return ORDER.find(t => spot.transports.includes(t)) ?? 'car';
  }
  return (
    ORDER.find(t => (transports as TransportType[]).includes(t) && spot.transports.includes(t)) ??
    (transports as TransportType[])[0]
  );
}
