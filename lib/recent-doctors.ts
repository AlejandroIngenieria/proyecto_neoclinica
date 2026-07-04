export type RecentDoctorItem = {
  exp_codigo: string;
  fullName: string;
  specialty: string;
  locationLabel: string;
  image: string | null;
  visitedAt: string;
};

const RECENT_DOCTORS_STORAGE_KEY = 'neoclinica:recent-doctors';
const MAX_RECENT_DOCTORS = 3;

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function readRecentDoctors(): RecentDoctorItem[] {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(RECENT_DOCTORS_STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored) as RecentDoctorItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeRecentDoctors(items: RecentDoctorItem[]) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(RECENT_DOCTORS_STORAGE_KEY, JSON.stringify(items.slice(0, MAX_RECENT_DOCTORS)));
}

export function addRecentDoctor(item: RecentDoctorItem) {
  const current = readRecentDoctors();
  const next = [item, ...current.filter((doctor) => doctor.exp_codigo !== item.exp_codigo)].slice(0, MAX_RECENT_DOCTORS);
  writeRecentDoctors(next);
  return next;
}
