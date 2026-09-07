import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AppData,
  MealEvent,
  MealType,
  Medication,
  MedicationSchedule,
} from '../../types';

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
        (meal): meal is MealType => meal === 'breakfast' || meal === 'lunch' || meal === 'dinner',
      )
    : [];
  return {
    id: medication.id,
    name: medication.name,
    instructions: medication.instructions,
    doseLabel: medication.doseLabel,
    schedule: scheduleFromLegacyMedication({ ...medication, mealTypes } as Medication),
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
    typeof event.occurredAt !== 'string'
  ) {
    return null;
  }
  return {
    id: event.id,
    mealType: event.mealType,
    occurredAt: event.occurredAt,
    source: event.source === 'manual' ? 'manual' : 'contextual',
    note: event.note,
    isOutOfRoutine: event.isOutOfRoutine === true,
  };
}

function migrateData(value: unknown): AppData {
  if (!value || typeof value !== 'object') return defaultData;
  const saved = value as Partial<AppData>;
  const settings = saved.settings && typeof saved.settings === 'object' ? saved.settings : {};
  const migratedMedications = Array.isArray(saved.medications)
    ? saved.medications.map(migrateMedication).filter((item): item is Medication => item !== null)
    : [];
  const migratedMealEvents = Array.isArray(saved.mealEvents)
    ? saved.mealEvents.map(migrateMealEvent).filter((item): item is MealEvent => item !== null)
    : [];

  return {
    ...defaultData,
    ...saved,
    settings: {
      ...defaultData.settings,
      ...settings,
      referenceTimes: {
        ...defaultData.settings.referenceTimes,
        ...(settings as AppData['settings']).referenceTimes,
      },
    },
    medications: migratedMedications,
    doseLogs: Array.isArray(saved.doseLogs) ? saved.doseLogs : [],
    mealEvents: migratedMealEvents,
  };
}

export async function loadData(): Promise<AppData> {
  const saved = await AsyncStorage.getItem(KEY);
  if (!saved) return defaultData;
  try {
    return migrateData(JSON.parse(saved));
  } catch {
    return defaultData;
  }
}

export async function saveData(data: AppData) {
  await AsyncStorage.setItem(KEY, JSON.stringify(data));
}

export async function clearData() {
  await AsyncStorage.removeItem(KEY);
}
