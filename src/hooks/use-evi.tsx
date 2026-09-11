import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppData, AppSettings, DoseLog, MealEvent, MealType, Medication } from '../types';
import { defaultData, loadData, saveData } from '../services/storage/local-repository';
import { isMedicationTakenToday, medicationUsesMeal } from '../domain/routine';
import { isValidTime } from '../domain/date';
import { localDateKey } from '../domain/date';
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
  recordDose: (medication: Medication, mealType?: MealType, note?: string, scheduledAt?: string) => Promise<void>;
  snoozeDose: (medication: Medication, mealType: MealType, delayMinutes?: number) => Promise<void>;
  syncNotifications: () => Promise<void>;
  recordMealEvent: (mealType: MealType) => Promise<void>;
  registerMealEvent: (
    mealType: MealType,
    options?: { occurredAt?: string; source?: 'manual' | 'contextual'; note?: string; isOutOfRoutine?: boolean },
  ) => Promise<void>;
  reset: () => Promise<void>;
};

const EviContext = createContext<EviContextValue | null>(null);
const generateId = (existingIds: string[] = []) => {
  let id = '';
  do {
    id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  } while (existingIds.includes(id));
  return id;
};

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
  const dataRef = useRef(data);
  const mutationQueue = useRef(Promise.resolve());
  const mountedRef = useRef(true);

  useEffect(() => {
    loadData()
      .then((value) => {
        dataRef.current = value;
        if (mountedRef.current) {
          setData(value);
          setReady(true);
        }
        void rescheduleIfPermitted(value.medications, value.settings, value.mealEvents);
      })
      .catch((error) => {
        console.error('Unable to load EVI data', error);
        if (mountedRef.current) setReady(true);
      });

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const persistAndUpdate = async (updater: (current: AppData) => AppData): Promise<AppData> => {
    const operation = mutationQueue.current.then(async () => {
      const nextState = updater(dataRef.current);
      await saveData(nextState);
      dataRef.current = nextState;
      if (mountedRef.current) setData(nextState);
      await rescheduleIfPermitted(nextState.medications, nextState.settings, nextState.mealEvents);
      return nextState;
    });
    mutationQueue.current = operation.then(() => undefined, () => undefined);
    return operation;
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
    const occurredAt = options.occurredAt && !Number.isNaN(new Date(options.occurredAt).getTime())
      ? options.occurredAt
      : new Date().toISOString();

    const newEvent: MealEvent = {
      id: generateId(dataRef.current.mealEvents.map((event) => event.id)),
      mealType,
      occurredAt,
      source: options.source ?? 'manual',
      note: options.note,
      isOutOfRoutine: options.isOutOfRoutine,
    };
    await persistAndUpdate((current) => {
      const eventTime = new Date(newEvent.occurredAt).getTime();
      const duplicate = current.mealEvents.some((event) =>
        event.mealType === newEvent.mealType &&
        Math.abs(new Date(event.occurredAt).getTime() - eventTime) < 2000,
      );
      return duplicate ? current : { ...current, mealEvents: [...current.mealEvents, newEvent] };
    });
  };

  const value = useMemo<EviContextValue>(
    () => ({
      data,
      ready,

      completeOnboarding: async (name, medications, referenceTimes) => {
        await persistAndUpdate((current) => {
          if (current.onboardingComplete) return current;
          const existingIds = current.medications.map((medication) => medication.id);
          const newMeds: Medication[] = medications.map((m) => {
            const id = generateId(existingIds);
            existingIds.push(id);
            return {
              ...normalizeMedication(m),
              id,
              createdAt: new Date().toISOString(),
            };
          });

          return {
            ...current,
            onboardingComplete: true,
            settings: {
              ...current.settings,
              name: name.trim() || 'Evi',
              referenceTimes: {
              ...current.settings.referenceTimes,
                breakfast: isValidTime(referenceTimes.breakfast)
                  ? referenceTimes.breakfast
                  : current.settings.referenceTimes.breakfast,
                lunch: isValidTime(referenceTimes.lunch)
                  ? referenceTimes.lunch
                  : current.settings.referenceTimes.lunch,
                dinner: isValidTime(referenceTimes.dinner)
                  ? referenceTimes.dinner
                  : current.settings.referenceTimes.dinner,
              },
            },
            medications: [...current.medications, ...newMeds],
          };
        });
      },

      addMedication: async (medication) => {
        await persistAndUpdate((current) => {
          const newMed: Medication = {
            ...normalizeMedication(medication),
            id: generateId(current.medications.map((item) => item.id)),
            createdAt: new Date().toISOString(),
          };
          return { ...current, medications: [...current.medications, newMed] };
        });
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

      recordDose: async (medication, mealType, note, scheduledAt) => {
        await persistAndUpdate((current) => {
          const currentMedication = current.medications.find((item) => item.id === medication.id);
          if (
            !currentMedication ||
            !currentMedication.active ||
            (mealType
              ? !medicationUsesMeal(currentMedication, mealType) || isMedicationTakenToday(current.doseLogs, medication.id, mealType)
              : medicationUsesMeal(currentMedication))
          ) return current;
          const duplicate = scheduledAt
            ? current.doseLogs.some((log) => log.medicationId === medication.id && log.scheduledAt === scheduledAt)
            : current.doseLogs.some(
                (log) => log.medicationId === medication.id && !log.mealType &&
                  localDateKey(log.occurredAt) === localDateKey(new Date()),
              );
          if (duplicate) return current;
          const newLog: DoseLog = {
            id: generateId(current.doseLogs.map((log) => log.id)),
            medicationId: currentMedication.id,
            medicationName: currentMedication.name,
            mealType,
            scheduledAt,
            occurredAt: new Date().toISOString(),
            status: 'taken',
            note,
          };
          return { ...current, doseLogs: [...current.doseLogs, newLog] };
        });
      },

      snoozeDose: async (medication, mealType, delayMinutes = 30) => {
        await scheduleSnoozeNotification(medication, mealType, delayMinutes);
      },

      syncNotifications: async () => {
        await mutationQueue.current;
        const current = dataRef.current;
        await rescheduleIfPermitted(current.medications, current.settings, current.mealEvents);
      },

      registerMealEvent,
      recordMealEvent: async (mealType) => registerMealEvent(mealType),

      reset: async () => {
        await persistAndUpdate(() => defaultData);
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
