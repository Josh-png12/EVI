import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AppData,
  MealEvent,
  MealType,
  Medication,
  MedicationSchedule,
  DoseLog,
} from '../../types';
import { isValidIsoDate } from '../../domain/date';

const KEY = '@evi/local-data/v1';

export const defaultData: AppData = {
  onboardingComplete: false,
  settings: { name: 'Evi', referenceTimes: { breakfast: '08:15', lunch: '13:00', dinner: '19:30' } },
  medications: [],
  doseLogs: [],
  mealEvents: [],
};

function scheduleFromLegacyMedication(medication: Medication): MedicationSchedule | undefined {
  if (medication.schedule) return medication.schedule;
  if (medication.mealTypes.length === 0) return undefined;
  return { type: 'WITH_MEAL', mealTypes: medication.mealTypes };
}

function isMealType(value: unknown): value is MealType {
  return value === 'breakfast' || value === 'lunch' || value === 'dinner';
}

function isValidTime(value: unknown): value is string {
  return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isSchedule(value: unknown): value is MedicationSchedule {
  if (!value || typeof value !== 'object') return false;
  const schedule = value as Partial<MedicationSchedule>;
  const validTypes = ['TIME', 'INTERVAL', 'FASTING', 'BEFORE_MEAL', 'AFTER_MEAL', 'WITH_MEAL', 'WEEKDAYS', 'CUSTOM'];
  if (typeof schedule.type !== 'string' || !validTypes.includes(schedule.type)) return false;
  if (schedule.time !== undefined && !isValidTime(schedule.time)) return false;
  if (schedule.intervalHours !== undefined && (!Number.isInteger(schedule.intervalHours) || schedule.intervalHours <= 0)) return false;
  if (schedule.mealTypes !== undefined && (!Array.isArray(schedule.mealTypes) || !schedule.mealTypes.every(isMealType))) return false;
  if (schedule.weekdays !== undefined && (!Array.isArray(schedule.weekdays) || !schedule.weekdays.every((day) => Number.isInteger(day) && day >= 0 && day <= 6))) return false;
  if (schedule.customText !== undefined && typeof schedule.customText !== 'string') return false;
  return true;
}

function isDoseLog(value: unknown): value is DoseLog {
  if (!value || typeof value !== 'object') return false;
  const log = value as Partial<DoseLog>;
  return (
    typeof log.id === 'string' &&
    typeof log.medicationId === 'string' &&
    typeof log.medicationName === 'string' &&
    isMealType(log.mealType) &&
    isValidIsoDate(log.occurredAt) &&
    log.status === 'taken' &&
    (log.note === undefined || typeof log.note === 'string')
  );
}

function migrateMedication(value: unknown): Medication | null {
  if (!value || typeof value !== 'object') return null;
  const medication = value as Partial<Medication>;
  if (
    typeof medication.id !== 'string' ||
    typeof medication.name !== 'string' ||
    typeof medication.instructions !== 'string' ||
    typeof medication.active !== 'boolean' ||
    typeof medication.createdAt !== 'string'
  ) {
    return null;
  }

  const mealTypes = Array.isArray(medication.mealTypes)
    ? medication.mealTypes.filter(
        isMealType,
      )
    : [];
  const schedule = isSchedule(medication.schedule)
    ? medication.schedule
    : scheduleFromLegacyMedication({ ...medication, mealTypes } as Medication);

  return {
    id: medication.id,
    name: medication.name,
    instructions: medication.instructions,
    doseLabel: medication.doseLabel,
    schedule,
    mealTypes,
    active: medication.active,
    createdAt: medication.createdAt,
  };
}

function migrateMealEvent(value: unknown): MealEvent | null {
  if (!value || typeof value !== 'object') return null;
  const event = value as Partial<MealEvent>;
  if (
    typeof event.id !== 'string' ||
    (event.mealType !== 'breakfast' && event.mealType !== 'lunch' && event.mealType !== 'dinner') ||
    !isValidIsoDate(event.occurredAt)
  ) {
    return null;
  }
  return {
    id: event.id,
    mealType: event.mealType,
    occurredAt: event.occurredAt,
    source: event.source === 'manual' || event.source === 'contextual' ? event.source : 'contextual',
    note: typeof event.note === 'string' ? event.note : undefined,
    isOutOfRoutine: event.isOutOfRoutine === true,
  };
}

function migrateData(value: unknown): AppData {
  if (!value || typeof value !== 'object') return defaultData;
  const saved = value as Partial<AppData>;
  const rawSettings = saved.settings && typeof saved.settings === 'object' ? saved.settings : {};
  const savedSettings = rawSettings as Partial<AppData['settings']>;
  const migratedMedications = Array.isArray(saved.medications)
    ? saved.medications.map(migrateMedication).filter((item): item is Medication => item !== null)
    : [];
  const migratedMealEvents = Array.isArray(saved.mealEvents)
    ? saved.mealEvents.map(migrateMealEvent).filter((item): item is MealEvent => item !== null)
    : [];

  const referenceTimes: Partial<Record<MealType, string>> =
    savedSettings.referenceTimes && typeof savedSettings.referenceTimes === 'object'
      ? savedSettings.referenceTimes
      : {};

  return {
    ...defaultData,
    onboardingComplete: saved.onboardingComplete === true,
    settings: {
      ...defaultData.settings,
      name: typeof savedSettings.name === 'string' ? savedSettings.name : defaultData.settings.name,
      mealContextDismissedOn: isValidIsoDate(savedSettings.mealContextDismissedOn)
        ? savedSettings.mealContextDismissedOn
        : undefined,
      referenceTimes: {
        ...defaultData.settings.referenceTimes,
        breakfast: typeof referenceTimes.breakfast === 'string' ? referenceTimes.breakfast : defaultData.settings.referenceTimes.breakfast,
        lunch: typeof referenceTimes.lunch === 'string' ? referenceTimes.lunch : defaultData.settings.referenceTimes.lunch,
        dinner: typeof referenceTimes.dinner === 'string' ? referenceTimes.dinner : defaultData.settings.referenceTimes.dinner,
      },
    },
    medications: migratedMedications,
    doseLogs: Array.isArray(saved.doseLogs) ? saved.doseLogs.filter(isDoseLog) : [],
    mealEvents: migratedMealEvents,
  };
}

export async function loadData(): Promise<AppData> {
  let saved: string | null;
  try {
    saved = await AsyncStorage.getItem(KEY);
  } catch {
    return defaultData;
  }
  if (!saved) return defaultData;
  try {
    return migrateData(JSON.parse(saved));
  } catch {
    return defaultData;
  }
}

export async function saveData(data: AppData) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Unable to persist EVI data', error);
    throw new Error('EVI data could not be saved');
  }
}

export async function clearData() {
  await AsyncStorage.removeItem(KEY);
}
