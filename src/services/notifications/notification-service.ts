import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { AppSettings, MealEvent, MealType, Medication } from '../../types';
import { getLearnedMealTime } from '../../domain/routine';

declare const require: (moduleName: string) => unknown;

type NotificationModule = {
  AndroidImportance: { HIGH: unknown };
  SchedulableTriggerInputTypes: {
    DAILY: unknown;
    WEEKLY: unknown;
    TIME_INTERVAL: unknown;
  };
  setNotificationHandler: (handler: unknown) => void;
  setNotificationChannelAsync: (channelId: string, channel: unknown) => Promise<unknown>;
  getPermissionsAsync: () => Promise<{ status: string }>;
  requestPermissionsAsync: () => Promise<{ status: string }>;
  cancelAllScheduledNotificationsAsync: () => Promise<void>;
  getAllScheduledNotificationsAsync: () => Promise<Array<{ identifier: string }>>;
  cancelScheduledNotificationAsync: (identifier: string) => Promise<void>;
  scheduleNotificationAsync: (request: unknown) => Promise<unknown>;
};

export type NotificationPermissionResult = { available: boolean; granted: boolean };

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const nativeNotificationsAvailable = !isExpoGo;
let notifications: NotificationModule | null = null;
let schedulingQueue = Promise.resolve();

function getNotificationsModule(): NotificationModule | null {
  if (!nativeNotificationsAvailable) return null;
  if (notifications) return notifications;

  try {
    notifications = require('expo-notifications') as NotificationModule;
    notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    return notifications;
  } catch (error) {
    console.error('EVI native notifications are unavailable', error);
    return null;
  }
}

export function areNativeNotificationsAvailable(): boolean {
  return nativeNotificationsAvailable;
}

// ─── Android channel ──────────────────────────────────────────────────────────
export async function setupNotificationChannel(): Promise<void> {
  const module = getNotificationsModule();
  if (module && Platform.OS === 'android') {
    try {
      await module.setNotificationChannelAsync('evi-default', {
        name: 'Recordatorios EVI',
        importance: module.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#E891A5',
        sound: 'default',
      });
    } catch (error) {
      console.error('Unable to configure EVI notification channel', error);
    }
  }
}

// ─── Permissions ──────────────────────────────────────────────────────────────
export async function requestNotificationPermissions(): Promise<NotificationPermissionResult> {
  const module = getNotificationsModule();
  if (!module) return { available: false, granted: false };

  try {
    const { status: existing } = await module.getPermissionsAsync();
    if (existing === 'granted') return { available: true, granted: true };
    const { status } = await module.requestPermissionsAsync();
    return { available: true, granted: status === 'granted' };
  } catch (error) {
    console.error('Unable to request EVI notification permissions', error);
    return { available: true, granted: false };
  }
}

export async function hasNotificationPermissions(): Promise<boolean> {
  const module = getNotificationsModule();
  if (!module) return false;
  try {
    const { status } = await module.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Unable to read EVI notification permissions', error);
    return false;
  }
}

// ─── Notification content helpers ─────────────────────────────────────────────
const mealBodyText: Record<MealType, string> = {
  breakfast: '🌞 Tienes una toma programada para tu desayuno',
  lunch: '🍓 Tienes una toma programada para tu almuerzo',
  dinner: '🌙 Tienes una toma programada para tu cena',
};

const mealLabel: Record<MealType, string> = {
  breakfast: 'desayuno',
  lunch: 'almuerzo',
  dinner: 'cena',
};

function notificationId(medicationId: string, mealType: MealType): string {
  return `evi-${medicationId}-${mealType}`;
}

function snoozeNotificationId(medicationId: string, mealType: MealType): string {
  return `evi-snooze-${medicationId}-${mealType}`;
}

function medicationNotificationId(medicationId: string): string {
  return `evi-medication-${medicationId}`;
}

function parseTime(value?: string): { hour: number; minute: number } | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value ?? '');
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

