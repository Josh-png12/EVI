import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { AppData, AppSettings, DoseLog, MealEvent, MealType, Medication } from '../types';
import { defaultData, loadData, saveData } from '../services/storage/local-repository';
import { rescheduleIfPermitted, scheduleSnoozeNotification } from '../services/notifications/notification-service';

type EviContextValue = {
  data: AppData;
  ready: boolean;
  completeOnboarding: (
    name: string,
    medications: Array<Omit<Medication, 'id' | 'createdAt'>>,
    referenceTimes: Record<MealType, string>
  ) => Promise<void>;
  addMedication: (medication: Omit<Medication, 'id' | 'createdAt'>) => Promise<void>;
  updateMedication: (id: string, updates: Partial<Omit<Medication, 'id' | 'createdAt'>>) => Promise<void>;
  toggleMedicationActive: (id: string) => Promise<void>;
  deleteMedication: (id: string) => Promise<void>;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  recordDose: (medication: Medication, mealType: MealType, note?: string) => Promise<void>;
  snoozeDose: (medication: Medication, mealType: MealType, delayMinutes?: number) => Promise<void>;
  recordMealEvent: (mealType: MealType) => Promise<void>;
  registerMealEvent: (
    mealType: MealType,
    options?: { occurredAt?: string; source?: 'manual' | 'contextual'; note?: string; isOutOfRoutine?: boolean },
  ) => Promise<void>;
  reset: () => Promise<void>;
};

const EviContext = createContext<EviContextValue | null>(null);
const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function normalizeMedication(
  medication: Omit<Medication, 'id' | 'createdAt'>,
): Omit<Medication, 'id' | 'createdAt'> {
  return {
    ...medication,
    schedule: medication.schedule,
  };
}

export function EviProvider({ children }: PropsWithChildren) {
  const [data, setData] = useState<AppData>(defaultData);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadData().then((value) => {
      setData(value);
      setReady(true);
      // Auto sync notifications if already permitted
      rescheduleIfPermitted(value.medications, value.settings, value.mealEvents);
    });
  }, []);

  const persistAndUpdate = async (updater: (current: AppData) => AppData): Promise<AppData> => {
    let nextState: AppData = data;
    setData((current) => {
      nextState = updater(current);
      return nextState;
    });
    await saveData(nextState);
    await rescheduleIfPermitted(nextState.medications, nextState.settings, nextState.mealEvents);
    return nextState;
  };

  const registerMealEvent = async (
    mealType: MealType,
    options: {
      occurredAt?: string;
      source?: 'manual' | 'contextual';
      note?: string;
      isOutOfRoutine?: boolean;
    } = {},
  ) => {
    const newEvent: MealEvent = {
      id: generateId(),
      mealType,
      occurredAt: options.occurredAt ?? new Date().toISOString(),
      source: options.source ?? 'manual',
      note: options.note,
      isOutOfRoutine: options.isOutOfRoutine,
    };
    await persistAndUpdate((current) => ({
      ...current,
      mealEvents: [...current.mealEvents, newEvent],
    }));
  };

  const value = useMemo<EviContextValue>(
    () => ({
      data,
      ready,

      completeOnboarding: async (name, medications, referenceTimes) => {
        const newMeds: Medication[] = medications.map((m) => ({
          ...normalizeMedication(m),
          id: generateId(),
          createdAt: new Date().toISOString(),
        }));

        await persistAndUpdate((current) => ({
          ...current,
          onboardingComplete: true,
          settings: {
            ...current.settings,
            name: name.trim() || 'Evi',
            referenceTimes: {
              ...current.settings.referenceTimes,
              ...referenceTimes,
            },
          },
          medications: [...current.medications, ...newMeds],
        }));
      },

      addMedication: async (medication) => {
        const newMed: Medication = {
          ...normalizeMedication(medication),
          id: generateId(),
          createdAt: new Date().toISOString(),
        };
        await persistAndUpdate((current) => ({
          ...current,
          medications: [...current.medications, newMed],
        }));
      },

      updateMedication: async (id, updates) => {
        await persistAndUpdate((current) => ({
          ...current,
          medications: current.medications.map((m) => (m.id === id ? { ...m, ...updates } : m)),
        }));
      },

      toggleMedicationActive: async (id) => {
        await persistAndUpdate((current) => ({
          ...current,
          medications: current.medications.map((m) =>
            m.id === id ? { ...m, active: !m.active } : m
          ),
        }));
      },

      deleteMedication: async (id) => {
        await persistAndUpdate((current) => ({
          ...current,
          medications: current.medications.filter((m) => m.id !== id),
        }));
      },

      updateSettings: async (updates) => {
        await persistAndUpdate((current) => ({
          ...current,
          settings: { ...current.settings, ...updates },
        }));
      },

      recordDose: async (medication, mealType, note) => {
        const newLog: DoseLog = {
          id: generateId(),
          medicationId: medication.id,
          medicationName: medication.name,
          mealType,
          occurredAt: new Date().toISOString(),
          status: 'taken',
          note,
        };
        await persistAndUpdate((current) => ({
          ...current,
          doseLogs: [...current.doseLogs, newLog],
        }));
      },

      snoozeDose: async (medication, mealType, delayMinutes = 30) => {
        await scheduleSnoozeNotification(medication, mealType, delayMinutes);
      },

      registerMealEvent,
      recordMealEvent: async (mealType) => registerMealEvent(mealType),

      reset: async () => {
        await saveData(defaultData);
        setData(defaultData);
      },
    }),
    [data, ready]
  );

  return <EviContext.Provider value={value}>{children}</EviContext.Provider>;
}

export function useEvi() {
  const value = useContext(EviContext);
  if (!value) throw new Error('useEvi must be used inside EviProvider');
  return value;
}
