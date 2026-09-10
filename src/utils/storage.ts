import { Tournament, ViewMode } from '../types';

export type TournamentPhase = 'setup' | 'overview' | 'sequential';

export interface SavedAppState {
  version: number;
  tournament: Tournament;
  phase: TournamentPhase;
  viewMode: ViewMode;
  activeSequentialMatchId: string | null;
  savedAt: number;
}

const STORAGE_KEY = 'sphero_tournament_autosave_v2';
const BACKUP_STORAGE_KEY = 'sphero_tournament_autosave_backup_v2';
const CURRENT_VERSION = 2;

/**
 * Validates whether the loaded object resembles a genuine, uncorrupted Tournament state.
 */
function isValidTournamentState(data: unknown): data is SavedAppState {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Partial<SavedAppState>;

  if (!obj.tournament || typeof obj.tournament !== 'object') return false;
  const t = obj.tournament as Partial<Tournament>;

  if (typeof t.id !== 'string' || !t.id) return false;
  if (typeof t.title !== 'string') return false;
  if (!Array.isArray(t.participants) || t.participants.length < 2) return false;
  if (!Array.isArray(t.matches)) return false;

  // Basic check for participant integrity
  for (const p of t.participants) {
    if (!p || typeof p.id !== 'string' || typeof p.name !== 'string' || !p.animal) {
      return false;
    }
  }

  // Validate phase
  if (obj.phase && !['setup', 'overview', 'sequential'].includes(obj.phase)) {
    return false;
  }

  return true;
}

/**
 * Saves current application state synchronously to localStorage, with an automatic mirror backup.
 */
export function saveAppState(state: {
  tournament: Tournament;
  phase: TournamentPhase;
  viewMode: ViewMode;
  activeSequentialMatchId: string | null;
}): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;

  const payload: SavedAppState = {
    version: CURRENT_VERSION,
    tournament: state.tournament,
    phase: state.phase,
    viewMode: state.viewMode,
    activeSequentialMatchId: state.activeSequentialMatchId,
    savedAt: Date.now(),
  };

  try {
    const serialized = JSON.stringify(payload);
    window.localStorage.setItem(STORAGE_KEY, serialized);
    // Write mirror backup for resilience against sudden interrupts
    window.localStorage.setItem(BACKUP_STORAGE_KEY, serialized);
    return true;
  } catch (error) {
    console.warn('[SpheroStorage] Error saving state locally:', error);
    return false;
  }
}

/**
 * Loads saved state from localStorage. If primary key fails or is corrupted, attempts backup key.
 */
export function loadAppState(): SavedAppState | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;

  // Try primary key first
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isValidTournamentState(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn('[SpheroStorage] Failed parsing primary storage, checking backup...', error);
  }

  // Fallback to mirror backup
  try {
    const rawBackup = window.localStorage.getItem(BACKUP_STORAGE_KEY);
    if (rawBackup) {
      const parsedBackup = JSON.parse(rawBackup);
      if (isValidTournamentState(parsedBackup)) {
        console.info('[SpheroStorage] Successfully recovered tournament from backup key');
        return parsedBackup;
      }
    }
  } catch (error) {
    console.warn('[SpheroStorage] Failed parsing backup storage:', error);
  }

  return null;
}

/**
 * Clears saved state from localStorage (used when user explicitly wants to start fresh).
 */
export function clearAppState(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(BACKUP_STORAGE_KEY);
  } catch (error) {
    console.warn('[SpheroStorage] Error clearing storage:', error);
  }
}

/**
 * Checks whether an existing saved tournament is present in localStorage.
 */
export function hasSavedTournament(): boolean {
  const state = loadAppState();
  return Boolean(state && state.tournament && state.tournament.participants.length >= 2);
}
