import {
  DoseLog,
  CurrentMedicationStatus,
  LearnedMealRoutine,
  MealEvent,
  MealType,
  Medication,
  MedicationSchedule,
  MedicationStatusItem,
  mealTypes,
} from '../types';
import { localDateKey } from './date';

export function isMedicationTakenToday(logs: DoseLog[], medicationId: string, mealType: MealType) {
  const today = localDateKey(new Date());
  return logs.some((log) => log.medicationId === medicationId && log.mealType === mealType && localDateKey(log.occurredAt) === today);
}

export function dosesForMeal(medications: Medication[], logs: DoseLog[], mealType: MealType) {
  return mealLinkedMedications(medications, logs, mealType);
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
  if (!medication.schedule) return medication.mealTypes.includes(mealType);
  if (!['BEFORE_MEAL', 'AFTER_MEAL', 'WITH_MEAL'].includes(medication.schedule.type)) return false;
  return medication.schedule.mealTypes?.includes(mealType) ?? false;
}

export function mealLinkedMedications(
  medications: Medication[],
  logs: DoseLog[],
  mealType: MealType,
): Medication[] {
  return medications.filter(
    (medication) =>
      medication.active &&
      medicationUsesMeal(medication, mealType) &&
      !isMedicationTakenToday(logs, medication.id, mealType),
  );
}

export function mealRelationshipLabel(medication: Medication): string {
  switch (medication.schedule?.type) {
    case 'BEFORE_MEAL':
      return 'Antes de comer';
    case 'AFTER_MEAL':
      return 'Después de comer';
    case 'WITH_MEAL':
      return 'Con la comida';
    default:
      return 'Asociado a esta comida';
  }
}

function timeOnDate(date: Date, value?: string): Date | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value ?? '');
  if (!match) return null;
  const result = new Date(date);
  result.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return result;
}

function logsForMedicationToday(logs: DoseLog[], medicationId: string, now: Date): DoseLog[] {
  const today = localDateKey(now);
  return logs.filter((log) => log.medicationId === medicationId && localDateKey(log.occurredAt) === today);
}

function mealRoutineTime(
  events: MealEvent[],
  mealType: MealType,
  referenceTimes: Record<MealType, string>,
  now: Date,
): Date | null {
  const learned = getLearnedMealTime(events, mealType, now);
  return timeOnDate(now, learned.hasEnoughData ? learned.learnedTime : referenceTimes[mealType]);
}

function itemFor(
  medication: Medication,
  status: MedicationStatusItem['status'],
  contextLabel: string,
  dueAt?: Date,
): MedicationStatusItem {
  return {
    medication,
    status,
    contextLabel,
    dueAt: dueAt ? `${String(dueAt.getHours()).padStart(2, '0')}:${String(dueAt.getMinutes()).padStart(2, '0')}` : undefined,
  };
}

