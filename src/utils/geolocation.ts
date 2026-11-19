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
