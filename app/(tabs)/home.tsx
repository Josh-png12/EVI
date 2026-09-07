import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useEvi } from '../../src/hooks/use-evi';
import { MealType, mealMeta, mealTypes, Medication, DoseLog } from '../../src/types';
import { dosesForMeal, dayProgress, isMedicationTakenToday } from '../../src/domain/routine';
import { colors, fontSize, radius, shadow, spacing } from '../../src/theme';
import { EviCard } from '../../src/components/EviCard';
import { ConfirmButton } from '../../src/components/ConfirmButton';
import { PillBadge } from '../../src/components/PillBadge';

// Definir tipos para los datos devueltos por useEvi (si no están exportados)
interface EviData {
  settings: {
    name?: string;
    referenceTimes: Record<MealType, string>;
  };
  medications: Medication[];
  doseLogs: DoseLog[];
}

export default function HomeScreen() {
  const router = useRouter();
  const { data } = useEvi() as { data: EviData }; // aserción de tipo (o usar una interfaz global)
  const { settings, medications, doseLogs } = data;

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Buenos días' : currentHour < 19 ? 'Buenas tardes' : 'Buenas noches';
  const name = settings.name || 'Evi';

  const progress = dayProgress(medications, doseLogs);
  const activeMeds = medications.filter((m: Medication) => m.active);

  const handleStartMeal = (mealType?: MealType) => {
    if (mealType) {
      router.push(`/meal/${mealType}`);
    } else {
      router.push('/meal');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header con saludo cálido */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingTitle}>
              {greeting}, {name} 🌷
            </Text>
            <Text style={styles.greetingSubtitle}>
              {progress.total > 0
                ? `${progress.complete} de ${progress.total} tomas realizadas hoy`
                : 'Todo en calma hoy'}
            </Text>
          </View>
        </View>

        {/* Botón grande: "🍽️ Estoy por comer" */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => handleStartMeal()}
          style={[styles.bigActionCard, shadow.md]}
        >
          <View style={styles.bigActionContent}>
            <Text style={styles.bigActionEmoji}>🍽️</Text>
            <View style={styles.bigActionTextWrapper}>
              <Text style={styles.bigActionTitle}>Estoy por comer</Text>
              <Text style={styles.bigActionSubtitle}>
                Toca aquí para ver tus tomas y registrarlas 💗
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Resumen de comidas del día */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Tus comidas de hoy</Text>

          {mealTypes.map((meal) => {
            const medsForThisMeal = activeMeds.filter((m: Medication) =>
              m.mealTypes.includes(meal)
            );
            const pendingDoses = dosesForMeal(medications, doseLogs, meal);
            const allTaken = medsForThisMeal.length > 0 && pendingDoses.length === 0;
            const hasMeds = medsForThisMeal.length > 0;

            return (
              <TouchableOpacity
                key={meal}
                activeOpacity={0.75}
                onPress={() => handleStartMeal(meal)}
              >
                <EviCard
                  variant={
                    allTaken
                      ? 'lavender'
                      : hasMeds && pendingDoses.length > 0
                      ? 'blush'
                      : 'white'
                  }
                  style={styles.mealCard}
                >
                  <View style={styles.mealCardHeader}>
                    <View style={styles.mealTitleRow}>
                      <Text style={styles.mealEmoji}>{mealMeta[meal].emoji}</Text>
                      <View>
                        <Text style={styles.mealLabel}>{mealMeta[meal].label}</Text>
                        <Text style={styles.mealTimeHint}>
                          Ref: {settings.referenceTimes[meal] || '--:--'}
                        </Text>
                      </View>
                    </View>

                    {hasMeds ? (
                      <PillBadge
                        status={allTaken ? 'taken' : 'pending'}
                        customLabel={
                          allTaken
                            ? 'Al día ✨'
                            : `${pendingDoses.length} ${pendingDoses.length === 1 ? 'toma' : 'tomas'}`
                        }
                      />
                    ) : (
                      <Text style={styles.noMedsText}>Sin tomas</Text>
                    )}
                  </View>

                  {/* Lista de medicamentos activos para esta comida */}
                  {medsForThisMeal.length > 0 && (
                    <View style={styles.medsList}>
                      {medsForThisMeal.map((med: Medication) => {
                        const taken = isMedicationTakenToday(doseLogs, med.id, meal);
                        return (
                          <View key={med.id} style={styles.medItemRow}>
                            <Text style={[styles.medDot, taken && styles.medDotTaken]}>
                              {taken ? '✓' : '•'}
                            </Text>
                            <Text
                              style={[
                                styles.medName,
                                taken && styles.medNameTaken,
                              ]}
                            >
                              {med.name}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </EviCard>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Nota de ánimo */}
        <EviCard variant="cream" style={styles.gentleNoteCard}>
          <Text style={styles.gentleNoteText}>
            🌿 Recuerda: EVI no juzga ni presiona. Cada registro es un paso de amor propio y cuidado.
          </Text>
        </EviCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  scroll: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.lg,
  },
  greetingTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.plum,
    letterSpacing: -0.3,
  },
  greetingSubtitle: {
    fontSize: fontSize.md,
    color: colors.muted,
    marginTop: spacing.xs,
  },
  bigActionCard: {
    backgroundColor: colors.rose,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  bigActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  bigActionEmoji: {
    fontSize: 36,
  },
  bigActionTextWrapper: {
    flex: 1,
  },
  bigActionTitle: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.2,
  },
  bigActionSubtitle: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.92)',
    marginTop: 2,
  },
  summarySection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.plum,
    marginBottom: spacing.md,
  },
  mealCard: {
    marginBottom: spacing.md,
  },
  mealCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  mealEmoji: {
    fontSize: fontSize.xxl,
  },
  mealLabel: {
    fontSize: fontSize.md + 2,
    fontWeight: '700',
    color: colors.plum,
  },
  mealTimeHint: {
    fontSize: fontSize.xs,
    color: colors.muted,
    marginTop: 1,
  },
  noMedsText: {
    fontSize: fontSize.xs,
    color: colors.muted,
    fontStyle: 'italic',
  },
  medsList: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    gap: 4,
  },
  medItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  medDot: {
    fontSize: fontSize.sm,
    color: colors.roseDark,
    fontWeight: '800',
  },
  medDotTaken: {
    color: colors.success,
  },
  medName: {
    fontSize: fontSize.sm,
    color: colors.plum,
  },
  medNameTaken: {
    color: colors.muted,
    textDecorationLine: 'line-through',
  },
  gentleNoteCard: {
    marginTop: spacing.sm,
    borderColor: 'transparent',
    backgroundColor: '#F7F3EE',
  },
  gentleNoteText: {
    fontSize: fontSize.xs + 1,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
});