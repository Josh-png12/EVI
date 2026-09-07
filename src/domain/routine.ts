import {
  DoseLog,
  LearnedMealRoutine,
  MealEvent,
  MealType,
  Medication,
  MedicationSchedule,
  mealTypes,
} from '../types';

const dateKey = (value: Date | string) => new Date(value).toLocaleDateString('en-CA');

export function isMedicationTakenToday(logs: DoseLog[], medicationId: string, mealType: MealType) {
  const today = dateKey(new Date());
  return logs.some((log) => log.medicationId === medicationId && log.mealType === mealType && dateKey(log.occurredAt) === today);
}

export function dosesForMeal(medications: Medication[], logs: DoseLog[], mealType: MealType) {
  return medications.filter((medication) => {
    if (!medication.active || !medication.mealTypes.includes(mealType)) return false;
    return !isMedicationTakenToday(logs, medication.id, mealType);
  });
}

export function scheduleMeals(schedule?: MedicationSchedule, fallback: MealType[] = []) {
  if (!schedule) return fallback;
  if (schedule.type === 'BEFORE_MEAL' || schedule.type === 'AFTER_MEAL' || schedule.type === 'WITH_MEAL') {
    return schedule.mealTypes ?? fallback;
  }
  return fallback;
}

export function medicationUsesMeal(
  medication: Medication,
  mealType: MealType,
): boolean {
  return scheduleMeals(medication.schedule, medication.mealTypes).includes(mealType);
}

export function dayProgress(medications: Medication[], logs: DoseLog[]) {
  const expected = medications.filter((med) => med.active).flatMap((med) => med.mealTypes.map((mealType) => ({ medicationId: med.id, mealType })));
  const complete = expected.filter(({ medicationId, mealType }) => isMedicationTakenToday(logs, medicationId, mealType)).length;
  return { complete, total: expected.length };
}

export function weeklyProgress(medications: Medication[], logs: DoseLog[]) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  const activeRules = medications.filter((m) => m.active).flatMap((m) => m.mealTypes);
  const byMeal = Object.fromEntries(mealTypes.map((meal) => [meal, { taken: 0, total: activeRules.filter((rule) => rule === meal).length * 7 }])) as Record<MealType, { taken: number; total: number }>;
  logs.filter((log) => new Date(log.occurredAt) >= start).forEach((log) => { byMeal[log.mealType].taken += 1; });
  const total = Object.values(byMeal).reduce((sum, item) => sum + item.total, 0);
  const taken = Object.values(byMeal).reduce((sum, item) => sum + item.taken, 0);
  return { taken, total, byMeal };
}

export function usualMealTime(events: { mealType: MealType; occurredAt: string }[], mealType: MealType, fallback: string) {
  const minutes = events.filter((event) => event.mealType === mealType).slice(-14).map((event) => {
    const date = new Date(event.occurredAt);
    return date.getHours() * 60 + date.getMinutes();
  }).sort((a, b) => a - b);
  if (minutes.length < 3) return fallback;
  const middle = Math.floor(minutes.length / 2);
  const learned = minutes.length % 2
    ? minutes[middle]
    : Math.round((minutes[middle - 1] + minutes[middle]) / 2);
  return formatMinutes(learned);
}

const MINIMUM_MEAL_OBSERVATIONS = 3;
const ROUTINE_WINDOW_DAYS = 21;

type MealObservation = { occurredAt: string; isOutOfRoutine?: boolean; mealType: MealType };

function minutesSinceMidnight(value: string): number | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.getHours() * 60 + date.getMinutes();
}

function formatMinutes(value: number): string {
  const normalized = Math.round(value) % (24 * 60);
  const hour = Math.floor(normalized / 60).toString().padStart(2, '0');
  const minute = (normalized % 60).toString().padStart(2, '0');
  return `${hour}:${minute}`;
}

function median(values: number[]): number {
  const middle = Math.floor(values.length / 2);
  return values.length % 2
    ? values[middle]
    : Math.round((values[middle - 1] + values[middle]) / 2);
}

function quartile(values: number[], fraction: number): number {
  const position = (values.length - 1) * fraction;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return values[lower];
  return values[lower] + (values[upper] - values[lower]) * (position - lower);
}

function observationMinutes(
  events: MealObservation[],
  mealType: MealType,
  now: Date,
  windowDays: number,
): number[] {
  const earliest = now.getTime() - windowDays * 24 * 60 * 60 * 1000;
  return events
    .filter(
      (event) =>
        event.mealType === mealType &&
        event.isOutOfRoutine !== true &&
        !Number.isNaN(new Date(event.occurredAt).getTime()) &&
        new Date(event.occurredAt).getTime() >= earliest &&
        new Date(event.occurredAt).getTime() <= now.getTime(),
    )
    .map((event) => minutesSinceMidnight(event.occurredAt))
    .filter((value): value is number => value !== null)
    .sort((left, right) => left - right);
}

/**
 * Uses the median, with an IQR fence when enough observations exist, so one
 * exceptional meal time cannot move the learned routine substantially.
 */
export function getLearnedMealTime(
  events: MealObservation[],
  mealType: MealType,
  now = new Date(),
  windowDays = ROUTINE_WINDOW_DAYS,
): LearnedMealRoutine {
  const observations = observationMinutes(events, mealType, now, windowDays);
  if (observations.length < MINIMUM_MEAL_OBSERVATIONS) {
    return {
      mealType,
      sampleSize: observations.length,
      hasEnoughData: false,
      confidence: 'none',
    };
  }

  const usable = observations.length >= 4
    ? observations.filter((value) => {
        const firstQuartile = quartile(observations, 0.25);
        const thirdQuartile = quartile(observations, 0.75);
        const spread = thirdQuartile - firstQuartile;
        return value >= firstQuartile - 1.5 * spread && value <= thirdQuartile + 1.5 * spread;
      })
    : observations;
  const learnedTime = median(usable);

  return {
    mealType,
    learnedTime: formatMinutes(learnedTime),
    sampleSize: usable.length,
    hasEnoughData: usable.length >= MINIMUM_MEAL_OBSERVATIONS,
    confidence: usable.length >= 14 ? 'established' : 'preliminary',
  };
}

export function hasEnoughMealData(
  events: MealObservation[],
  mealType: MealType,
  now = new Date(),
): boolean {
  return getLearnedMealTime(events, mealType, now).hasEnoughData;
}

export function getLearnedRoutine(
  events: MealEvent[],
  now = new Date(),
): Record<MealType, LearnedMealRoutine> {
  return Object.fromEntries(
    mealTypes.map((mealType) => [mealType, getLearnedMealTime(events, mealType, now)]),
  ) as Record<MealType, LearnedMealRoutine>;
}
