import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEvi } from '../../src/hooks/use-evi';
import { MealType, mealMeta, Medication } from '../../src/types';
import { dosesForMeal, mealRelationshipLabel } from '../../src/domain/routine';
import { colors, fontSize, radius, spacing } from '../../src/theme';
import { EviCard } from '../../src/components/EviCard';
import { ConfirmButton } from '../../src/components/ConfirmButton';
import { GhostButton } from '../../src/components/GhostButton';

export default function MealDetailScreen() {
  const router = useRouter();
  const { type, contextual } = useLocalSearchParams<{ type: string; contextual?: string }>();
  const mealType = (type as MealType) || 'lunch';
  const meta = mealMeta[mealType] || mealMeta.lunch;

  const { data, recordDose, registerMealEvent, snoozeDose } = useEvi();
  const { medications, doseLogs } = data;

  const pendingMeds = dosesForMeal(medications, doseLogs, mealType);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleTakeDose = async (med: Medication) => {
    setLoading(true);
    try {
      // Record dose
      const note = notes[med.id]?.trim();
      await recordDose(med, mealType, note || undefined);

      // Navigate to confirmation screen
      router.replace({
        pathname: '/confirm',
        params: {
          mealType,
          medicationName: med.name,
        },
      });
    } catch (err) {
      console.error('Error recording dose:', err);
      Alert.alert('Error', 'No pudimos registrar la toma localmente.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterMeal = async () => {
    try {
      await registerMealEvent(mealType);
      Alert.alert('Comida registrada', `Registramos tu ${meta.label.toLowerCase()} sin asociarla automáticamente a una toma.`);
    } catch (err) {
      console.error('Error recording meal:', err);
      Alert.alert('Error', 'No pudimos registrar la comida localmente.');
    }
  };

  const handleSnooze = async (med: Medication) => {
    try {
      await snoozeDose(med, mealType, 30);
      Alert.alert(
        'Recordatorio pospuesto ⏰',
        `Te avisaremos de nuevo en 30 minutos para tu toma de ${med.name}.`,
        [{ text: 'Entendido', onPress: () => router.replace('/(tabs)/home') }]
      );
    } catch (err) {
      console.error('Error snoozing dose:', err);
      router.replace('/(tabs)/home');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.mealEmoji}>{meta.emoji}</Text>
            <Text style={styles.title}>Momento de {meta.label.toLowerCase()}</Text>
            {contextual !== '1' && (
              <GhostButton
                title="Registrar que comí"
                color={colors.roseDark}
                onPress={handleRegisterMeal}
                style={styles.registerMealBtn}
              />
            )}
          </View>

          {pendingMeds.length === 0 ? (
            /* No pending doses */
            <EviCard variant="lavender" style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>✨</Text>
              <Text style={styles.emptyTitle}>¡Todo al día!</Text>
              <Text style={styles.emptySubtitle}>
                No tienes tomas pendientes asociadas a tu {meta.label.toLowerCase()}. ¡Disfruta tu comida con calma y tranquilidad! 🌸
              </Text>
              <ConfirmButton
                title="Volver al inicio"
                onPress={() => router.replace('/(tabs)/home')}
                style={styles.backHomeBtn}
              />
            </EviCard>
          ) : (
            /* Has pending medications */
            <View>
              <Text style={styles.noticeBanner}>
                💊 Para tu {meta.label.toLowerCase()} tienes registrado:
              </Text>

              {pendingMeds.map((med) => (
                <EviCard key={med.id} variant="white" style={styles.medCard}>
                  <Text style={styles.medName}>{med.name}</Text>
                  <Text style={styles.relationshipLabel}>{mealRelationshipLabel(med)}</Text>

                  <View style={styles.instructionsBox}>
                    <Text style={styles.instructionsLabel}>Indicaciones médicas:</Text>
                    <Text style={styles.instructionsText}>{med.instructions}</Text>
                  </View>

                  <Text style={styles.noteLabel}>Nota opcional (síntoma, comida, etc.):</Text>
                  <TextInput
                    value={notes[med.id] || ''}
                    onChangeText={(text) =>
                      setNotes((prev) => ({ ...prev, [med.id]: text }))
                    }
                    placeholder="Ej. Con un vaso de agua..."
                    placeholderTextColor={colors.muted}
                    style={styles.noteInput}
                  />

                  <View style={styles.actionsGroup}>
                    <ConfirmButton
                      title="Ya la tomé 💗"
                      variant="success"
                      loading={loading}
                      onPress={() => handleTakeDose(med)}
                    />

                    <GhostButton
                      title="Recordarme después ⏰ (30 min)"
                      color={colors.lavenderDark}
                      onPress={() => handleSnooze(med)}
                      style={styles.snoozeBtn}
                    />
                  </View>
                </EviCard>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <GhostButton
            title="← Regresar"
            color={colors.muted}
            onPress={() => router.back()}
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
  header: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  mealEmoji: {
    fontSize: 44,
    marginBottom: 4,
  },
  title: {
    fontSize: fontSize.xl + 2,
    fontWeight: '700',
    color: colors.plum,
    textTransform: 'capitalize',
  },
  registerMealBtn: {
    marginTop: spacing.sm,
  },
  noticeBanner: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.roseDark,
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  medCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  medName: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.plum,
  },
  relationshipLabel: {
    fontSize: fontSize.sm,
    color: colors.lavenderDark,
    marginTop: 2,
  },
  instructionsBox: {
    backgroundColor: colors.blush,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  instructionsLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.roseDark,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  instructionsText: {
    fontSize: fontSize.sm + 1,
    color: colors.plum,
    lineHeight: 20,
  },
  noteLabel: {
    fontSize: fontSize.xs + 1,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: 4,
  },
  noteInput: {
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 4,
    fontSize: fontSize.sm,
    color: colors.plum,
    marginBottom: spacing.lg,
  },
  actionsGroup: {
    gap: spacing.xs,
  },
  snoozeBtn: {
    marginTop: spacing.xs,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xl,
    marginTop: spacing.lg,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.plum,
  },
  emptySubtitle: {
    fontSize: fontSize.md,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  backHomeBtn: {
    width: '100%',
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
});
