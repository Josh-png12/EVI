import { DoseLog, HistoryEntry, MealType, Medication, mealTypes } from '../types';

const dateKey = (d: Date | string) => new Date(d).toLocaleDateString('en-CA');
const todayKey = () => dateKey(new Date());

/**
 * Builds a history map keyed by YYYY-MM-DD for the last `daysBack` days.
 * Each entry lists every active medication × mealType combination with its status.
 *
 * - 'taken'       — a DoseLog exists for that day
 * - 'pending'     — today, no log yet
 * - 'unrecorded'  — past day, no log
 */
export function buildHistoryEntries(
  medications: Medication[],
  doseLogs: DoseLog[],
  daysBack = 30,
): Record<string, HistoryEntry[]> {
  const result: Record<string, HistoryEntry[]> = {};
  const active = medications.filter((m) => m.active);
  if (active.length === 0) return result;

  const now = new Date();
  const today = todayKey();

  for (let i = 0; i < daysBack; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = dateKey(d);
    const isToday = key === today;

    const entries: HistoryEntry[] = [];

    for (const med of active) {
      for (const mealType of med.mealTypes) {
        const log = doseLogs.find(
          (l) =>
            l.medicationId === med.id &&
            l.mealType === mealType &&
            dateKey(l.occurredAt) === key,
        );

        if (log) {
          entries.push({
            date: key,
            medicationId: med.id,
            medicationName: med.name,
            mealType,
            status: 'taken',
            occurredAt: log.occurredAt,
            note: log.note,
          });
        } else if (isToday) {
          entries.push({
            date: key,
            medicationId: med.id,
            medicationName: med.name,
            mealType,
            status: 'pending',
          });
        } else {
          entries.push({
            date: key,
            medicationId: med.id,
            medicationName: med.name,
            mealType,
            status: 'unrecorded',
          });
        }
      }
    }

    if (entries.length > 0) {
      result[key] = entries;
    }
  }

  return result;
}