function nextIntervalSeconds(time: string, intervalHours: number, now: Date): number | null {
  const parsed = parseTime(time);
  if (!parsed || !Number.isInteger(intervalHours) || intervalHours <= 0) return null;

  const anchor = new Date(now);
  anchor.setHours(parsed.hour, parsed.minute, 0, 0);
  const intervalMs = intervalHours * 60 * 60 * 1000;
  let next = anchor.getTime();
  while (next <= now.getTime()) next += intervalMs;
  return Math.max(60, Math.round((next - now.getTime()) / 1000));
}

function mealNotificationRequest(
  module: NotificationModule,
  medication: Medication,
  mealType: MealType,
  settings: AppSettings,
  mealEvents: MealEvent[],
): unknown | null {
  const learned = getLearnedMealTime(mealEvents, mealType, new Date());
  const time = parseTime(learned.hasEnoughData ? learned.learnedTime : settings.referenceTimes[mealType]);
  if (!time) return null;
  return {
    identifier: notificationId(medication.id, mealType),
    content: {
      title: `EVI 🌸  ${medication.name}`,
      body: `${mealBodyText[mealType]} (${mealLabel[mealType]})`,
      sound: 'default',
      data: { medicationId: medication.id, mealType },
    },
    trigger: {
      type: module.SchedulableTriggerInputTypes.DAILY,
      hour: time.hour,
      minute: time.minute,
    },
  };
}

function medicationNotificationRequest(
  module: NotificationModule,
  medication: Medication,
  settings: AppSettings,
  mealEvents: MealEvent[],
): unknown | null {
  const schedule = medication.schedule;
  if (!schedule) return null;

  if (schedule.type === 'BEFORE_MEAL' || schedule.type === 'WITH_MEAL' || schedule.type === 'AFTER_MEAL') {
    return null;
  }

  if (schedule.type === 'TIME') {
    const time = parseTime(schedule.time);
    if (!time) return null;
    return {
      identifier: medicationNotificationId(medication.id),
      content: {
        title: `EVI 🌸  ${medication.name}`,
        body: 'Tienes un recordatorio registrado para este medicamento.',
        sound: 'default',
        data: { medicationId: medication.id, scheduleType: schedule.type },
      },
      trigger: {
        type: module.SchedulableTriggerInputTypes.DAILY,
        hour: time.hour,
        minute: time.minute,
      },
    };
  }

  if (schedule.type === 'INTERVAL' && schedule.time && schedule.intervalHours) {
    const seconds = nextIntervalSeconds(schedule.time, schedule.intervalHours, new Date());
    if (!seconds) return null;
    return {
      identifier: medicationNotificationId(medication.id),
      content: {
        title: `EVI 🌸  ${medication.name}`,
        body: `Tienes un recordatorio registrado cada ${schedule.intervalHours} horas.`,
        sound: 'default',
        data: { medicationId: medication.id, scheduleType: schedule.type },
      },
      trigger: {
        type: module.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        repeats: true,
      },
    };
  }

  if (schedule.type === 'WEEKDAYS' && schedule.time && schedule.weekdays?.length) {
    const time = parseTime(schedule.time);
    if (!time) return null;
    return schedule.weekdays.map((weekday) => ({
      identifier: `${medicationNotificationId(medication.id)}-${weekday}`,
      content: {
        title: `EVI 🌸  ${medication.name}`,
        body: 'Tienes un recordatorio registrado para este día.',
        sound: 'default',
        data: { medicationId: medication.id, scheduleType: schedule.type, weekday },
      },
      trigger: {
        type: module.SchedulableTriggerInputTypes.WEEKLY,
        weekday: weekday === 0 ? 1 : weekday + 1,
        hour: time.hour,
        minute: time.minute,
      },
    }));
  }

  return null;
}

// ─── Scheduling ───────────────────────────────────────────────────────────────
export async function scheduleAllNotifications(
  medications: Medication[],
  settings: AppSettings,
  mealEvents: MealEvent[],
): Promise<void> {
  const operation = schedulingQueue.then(() => scheduleAllNotificationsInternal(medications, settings, mealEvents));
  schedulingQueue = operation.then(() => undefined, () => undefined);
  await operation;
}

