import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  MealType,
  MedicationSchedule,
  ScheduleType,
  mealMeta,
  mealTypes,
} from '../types';
import { colors, fontSize, radius, spacing } from '../theme';

type Props = {
  schedule?: MedicationSchedule;
  onChange: (schedule: MedicationSchedule | undefined) => void;
};

const scheduleOptions: Array<{ type: ScheduleType; label: string }> = [
  { type: 'TIME', label: 'Hora específica' },
  { type: 'INTERVAL', label: 'Cada X horas' },
  { type: 'FASTING', label: 'En ayunas' },
  { type: 'BEFORE_MEAL', label: 'Antes de comer' },
  { type: 'AFTER_MEAL', label: 'Después de comer' },
  { type: 'WITH_MEAL', label: 'Con comida' },
  { type: 'WEEKDAYS', label: 'Días específicos' },
  { type: 'CUSTOM', label: 'Otra indicación' },
];

const weekdayOptions = [
  { value: 1, label: 'L' },
  { value: 2, label: 'M' },
  { value: 3, label: 'X' },
  { value: 4, label: 'J' },
  { value: 5, label: 'V' },
  { value: 6, label: 'S' },
  { value: 0, label: 'D' },
];

function initialSchedule(type: ScheduleType): MedicationSchedule {
  if (type === 'TIME') return { type, time: '08:00' };
  if (type === 'INTERVAL') return { type, intervalHours: 8, time: '08:00' };
  if (type === 'BEFORE_MEAL' || type === 'AFTER_MEAL' || type === 'WITH_MEAL') {
    return { type, mealTypes: ['breakfast'] };
  }
  if (type === 'WEEKDAYS') return { type, weekdays: [] };
  if (type === 'CUSTOM') return { type, customText: '' };
  return { type };
}

export function scheduleLabel(schedule?: MedicationSchedule): string {
  if (!schedule) return 'Requiere configuración';
  const option = scheduleOptions.find((item) => item.type === schedule.type);
  if (schedule.type === 'CUSTOM') return schedule.customText || option?.label || 'Otra indicación';
  if (schedule.type === 'TIME') return `${option?.label}: ${schedule.time || '--:--'}`;
  if (schedule.type === 'INTERVAL') {
    return `${option?.label}: ${schedule.intervalHours || '?'} h desde ${schedule.time || '--:--'}`;
  }
  if (schedule.mealTypes?.length) {
    const meals = schedule.mealTypes.map((meal) => mealMeta[meal].label).join(', ');
    return `${option?.label}: ${meals}`;
  }
  if (schedule.type === 'WEEKDAYS') {
    return `${option?.label}: ${schedule.weekdays?.length ? 'Configurados' : 'Sin días'}`;
  }
  return option?.label || 'Pauta configurada';
}

