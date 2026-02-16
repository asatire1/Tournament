const FIREBASE_BASE_URL =
  'https://stretford-padel-tournament-default-rtdb.europe-west1.firebasedatabase.app';

export const VALID_FORMATS = [
  'americano',
  'mexicano',
  'mixicano',
  'tournament',
  'mix',
  'knockout',
  'team-league',
  'round-robin',
  'swiss',
] as const;

type Format = (typeof VALID_FORMATS)[number];

const FORMAT_PATH_MAP: Record<Format, string> = {
  americano: 'americano-tournaments',
  mexicano: 'mexicano-tournaments',
  mixicano: 'mixicano-tournaments',
  tournament: 'tournaments',
  mix: 'tournaments',
  knockout: 'knockout-tournaments',
  'team-league': 'team-tournaments',
  'round-robin': 'roundrobin-tournaments',
  swiss: 'swiss-tournaments',
};

const ID_PATTERN = /^[a-zA-Z0-9]{4,20}$/;

function isValidFormat(format: string): format is Format {
  return (VALID_FORMATS as readonly string[]).includes(format);
}

function isValidId(id: string): boolean {
  return ID_PATTERN.test(id);
}

/**
 * Fetches the raw tournament data object from Firebase Realtime Database.
 * Returns null if the format/id is invalid or the tournament is not found.
 */
export async function fetchTournament(
  format: string,
  id: string,
): Promise<any | null> {
  if (!isValidFormat(format)) {
    return null;
  }

  if (!isValidId(id)) {
    return null;
  }

  const dbPath = FORMAT_PATH_MAP[format];
  const url = `${FIREBASE_BASE_URL}/${dbPath}/${id}.json`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    // Firebase returns literal `null` JSON for missing keys
    if (data === null || data === undefined) {
      return null;
    }

    return data;
  } catch {
    // Network error, timeout, or JSON parse failure
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetches just the tournament name from Firebase.
 * Returns null if the tournament is not found or has no name.
 */
export async function fetchTournamentName(
  format: string,
  id: string,
): Promise<string | null> {
  if (!isValidFormat(format)) {
    return null;
  }

  if (!isValidId(id)) {
    return null;
  }

  const dbPath = FORMAT_PATH_MAP[format];

  // Try common name field paths. Different formats store the name differently.
  // Most formats use a top-level `name` field; knockout uses `meta/name`.
  const namePaths =
    format === 'knockout'
      ? [`${dbPath}/${id}/meta/name`, `${dbPath}/${id}/name`]
      : [`${dbPath}/${id}/name`, `${dbPath}/${id}/meta/name`];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    for (const path of namePaths) {
      const url = `${FIREBASE_BASE_URL}/${path}.json`;
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        continue;
      }

      const data = await response.json();

      if (typeof data === 'string' && data.length > 0) {
        return data;
      }
    }

    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