async function scheduleAllNotificationsInternal(
  medications: Medication[],
  settings: AppSettings,
  mealEvents: MealEvent[],
): Promise<void> {
  const module = getNotificationsModule();
  if (!module) return;

  try {
    const scheduled = await module.getAllScheduledNotificationsAsync();
    const activeMedicationIds = new Set(medications.filter((medication) => medication.active).map((medication) => medication.id));
    await Promise.all(
      scheduled
        .filter(({ identifier }) => {
          if (!identifier.startsWith('evi-snooze-')) return true;
          return !medications.some(
            (medication) => activeMedicationIds.has(medication.id) &&
              identifier.startsWith(`evi-snooze-${medication.id}-`),
          );
        })
        .map(({ identifier }) =>
          module.cancelScheduledNotificationAsync(identifier).catch((error) => {
            console.warn('Unable to cancel an old EVI notification', identifier, error);
          }),
        ),
    );

    const active = medications.filter((m) => m.active);

    for (const med of active) {
      const isMealSchedule = med.schedule
        ? ['BEFORE_MEAL', 'WITH_MEAL', 'AFTER_MEAL'].includes(med.schedule.type) &&
          (med.schedule.mealTypes?.length ?? 0) > 0
        : med.mealTypes.length > 0;
      const mealTypes = med.schedule?.mealTypes ?? med.mealTypes;

      if (isMealSchedule) {
        for (const mealType of mealTypes) {
          const request = mealNotificationRequest(module, med, mealType, settings, mealEvents);
          if (request) await module.scheduleNotificationAsync(request);
        }
        continue;
      }

      const request = medicationNotificationRequest(module, med, settings, mealEvents);
      if (Array.isArray(request)) {
        for (const item of request) await module.scheduleNotificationAsync(item);
      } else if (request) {
        await module.scheduleNotificationAsync(request);
      }
    }
  } catch (error) {
    console.error('Unable to schedule EVI notifications', error);
  }
}

/**
 * Re-schedules only if permissions are already granted.
 * Safe to call after any data mutation.
 */
export async function rescheduleIfPermitted(
  medications: Medication[],
  settings: AppSettings,
  mealEvents: MealEvent[],
): Promise<void> {
  const granted = await hasNotificationPermissions();
  if (!granted) return;
  await scheduleAllNotifications(medications, settings, mealEvents);
}

export async function cancelAllNotifications(): Promise<void> {
  const module = getNotificationsModule();
  if (!module) return;
  try {
    await module.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Unable to cancel EVI notifications', error);
  }
}

// ─── Snooze ───────────────────────────────────────────────────────────────────
export async function scheduleSnoozeNotification(
  medication: Medication,
  mealType: MealType,
  delayMinutes = 30,
): Promise<void> {
  const module = getNotificationsModule();
  if (!module) return;

  const id = snoozeNotificationId(medication.id, mealType);

  // Cancel any existing snooze for this medication+meal
  try {
    await module.cancelScheduledNotificationAsync(id);
  } catch {
    // Ignore — notification might not exist
  }

  try {
    await module.scheduleNotificationAsync({
      identifier: id,
      content: {
        title: `EVI 🌸  ${medication.name}`,
        body: `Recordatorio: tu ${mealLabel[mealType]} te está esperando 💊`,
        sound: 'default',
        data: { medicationId: medication.id, mealType, snooze: true },
      },
      trigger: {
        type: module.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: delayMinutes * 60,
        repeats: false,
      },
    });
  } catch (error) {
    console.error('Unable to schedule EVI snooze notification', error);
  }
}

export async function scheduleDailyReminders(
  medications: Medication[],
  settings: AppSettings,
  mealEvents: MealEvent[],
): Promise<void> {
  await scheduleAllNotifications(medications, settings, mealEvents);
}

export async function syncNotifications(
  medications: Medication[],
  settings: AppSettings,
  mealEvents: MealEvent[],
): Promise<void> {
  await rescheduleIfPermitted(medications, settings, mealEvents);
}
