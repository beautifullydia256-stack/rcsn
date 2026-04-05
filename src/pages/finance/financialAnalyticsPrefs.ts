const STORAGE_KEY = "pweza_financial_analytics_prefs_v1";

export type FaPersistedPrefs = {
  financialYear: number;
  termScope: "one" | "all";
  termId: string;
  period: "term" | "week" | "month" | "year" | "custom";
};

export function loadFaPrefs(): Partial<FaPersistedPrefs> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<FaPersistedPrefs>;
  } catch {
    return null;
  }
}

export function saveFaPrefs(prefs: FaPersistedPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore quota */
  }
}
