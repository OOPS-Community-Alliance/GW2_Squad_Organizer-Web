/*
 * Kleine Bedienvorlieben (Sprache, Darstellung) im localStorage.
 * Der Zugriff kann im privaten Modus scheitern; die App läuft dann mit Standardwerten.
 */
const PREFIX = 'gw2so:';

export function readPref(key: string): string | null {
  try {
    return localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

export function writePref(key: string, value: string): void {
  try {
    localStorage.setItem(PREFIX + key, value);
  } catch {
    // Ohne Speicher gilt die Einstellung nur für diese Sitzung.
  }
}