export function MedicationScheduleForm({ schedule, onChange }: Props) {
  const selectedType = schedule?.type;

  const selectType = (type: ScheduleType) => {
    onChange(initialSchedule(type));
  };

  const toggleMeal = (meal: MealType) => {
    if (!schedule) return;
    const selectedMeals = schedule.mealTypes ?? [];
    onChange({
      ...schedule,
      mealTypes: selectedMeals.includes(meal)
        ? selectedMeals.filter((item) => item !== meal)
        : [...selectedMeals, meal],
    });
  };

  const toggleWeekday = (weekday: number) => {
    if (!schedule) return;
    const weekdays = schedule.weekdays ?? [];
    onChange({
      ...schedule,
      weekdays: weekdays.includes(weekday)
        ? weekdays.filter((item) => item !== weekday)
        : [...weekdays, weekday],
    });
  };

  return (
    <View>
      <Text style={styles.label}>Pauta registrada</Text>
      <View style={styles.optionsGrid}>
        {scheduleOptions.map((option) => (
          <TouchableOpacity
            key={option.type}
            onPress={() => selectType(option.type)}
            style={[styles.option, selectedType === option.type && styles.optionSelected]}
          >
            <Text
              style={[styles.optionText, selectedType === option.type && styles.optionTextSelected]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {!schedule && <Text style={styles.help}>Selecciona una pauta para continuar.</Text>}

      {schedule?.type === 'TIME' && (
        <TextInput
          value={schedule.time ?? ''}
          onChangeText={(time) => onChange({ ...schedule, time })}
          placeholder="HH:MM"
          placeholderTextColor={colors.muted}
          keyboardType="numbers-and-punctuation"
          maxLength={5}
          style={styles.input}
        />
      )}

      {schedule?.type === 'INTERVAL' && (
        <View style={styles.row}>
          <TextInput
            value={schedule.intervalHours?.toString() ?? ''}
            onChangeText={(value) =>
              onChange({ ...schedule, intervalHours: Number(value.replace(/[^0-9]/g, '')) || undefined })
            }
            placeholder="Horas"
            placeholderTextColor={colors.muted}
            keyboardType="number-pad"
            style={[styles.input, styles.smallInput]}
          />
          <Text style={styles.inlineText}>horas, desde</Text>
          <TextInput
            value={schedule.time ?? ''}
            onChangeText={(time) => onChange({ ...schedule, time })}
            placeholder="HH:MM"
            placeholderTextColor={colors.muted}
            keyboardType="numbers-and-punctuation"
            maxLength={5}
            style={[styles.input, styles.timeInput]}
          />
        </View>
      )}

      {(schedule?.type === 'BEFORE_MEAL' ||
        schedule?.type === 'AFTER_MEAL' ||
        schedule?.type === 'WITH_MEAL') && (
        <View>
          <Text style={styles.subLabel}>Comidas asociadas</Text>
          <View style={styles.mealsRow}>
            {mealTypes.map((meal) => {
              const selected = schedule.mealTypes?.includes(meal) ?? false;
              return (
                <TouchableOpacity
                  key={meal}
                  onPress={() => toggleMeal(meal)}
                  style={[styles.mealOption, selected && styles.optionSelected]}
                >
                  <Text style={styles.mealEmoji}>{mealMeta[meal].emoji}</Text>
                  <Text style={[styles.mealText, selected && styles.optionTextSelected]}>
                    {mealMeta[meal].label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {!schedule.mealTypes?.length && <Text style={styles.help}>Selecciona al menos una comida.</Text>}
        </View>
      )}

      {schedule?.type === 'WEEKDAYS' && (
        <View>
          <Text style={styles.subLabel}>Días de la semana</Text>
          <View style={styles.weekdaysRow}>
            {weekdayOptions.map((weekday) => {
              const selected = schedule.weekdays?.includes(weekday.value) ?? false;
              return (
                <TouchableOpacity
                  key={weekday.value}
                  onPress={() => toggleWeekday(weekday.value)}
                  style={[styles.weekday, selected && styles.optionSelected]}
                >
                  <Text style={[styles.weekdayText, selected && styles.optionTextSelected]}>
                    {weekday.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.help}>Solo se guardan los días seleccionados; EVI no calcula dosis.</Text>
        </View>
      )}

      {schedule?.type === 'CUSTOM' && (
        <TextInput
          value={schedule.customText ?? ''}
          onChangeText={(customText) => onChange({ ...schedule, customText })}
          placeholder="Escribe la indicación proporcionada"
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.textArea]}
          multiline
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.plum, marginBottom: spacing.xs },
  subLabel: { fontSize: fontSize.xs, fontWeight: '600', color: colors.muted, marginTop: spacing.sm, marginBottom: spacing.xs },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  option: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  optionSelected: { borderColor: colors.rose, backgroundColor: colors.blush },
  optionText: { fontSize: fontSize.xs, color: colors.muted, fontWeight: '600' },
  optionTextSelected: { color: colors.roseDark },
  help: { fontSize: fontSize.xs, color: colors.muted, marginTop: spacing.xs },
  input: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: fontSize.md, color: colors.plum, marginTop: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  smallInput: { width: 80 },
  timeInput: { width: 90 },
  inlineText: { fontSize: fontSize.sm, color: colors.muted },
  mealsRow: { flexDirection: 'row', gap: spacing.xs },
  mealOption: { flex: 1, alignItems: 'center', borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.sm, paddingVertical: spacing.xs, backgroundColor: colors.white },
  mealEmoji: { fontSize: fontSize.md },
  mealText: { fontSize: 10, color: colors.muted, marginTop: 2 },
  weekdaysRow: { flexDirection: 'row', gap: spacing.xs },
  weekday: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.full, backgroundColor: colors.white },
  weekdayText: { fontSize: fontSize.xs, color: colors.muted, fontWeight: '700' },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
});