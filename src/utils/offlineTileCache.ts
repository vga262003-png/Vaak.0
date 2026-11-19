// Offline OpenStreetMap (OSM) Local Tile Cache Engine
// Uses live user GPS coordinates to compute Slippy Map tiles (Zoom 12) and caches
// raster OSM tiles in CacheStorage + localStorage with offline SVG fallback.

import { getCachedGps } from './geolocation';

export interface CachedOsmTile {
  key: string;
  z: number;
  x: number;
  y: number;
  sizeBytes: number;
  dataUrl: string;
  source: 'osm_live' | 'offline_vector';
}

export interface OfflineTileCacheMeta {
  enabled: boolean;
  tileCount: number;
  totalKb: number;
  zoomRange: string;
  regionLabel: string;
  cachedAt: string;
  tiles: CachedOsmTile[];
}

const TILE_META_STORAGE_KEY = 'vaak_osm_tile_cache_v1';
const CACHE_NAME = 'vaak-osm-lowres-tiles-v1';

function latLngToSlippyTile(lat: number, lng: number, z: number): { x: number; y: number } {
  const n = Math.pow(2, z);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return {
    x: Math.max(0, Math.min(n - 1, x)),
    y: Math.max(0, Math.min(n - 1, y)),
  };
}

function buildDeterministicLowResOsmSvgTile(z: number, x: number, y: number): string {
  const seed = (z * 73856093) ^ (x * 19349663) ^ (y * 83492791);
  const roadOffsetA = 16 + (Math.abs(seed) % 36);
  const roadOffsetB = 48 + (Math.abs(seed >> 3) % 44);
  const riverCurve = 20 + (Math.abs(seed >> 6) % 70);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <rect width="128" height="128" fill="#0B1320"/>
    <path d="M0 ${riverCurve} Q 64 ${riverCurve + 18}, 128 ${riverCurve - 8}" stroke="#0EA5E9" stroke-opacity="0.22" stroke-width="6" fill="none"/>
    <path d="M0 ${roadOffsetA} L128 ${roadOffsetA + 10}" stroke="#38BDF8" stroke-opacity="0.24" stroke-width="1.5"/>
    <path d="M${roadOffsetB} 0 L${roadOffsetB - 12} 128" stroke="#64748B" stroke-opacity="0.32" stroke-width="1.5"/>
    <path d="M0 96 L128 84" stroke="#64748B" stroke-opacity="0.25" stroke-width="1"/>
    <rect x="${20 + (Math.abs(seed) % 24)}" y="${24 + (Math.abs(seed >> 2) % 24)}" width="14" height="10" rx="2" fill="#1E293B" stroke="#334155" stroke-width="0.6"/>
    <rect x="${74 + (Math.abs(seed >> 4) % 22)}" y="${62 + (Math.abs(seed >> 5) % 28)}" width="18" height="12" rx="2" fill="#1E293B" stroke="#334155" stroke-width="0.6"/>
    <text x="6" y="122" font-family="monospace" font-size="7" fill="#64748B">OSM z${z}/${x}/${y}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

async function fetchOsmRasterTileDataUrl(z: number, x: number, y: number): Promise<string | null> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2200);
  try {
    const resp = await fetch(`https://tile.openstreetmap.org/${z}/${x}/${y}.png`, {
      signal: controller.signal,
    });
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function loadOfflineTileCacheMeta(): OfflineTileCacheMeta | null {
  try {
    const raw = localStorage.getItem(TILE_META_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as OfflineTileCacheMeta;
  } catch {
    // Ignore storage unavailability
  }
  return null;
}

export function clearOfflineTileCache(): void {
  try {
    localStorage.removeItem(TILE_META_STORAGE_KEY);
    if (typeof caches !== 'undefined') {
      caches.delete(CACHE_NAME).catch(() => {});
    }
  } catch {
    // Ignore storage unavailability
  }
}

export async function downloadLowResOsmTileBundle(
  regionLabel: string,
  onProgress?: (pct: number) => void
): Promise<OfflineTileCacheMeta> {
  const z = 12;
  const gps = getCachedGps();
  const centerLat = gps?.lat ?? 28.6139;
  const centerLng = gps?.lng ?? 77.209;
  const centerTile = latLngToSlippyTile(centerLat, centerLng, z);
  const baseX = Math.max(0, centerTile.x - 1);
  const baseY = Math.max(0, centerTile.y - 1);

  const tiles: CachedOsmTile[] = [];
  const total = 16;
  let totalBytes = 0;

  let cacheStorage: Cache | null = null;
  try {
    if (typeof caches !== 'undefined') {
      cacheStorage = await caches.open(CACHE_NAME);
    }
  } catch {
    cacheStorage = null;
  }

  for (let dy = 0; dy < 4; dy++) {
    for (let dx = 0; dx < 4; dx++) {
      const idx = dy * 4 + dx + 1;
      const x = baseX + dx;
      const y = baseY + dy;
      const key = `${z}/${x}/${y}`;

      const rasterDataUrl = await fetchOsmRasterTileDataUrl(z, x, y);
      const dataUrl = rasterDataUrl || buildDeterministicLowResOsmSvgTile(z, x, y);
      const sizeBytes = dataUrl.length + 1024;
      totalBytes += sizeBytes;

      if (cacheStorage) {
        try {
          await cacheStorage.put(
            `/offline-osm/${z}/${x}/${y}`,
            new Response(dataUrl, {
              headers: { 'Content-Type': rasterDataUrl ? 'image/png' : 'image/svg+xml' },
            })
          );
        } catch {
          // Safe fallback to metadata cache
        }
      }

      tiles.push({
        key,
        z,
        x,
        y,
        sizeBytes,
        dataUrl,
        source: rasterDataUrl ? 'osm_live' : 'offline_vector',
      });
      if (onProgress) onProgress(Math.round((idx / total) * 100));
    }
  }

  const meta: OfflineTileCacheMeta = {
    enabled: true,
    tileCount: tiles.length,
    totalKb: Math.round((totalBytes / 1024) * 10) / 10,
    zoomRange: `Z12 (${centerLat.toFixed(2)}, ${centerLng.toFixed(2)})`,
    regionLabel,
    cachedAt: new Date().toTimeString().slice(0, 8),
    tiles,
  };

  try {
    localStorage.setItem(TILE_META_STORAGE_KEY, JSON.stringify(meta));
  } catch {
    // Ignore storage quota issues
  }

  return meta;
}
