export interface LiveGpsState {
  lat: number;
  lng: number;
  accuracyM?: number;
  updatedAt: number;
  source: 'gps' | 'unavailable';
}

let cachedGps: LiveGpsState | null = null;

export function formatCoordinates(lat: number, lng: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
}

export function buildMapsLink(lat: number, lng: number): string {
  return `https://maps.google.com/?q=${lat.toFixed(5)},${lng.toFixed(5)}`;
}

export function getCachedGps(): LiveGpsState | null {
  return cachedGps;
}

export function requestLiveGps(timeoutMs = 3000): Promise<LiveGpsState | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve(cachedGps);
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        cachedGps = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyM: Math.round(pos.coords.accuracy),
          updatedAt: Date.now(),
          source: 'gps',
        };
        resolve(cachedGps);
      },
      () => {
        resolve(cachedGps);
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60000 }
    );
  });
}

export function formatLiveLocationSummary(gps: LiveGpsState | null): {
  coordsText: string;
  mapLine: string;
} {
  if (gps && gps.source === 'gps') {
    const coordsText = formatCoordinates(gps.lat, gps.lng);
    const mapUrl = buildMapsLink(gps.lat, gps.lng);
    return {
      coordsText,
      mapLine: `📍 GPS: ${coordsText}\n🗺️ Live Map: ${mapUrl}`,
    };
  }
  return {
    coordsText: 'GPS pending permission',
    mapLine: '📍 GPS: Location permission not granted on this device yet',
  };
}

export function computeDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.max(0.05, Math.round(R * c * 100) / 100);
}

export function computeBearingDeg(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dLambda = ((lng2 - lng1) * Math.PI) / 180;
  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  const deg = (Math.atan2(y, x) * 180) / Math.PI;
  return Math.round((deg + 360) % 360);
}

export function computeFallbackSector(nodeId: string): { distanceKm: number; bearingDeg: number } {
  let h = 2166136261;
  for (let i = 0; i < nodeId.length; i++) {
    h ^= nodeId.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const distanceKm = Math.round((0.6 + ((h % 85) / 10)) * 10) / 10;
  const bearingDeg = Math.round(((h >>> 8) % 360));
  return { distanceKm, bearingDeg };
}
