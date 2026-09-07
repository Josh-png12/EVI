import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOnboarding } from '../../src/context/onboarding-context';
import { MedicationSchedule } from '../../src/types';
import { colors, fontSize, radius, spacing } from '../../src/theme';
import { ConfirmButton } from '../../src/components/ConfirmButton';
import { GhostButton } from '../../src/components/GhostButton';
import { EviCard } from '../../src/components/EviCard';
import { MedicationScheduleForm, scheduleLabel } from '../../src/components/MedicationScheduleForm';

export default function StepMedicationsScreen() {
  const router = useRouter();
  const { draft, addDraftMedication, removeDraftMedication } = useOnboarding();

  const [medName, setMedName] = useState('');
  const [doseLabel, setDoseLabel] = useState('');
  const [instructions, setInstructions] = useState('');
  const [schedule, setSchedule] = useState<MedicationSchedule>();
  const [showForm, setShowForm] = useState(draft.medications.length === 0);

  const isScheduleComplete = (value?: MedicationSchedule) => {
    if (!value) return false;
    if ((value.type === 'BEFORE_MEAL' || value.type === 'AFTER_MEAL' || value.type === 'WITH_MEAL') && !value.mealTypes?.length) return false;
    if (value.type === 'INTERVAL' && (!value.intervalHours || !value.time)) return false;
    if (value.type === 'TIME' && !value.time) return false;
    if (value.type === 'WEEKDAYS' && !value.weekdays?.length) return false;
    if (value.type === 'CUSTOM' && !value.customText?.trim()) return false;
    return true;
  };

  const handleAddMed = () => {
    if (!medName.trim()) {
      Alert.alert('Falta información', 'Por favor escribe el nombre de tu medicamento.');
      return;
    }
    if (!isScheduleComplete(schedule)) {
      Alert.alert('Falta la pauta', 'Selecciona y completa la pauta registrada para este medicamento.');
      return;
    }

    addDraftMedication({
      name: medName.trim(),
      instructions: instructions.trim() || 'Tomar según indicación médica',
      doseLabel: doseLabel.trim() || undefined,
      schedule,
      mealTypes: schedule?.mealTypes ?? [],
      active: true,
    });

    setMedName('');
    setDoseLabel('');
    setInstructions('');
    setSchedule(undefined);
    setShowForm(false);
  };

  const handleContinue = () => {
    if (draft.medications.length === 0 && !medName.trim()) {
      Alert.alert(
        '¿Continuar sin medicamentos?',
        'Puedes agregar medicamentos más adelante en Ajustes si lo prefieres.',
        [
          { text: 'Agregar ahora', style: 'cancel' },
          { text: 'Continuar', onPress: () => router.push('/onboarding/step-times') },
        ]
      );
      return;
    }

    if (medName.trim()) {
      if (!isScheduleComplete(schedule)) {
        Alert.alert('Falta la pauta', 'Selecciona y completa la pauta registrada para este medicamento.');
        return;
      }
      addDraftMedication({
        name: medName.trim(),
        instructions: instructions.trim() || 'Tomar según indicación médica',
        doseLabel: doseLabel.trim() || undefined,
        schedule,
        mealTypes: schedule?.mealTypes ?? [],
        active: true,
      });
    }

    router.push('/onboarding/step-times');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.stepIndicator}>Paso 2 de 4</Text>
          <Text style={styles.title}>Tus medicamentos 💊</Text>
          <Text style={styles.subtitle}>
            Ingresa los medicamentos que tu médico ya te indicó y con qué comida los tomas.
          </Text>

          {/* List of already added medications */}
          {draft.medications.map((med, index) => (
            <EviCard key={index} variant="white" style={styles.medCard}>
              <View style={styles.medCardHeader}>
                <Text style={styles.medCardTitle}>{med.name}</Text>
                <TouchableOpacity onPress={() => removeDraftMedication(index)}>
                  <Text style={styles.deleteBtn}>Eliminar</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.medCardInstructions}>{med.instructions}</Text>
              {med.doseLabel && <Text style={styles.medCardDose}>Dosis registrada: {med.doseLabel}</Text>}
              <Text style={styles.medCardSchedule}>{scheduleLabel(med.schedule)}</Text>
              <View style={styles.chipsRow}>
                {med.schedule?.mealTypes?.map((meal) => (
                  <View key={meal} style={styles.mealChip}><Text style={styles.mealChipText}>{meal}</Text></View>
                ))}
              </View>
            </EviCard>
          ))}

          {/* Form to add a new medication */}
          {showForm ? (
            <EviCard variant="blush" style={styles.formCard}>
              <Text style={styles.formTitle}>
                {draft.medications.length === 0 ? 'Agregar medicamento' : 'Otro medicamento'}
              </Text>

              <Text style={styles.inputLabel}>Nombre del medicamento</Text>
              <TextInput
                value={medName}
                onChangeText={setMedName}
                placeholder="Ej. Levotiroxina, Vitamina D..."
                placeholderTextColor={colors.muted}
                style={styles.input}
              />

              <Text style={styles.inputLabel}>Dosis registrada (opcional)</Text>
              <TextInput
                value={doseLabel}
                onChangeText={setDoseLabel}
                placeholder="Ej. 1 comprimido"
                placeholderTextColor={colors.muted}
                style={styles.input}
              />

              <Text style={styles.inputLabel}>Instrucciones médicas indicadas</Text>
              <TextInput
                value={instructions}
                onChangeText={setInstructions}
                placeholder="Ej. 1 comprimido en ayunas con agua"
                placeholderTextColor={colors.muted}
                style={[styles.input, styles.textArea]}
                multiline
              />

              <MedicationScheduleForm schedule={schedule} onChange={setSchedule} />

              <ConfirmButton
                title="Guardar medicamento"
                icon="✨"
                variant="accent"
                onPress={handleAddMed}
                style={styles.saveMedBtn}
              />
            </EviCard>
          ) : (
            <GhostButton
              title="+ Agregar otro medicamento"
              color={colors.roseDark}
              onPress={() => setShowForm(true)}
              style={styles.addMoreBtn}
            />
          )}
        </ScrollView>

        <View style={styles.footer}>
          <ConfirmButton
            title="Continuar"
            icon="🌸"
            onPress={handleContinue}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  scroll: {
    padding: spacing.lg,
  },
  stepIndicator: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.roseDark,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: fontSize.xl + 2,
    fontWeight: '700',
    color: colors.plum,
    marginTop: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.muted,
    marginTop: spacing.xs,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  medCard: {
    marginBottom: spacing.md,
  },
  medCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  medCardTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.plum,
  },
  deleteBtn: {
    fontSize: fontSize.sm,
    color: colors.roseDark,
    fontWeight: '600',
  },
  medCardInstructions: {
    fontSize: fontSize.sm,
    color: colors.muted,
    marginTop: spacing.xs,
  },
  medCardDose: {
    fontSize: fontSize.xs,
    color: colors.plum,
    marginTop: 4,
  },
  medCardSchedule: {
    fontSize: fontSize.xs,
    color: colors.roseDark,
    marginTop: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  mealChip: {
    backgroundColor: colors.lavender,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  mealChipText: {
    fontSize: fontSize.xs,
    color: colors.lavenderDark,
    fontWeight: '600',
  },
  formCard: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  formTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.plum,
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.plum,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSize.md,
    color: colors.plum,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  mealSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  mealOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  mealOptionSelected: {
    borderColor: colors.rose,
    backgroundColor: colors.blush,
  },
  mealOptionEmoji: {
    fontSize: fontSize.lg,
  },
  mealOptionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.muted,
    marginTop: 2,
  },
  mealOptionLabelSelected: {
    color: colors.roseDark,
  },
  saveMedBtn: {
    marginTop: spacing.sm,
    height: 44,
  },
  addMoreBtn: {
    marginVertical: spacing.sm,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.cream,
  },
});
