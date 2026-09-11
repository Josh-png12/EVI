export type MealType = 'breakfast' | 'lunch' | 'dinner';

export type DoseStatus = 'pending' | 'taken' | 'snoozed' | 'unrecorded';

export type ScheduleType =
  | 'TIME'
  | 'INTERVAL'
  | 'FASTING'
  | 'BEFORE_MEAL'
  | 'AFTER_MEAL'
  | 'WITH_MEAL'
  | 'WEEKDAYS'
  | 'CUSTOM';

export interface MedicationSchedule {
  type: ScheduleType;
  time?: string;
  intervalHours?: number;
  mealTypes?: MealType[];
  weekdays?: number[];
  customText?: string;
}

export interface Medication {
  id: string;
  name: string;
  instructions: string;
  doseLabel?: string;
  schedule?: MedicationSchedule;
  mealTypes: MealType[];
  active: boolean;
  createdAt: string;
}

export interface DoseLog {
  id: string;
  medicationId: string;
  medicationName: string;
  mealType?: MealType;
  scheduledAt?: string;
  occurredAt: string;
  status: 'taken';
  note?: string;
}

export interface MealEvent {
  id: string;
  mealType: MealType;
  occurredAt: string;
  source?: 'manual' | 'contextual';
  note?: string;
  isOutOfRoutine?: boolean;
}

export type RoutineConfidence = 'none' | 'preliminary' | 'established';

export interface LearnedMealRoutine {
  mealType: MealType;
  learnedTime?: string;
  sampleSize: number;
  hasEnoughData: boolean;
  confidence: RoutineConfidence;
}

export type MedicationStatusKind = 'pending' | 'taken' | 'upcoming';

export interface MedicationStatusItem {
  medication: Medication;
  status: MedicationStatusKind;
  contextLabel: string;
  dueAt?: string;
  occurrenceAt?: string;
  mealType?: MealType;
}

export interface CurrentMedicationStatus {
  now: Date;
  pending: MedicationStatusItem[];
  next?: MedicationStatusItem;
  taken: MedicationStatusItem[];
  upcoming: MedicationStatusItem[];
}

export interface AppSettings {
  name: string;
  referenceTimes: Record<MealType, string>;
  mealContextDismissedOn?: string;
}

export interface AppData {
  onboardingComplete: boolean;
  settings: AppSettings;
  medications: Medication[];
  doseLogs: DoseLog[];
  mealEvents: MealEvent[];
}

export const mealMeta: Record<MealType, { label: string; emoji: string }> = {
  breakfast: { label: 'Desayuno', emoji: '🌞' },
  lunch: { label: 'Almuerzo', emoji: '🍓' },
  dinner: { label: 'Cena', emoji: '🌙' },
};

export const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner'];

// ─── Onboarding draft (in-memory only, not persisted) ────────────────────────
export interface OnboardingDraft {
  name: string;
  medications: Array<Omit<Medication, 'id' | 'createdAt'>>;
  referenceTimes: Record<MealType, string>;
}

export const defaultDraft: OnboardingDraft = {
  name: '',
  medications: [],
  referenceTimes: { breakfast: '08:15', lunch: '13:00', dinner: '19:30' },
};

// ─── History display ──────────────────────────────────────────────────────────
export interface HistoryEntry {
  date: string; // YYYY-MM-DD
  medicationId: string;
  medicationName: string;
  mealType?: MealType;
  status: DoseStatus;
  occurredAt?: string;
  note?: string;
}
