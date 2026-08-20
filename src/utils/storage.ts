import type { UserState, Visit, TransportType, TravelStyle } from '../types';

const STORAGE_KEY = 'gunma_gacha_state';

const defaultState: UserState = {
  visits: [],
  totalPoints: 0,
  currentSpotId: null,
  currentTransport: null,
  currentStyle: null,
};

export function loadState(): UserState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    return { ...defaultState, ...JSON.parse(raw) };
  } catch {
    return defaultState;
  }
}

export function saveState(state: UserState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function addVisit(visit: Visit): UserState {
  const state = loadState();
  const existing = state.visits.findIndex(v => v.spotId === visit.spotId);
  if (existing >= 0) {
    state.visits[existing] = visit;
  } else {
    state.visits.push(visit);
  }
  state.totalPoints = state.visits.reduce((sum, v) => sum + v.points, 0);
  saveState(state);
  return state;
}

export function updateCurrentSpot(spotId: string, transport: TransportType, style: TravelStyle): void {
  const state = loadState();
  state.currentSpotId = spotId;
  state.currentTransport = transport;
  state.currentStyle = style;
  saveState(state);
}

export function getVisitedSpotIds(): string[] {
  return loadState().visits.map(v => v.spotId);
}

export function getVisitBySpotId(spotId: string): Visit | undefined {
  return loadState().visits.find(v => v.spotId === spotId);
}

const PREF_KEY = 'gunma_gacha_prefs';

export function savePreferences(transports: TransportType[] | 'any', style: TravelStyle): void {
  localStorage.setItem(PREF_KEY, JSON.stringify({ transports, style }));
}

export function loadPreferences(): { transports: TransportType[] | 'any'; style: TravelStyle } | null {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Old format: { transport: 'car' }
    if (typeof parsed.transport === 'string' && !parsed.transports) {
      return { transports: [parsed.transport as TransportType], style: parsed.style };
    }
    // Intermediate format: { transports: 'car' } — string instead of array
    if (typeof parsed.transports === 'string' && parsed.transports !== 'any') {
      return { transports: [parsed.transports as TransportType], style: parsed.style };
    }
    return parsed;
  } catch { return null; }
}