/** Returns a read-only local snapshot; it never changes schedules or persistence. */
export function getCurrentMedicationStatus(
  medications: Medication[],
  logs: DoseLog[],
  mealEvents: MealEvent[],
  referenceTimes: Record<MealType, string>,
  now = new Date(),
): CurrentMedicationStatus {
  const pending: MedicationStatusItem[] = [];
  const taken: MedicationStatusItem[] = [];
  const upcoming: MedicationStatusItem[] = [];

  for (const medication of medications.filter((item) => item.active)) {
    const schedule = medication.schedule;
    const medicationLogs = logsForMedicationToday(logs, medication.id, now);

    if (!schedule) continue;

    if (schedule.type === 'BEFORE_MEAL' || schedule.type === 'WITH_MEAL' || schedule.type === 'AFTER_MEAL') {
      for (const mealType of schedule.mealTypes ?? []) {
        const mealEvent = mealEvents
          .filter((event) => event.mealType === mealType && localDateKey(event.occurredAt) === localDateKey(now))
          .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime())[0];
        const dueAt = mealEvent ? new Date(mealEvent.occurredAt) : mealRoutineTime(mealEvents, mealType, referenceTimes, now);
        const takenForMeal = medicationLogs.some((log) => log.mealType === mealType);
        const label = mealRelationshipLabel(medication);

        if (takenForMeal) {
          taken.push(itemFor(medication, 'taken', label, dueAt ?? undefined));
        } else if (mealEvent) {
          pending.push(itemFor(medication, 'pending', label, dueAt ?? undefined));
        } else if (dueAt && dueAt.getTime() >= now.getTime()) {
          upcoming.push(itemFor(medication, 'upcoming', label, dueAt));
        }
      }
      continue;
    }

    if (schedule.type === 'TIME') {
      const dueAt = timeOnDate(now, schedule.time);
      if (medicationLogs.length > 0) taken.push(itemFor(medication, 'taken', schedule.time ? `A las ${schedule.time}` : 'Hora registrada', dueAt ?? undefined));
      else if (dueAt && dueAt.getTime() <= now.getTime()) pending.push(itemFor(medication, 'pending', `A las ${schedule.time}`, dueAt));
      else if (dueAt) upcoming.push(itemFor(medication, 'upcoming', `A las ${schedule.time}`, dueAt));
      continue;
    }

    if (schedule.type === 'INTERVAL') {
      const start = timeOnDate(now, schedule.time);
      const interval = schedule.intervalHours;
      if (!start || !interval) continue;
      const elapsed = now.getTime() - start.getTime();
      if (elapsed < 0) {
        upcoming.push(itemFor(medication, 'upcoming', `Cada ${interval} horas`, start));
        continue;
      }
      const dueCount = Math.floor(elapsed / (interval * 60 * 60 * 1000)) + 1;
      const nextDue = new Date(start.getTime() + medicationLogs.length * interval * 60 * 60 * 1000);
      if (medicationLogs.length < dueCount) pending.push(itemFor(medication, 'pending', `Cada ${interval} horas`, nextDue));
      else upcoming.push(itemFor(medication, 'upcoming', `Cada ${interval} horas`, new Date(start.getTime() + dueCount * interval * 60 * 60 * 1000)));
      continue;
    }

    if (schedule.type === 'WEEKDAYS') {
      const weekday = now.getDay();
      if (!schedule.weekdays?.includes(weekday)) continue;
      const dueAt = timeOnDate(now, schedule.time);
      if (medicationLogs.length > 0) taken.push(itemFor(medication, 'taken', 'Día seleccionado', dueAt ?? undefined));
      else if (dueAt && dueAt.getTime() <= now.getTime()) pending.push(itemFor(medication, 'pending', 'Día seleccionado', dueAt));
      else upcoming.push(itemFor(medication, 'upcoming', 'Día seleccionado', dueAt ?? undefined));
      continue;
    }

    const label = schedule.type === 'FASTING' ? 'En ayunas' : schedule.customText || 'Indicación registrada';
    if (medicationLogs.length > 0) taken.push(itemFor(medication, 'taken', label));
    else upcoming.push(itemFor(medication, 'upcoming', label));
  }

  const order = (item: MedicationStatusItem) => item.dueAt ?? '99:99';
  pending.sort((left, right) => order(left).localeCompare(order(right)));
  upcoming.sort((left, right) => order(left).localeCompare(order(right)));

  return { now, pending, next: pending[0] ?? upcoming[0], taken, upcoming };
}

function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function configuredMealMinutes(
  mealType: MealType,
  referenceTimes: Record<MealType, string>,
): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(referenceTimes[mealType] ?? '');
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function mealEventExistsToday(events: MealEvent[], mealType: MealType, now = new Date()): boolean {
  const today = localDateKey(now);
  return events.some((event) => event.mealType === mealType && localDateKey(event.occurredAt) === today);
}

export function mealTypeNearRoutine(
  events: MealEvent[],
  referenceTimes: Record<MealType, string>,
  now = new Date(),
  windowMinutes = 75,
): MealType | null {
  const candidates = mealTypes
    .filter((mealType) => !mealEventExistsToday(events, mealType, now))
    .map((mealType) => {
      const learned = getLearnedMealTime(events, mealType, now);
      const learnedMinutes = learned.hasEnoughData && learned.learnedTime
        ? configuredMealMinutes(mealType, { breakfast: learned.learnedTime, lunch: learned.learnedTime, dinner: learned.learnedTime })
        : null;
      const target = learnedMinutes ?? configuredMealMinutes(mealType, referenceTimes);
      return target === null
        ? null
        : { mealType, distance: Math.abs(target - minutesOfDay(now)) };
    })
    .filter((candidate): candidate is { mealType: MealType; distance: number } => candidate !== null)
    .sort((left, right) => left.distance - right.distance);

  return candidates[0]?.distance <= windowMinutes ? candidates[0].mealType : null;
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
