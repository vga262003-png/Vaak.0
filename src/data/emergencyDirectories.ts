import {
  CachedEmergencyDirectory,
  ConnectRequestLog,
  CountryOption,
  VaakContactUser,
} from '../types/app';

const STORAGE_PREFIX = 'vaak_emergency_dir_v2_';

export function buildFallbackDirectory(country: CountryOption): CachedEmergencyDirectory {
  return {
    iso: country.iso,
    regionName: `${country.name} Regional Gateway`,
    syncedAt: 'Offline Cache Ready',
    source: 'cached_offline',
    services: [
      {
        id: `em-${country.iso}-1`,
        category: 'Police',
        name: `${country.name} Police Control`,
        phone: country.policeNumber || country.emergencyNumber,
        radioChannel: `CH-${country.emergencyNumber}-POL`,
        distanceKm: 1.4,
        availability: '24x7 Dispatch',
      },
      {
        id: `em-${country.iso}-2`,
        category: 'Ambulance',
        name: 'Emergency Ambulance Fleet',
        phone: country.ambulanceNumber || country.emergencyNumber,
        radioChannel: `CH-${country.ambulanceNumber}-MED`,
        distanceKm: 2.1,
        availability: '24x7 Critical',
      },
      {
        id: `em-${country.iso}-3`,
        category: 'Nearest Hospitals',
        name: 'Nearest Trauma & General Hospital',
        phone: country.iso === 'IN' ? '102' : country.ambulanceNumber || country.emergencyNumber,
        radioChannel: 'CH-HOSP-ER',
        distanceKm: 1.8,
        availability: 'ER Open 24h',
      },
      {
        id: `em-${country.iso}-4`,
        category: 'Disaster Rescue (NDRF)',
        name: country.iso === 'IN' ? 'NDRF Disaster Rescue' : 'National Disaster Rescue',
        phone: country.iso === 'IN' ? '1078' : country.emergencyNumber,
        radioChannel: 'MESH-NDRF-04',
        distanceKm: 3.2,
        availability: 'Active Squad',
      },
      {
        id: `em-${country.iso}-5`,
        category: 'Fire Brigade',
        name: 'Fire & Rescue Brigade',
        phone: country.iso === 'IN' ? '101' : country.emergencyNumber,
        radioChannel: 'CH-101-FIR',
        distanceKm: 2.4,
        availability: '24x7 Rapid',
      },
      {
        id: `em-${country.iso}-6`,
        category: 'Govt Helplines',
        name: country.iso === 'IN' ? 'Women (1090) & Govt Helpline' : 'Govt Crisis Helplines',
        phone: country.iso === 'IN' ? '1090' : country.emergencyNumber,
        radioChannel: 'CH-GOV-HELP',
        distanceKm: 1.7,
        availability: '24x7 Verified',
      },
    ],
  };
}

export function loadCachedEmergencyDirectory(country: CountryOption): CachedEmergencyDirectory {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${country.iso}`);
    if (raw) {
      const parsed = JSON.parse(raw) as CachedEmergencyDirectory;
      return { ...parsed, source: 'cached_offline' };
    }
  } catch {
    // Fallback cleanly if storage unavailable
  }
  return buildFallbackDirectory(country);
}

export function saveCachedEmergencyDirectory(dir: CachedEmergencyDirectory): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${dir.iso}`, JSON.stringify(dir));
  } catch {
    // Ignore storage quota errors
  }
}

export const INITIAL_VAAK_CONTACTS: VaakContactUser[] = [];

export const INITIAL_CONNECT_REQUESTS: ConnectRequestLog[] = [];
