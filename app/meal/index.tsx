import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEvi } from '../../src/hooks/use-evi';
import { MealType, mealMeta, mealTypes } from '../../src/types';
import { dosesForMeal } from '../../src/domain/routine';
import { colors, fontSize, radius, shadow, spacing } from '../../src/theme';
import { GhostButton } from '../../src/components/GhostButton';

export default function MealIndexScreen() {
  const router = useRouter();
  const { data } = useEvi();
  const { medications, doseLogs } = data;

  const handleSelectMeal = (meal: MealType) => {
    router.replace(`/meal/${meal}`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.emojiHero}>🍽️</Text>
          <Text style={styles.title}>¿Qué vas a comer?</Text>
          <Text style={styles.subtitle}>
            Selecciona el momento del día para revisar tus tomas correspondientes.
          </Text>
        </View>

        <View style={styles.optionsContainer}>
          {mealTypes.map((meal) => {
            const pending = dosesForMeal(medications, doseLogs, meal);
            return (
              <TouchableOpacity
                key={meal}
                activeOpacity={0.85}
                onPress={() => handleSelectMeal(meal)}
                style={[styles.mealButton, shadow.sm]}
              >
                <Text style={styles.mealEmoji}>{mealMeta[meal].emoji}</Text>
                <View style={styles.mealTextWrapper}>
                  <Text style={styles.mealName}>{mealMeta[meal].label}</Text>
                  <Text style={styles.mealPendingHint}>
                    {pending.length === 0
                      ? 'Sin tomas pendientes ✨'
                      : `${pending.length} ${pending.length === 1 ? 'medicamento pendiente' : 'medicamentos pendientes'}`}
                  </Text>
                </View>
                <Text style={styles.arrowIcon}>›</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <GhostButton
          title="Cerrar"
          color={colors.muted}
          onPress={() => router.back()}
          style={styles.closeBtn}
        />
      </View>
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
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  emojiHero: {
    fontSize: 48,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.plum,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    lineHeight: 22,
  },
  optionsContainer: {
    gap: spacing.md,
    marginVertical: spacing.xl,
  },
  mealButton: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  mealEmoji: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  mealTextWrapper: {
    flex: 1,
  },
  mealName: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.plum,
  },
  mealPendingHint: {
    fontSize: fontSize.xs + 1,
    color: colors.roseDark,
    marginTop: 2,
    fontWeight: '500',
  },
  arrowIcon: {
    fontSize: 28,
    color: colors.muted,
    fontWeight: '300',
  },
  closeBtn: {
    marginBottom: spacing.sm,
  },
});
