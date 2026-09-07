import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { AppSettings, MealEvent, MealType, Medication } from '../../types';
import { usualMealTime } from '../../domain/routine';

declare const require: (moduleName: string) => unknown;

type NotificationModule = {
  AndroidImportance: { HIGH: unknown };
  SchedulableTriggerInputTypes: { DAILY: unknown; TIME_INTERVAL: unknown };
  setNotificationHandler: (handler: unknown) => void;
  setNotificationChannelAsync: (channelId: string, channel: unknown) => Promise<unknown>;
  getPermissionsAsync: () => Promise<{ status: string }>;
  requestPermissionsAsync: () => Promise<{ status: string }>;
  cancelAllScheduledNotificationsAsync: () => Promise<void>;
  cancelScheduledNotificationAsync: (identifier: string) => Promise<void>;
  scheduleNotificationAsync: (request: unknown) => Promise<unknown>;
};

export type NotificationPermissionResult = { available: boolean; granted: boolean };

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const nativeNotificationsAvailable = !isExpoGo;
let notifications: NotificationModule | null = null;

function getNotificationsModule(): NotificationModule | null {
  if (!nativeNotificationsAvailable) return null;
  if (notifications) return notifications;

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
}

export function areNativeNotificationsAvailable(): boolean {
  return nativeNotificationsAvailable;
}

// ─── Android channel ──────────────────────────────────────────────────────────
export async function setupNotificationChannel(): Promise<void> {
  const module = getNotificationsModule();
  if (module && Platform.OS === 'android') {
    await module.setNotificationChannelAsync('evi-default', {
      name: 'Recordatorios EVI',
      importance: module.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#E891A5',
      sound: 'default',
    });
  }
}

// ─── Permissions ──────────────────────────────────────────────────────────────
export async function requestNotificationPermissions(): Promise<NotificationPermissionResult> {
  const module = getNotificationsModule();
  if (!module) return { available: false, granted: false };

  const { status: existing } = await module.getPermissionsAsync();
  if (existing === 'granted') return { available: true, granted: true };
  const { status } = await module.requestPermissionsAsync();
  return { available: true, granted: status === 'granted' };
}

export async function hasNotificationPermissions(): Promise<boolean> {
  const module = getNotificationsModule();
  if (!module) return false;
  const { status } = await module.getPermissionsAsync();
  return status === 'granted';
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

// ─── Scheduling ───────────────────────────────────────────────────────────────
export async function scheduleAllNotifications(
  medications: Medication[],
  settings: AppSettings,
  mealEvents: MealEvent[],
): Promise<void> {
  const module = getNotificationsModule();
  if (!module) return;

  await module.cancelAllScheduledNotificationsAsync();

  const active = medications.filter((m) => m.active);

  for (const med of active) {
    for (const mealType of med.mealTypes) {
      const timeStr = usualMealTime(mealEvents, mealType, settings.referenceTimes[mealType]);
      const parts = timeStr.split(':');
      const hour = parseInt(parts[0] ?? '8', 10);
      const minute = parseInt(parts[1] ?? '0', 10);

      await module.scheduleNotificationAsync({
        identifier: notificationId(med.id, mealType),
        content: {
          title: `EVI 🌸  ${med.name}`,
          body: mealBodyText[mealType],
          sound: 'default',
          data: { medicationId: med.id, mealType },
        },
        trigger: {
          type: module.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      });
    }
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
  await module.cancelAllScheduledNotificationsAsync();
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
