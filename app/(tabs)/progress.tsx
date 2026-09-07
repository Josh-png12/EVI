import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEvi } from '../../src/hooks/use-evi';
import { weeklyProgress } from '../../src/domain/routine';
import { mealMeta, mealTypes } from '../../src/types';
import { colors, fontSize, radius, spacing } from '../../src/theme';
import { EviCard } from '../../src/components/EviCard';

export default function ProgressScreen() {
  const { data } = useEvi();
  const { medications, doseLogs } = data;

  const stats = weeklyProgress(medications, doseLogs);
  const percentage = stats.total > 0 ? Math.round((stats.taken / stats.total) * 100) : 100;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Progreso ✨</Text>
          <Text style={styles.subtitle}>Un vistazo cariñoso a tu constancia semanal</Text>
        </View>

        {/* Big Weekly Progress Card */}
        <EviCard variant="blush" style={styles.mainCard}>
          <Text style={styles.weekLabel}>Esta semana</Text>
          <View style={styles.percentageRow}>
            <Text style={styles.percentageText}>{percentage}%</Text>
            <Text style={styles.fractionText}>
              {stats.taken} / {stats.total} tomas
            </Text>
          </View>

          {/* Progress bar */}
          <View style={styles.progressBarBackground}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(100, Math.max(0, percentage))}%` },
              ]}
            />
          </View>
        </EviCard>

        {/* Breakdown by meal */}
        <Text style={styles.sectionTitle}>Desglose por comida</Text>
        {mealTypes.map((meal) => {
          const mealStat = stats.byMeal[meal];
          const mealPct =
            mealStat.total > 0 ? Math.round((mealStat.taken / mealStat.total) * 100) : 100;

          return (
            <EviCard key={meal} variant="white" style={styles.mealStatCard}>
              <View style={styles.mealStatHeader}>
                <View style={styles.mealTitleRow}>
                  <Text style={styles.mealEmoji}>{mealMeta[meal].emoji}</Text>
                  <Text style={styles.mealLabel}>{mealMeta[meal].label}</Text>
                </View>

                <Text style={styles.mealScore}>
                  {mealStat.taken} de {mealStat.total} ({mealPct}%)
                </Text>
              </View>

              <View style={styles.mealBarBg}>
                <View
                  style={[
                    styles.mealBarFill,
                    { width: `${Math.min(100, Math.max(0, mealPct))}%` },
                  ]}
                />
              </View>
            </EviCard>
          );
        })}

        {/* Non-judgmental philosophy card */}
        <EviCard variant="lavender" style={styles.philosophyCard}>
          <Text style={styles.philosophyTitle}>🌸 Sin presiones</Text>
          <Text style={styles.philosophyText}>
            EVI no busca rachas perfectas ni te regaña si olvidas registrar una toma. Tu salud se construye día a día con amabilidad.
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
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.plum,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.muted,
    marginTop: 2,
  },
  mainCard: {
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  weekLabel: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.roseDark,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  percentageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginVertical: spacing.sm,
  },
  percentageText: {
    fontSize: fontSize.huge,
    fontWeight: '800',
    color: colors.plum,
  },
  fractionText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.muted,
  },
  progressBarBackground: {
    height: 10,
    backgroundColor: 'rgba(232, 145, 165, 0.25)',
    borderRadius: radius.full,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.rose,
    borderRadius: radius.full,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.plum,
    marginBottom: spacing.md,
  },
  mealStatCard: {
    marginBottom: spacing.md,
  },
  mealStatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  mealTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  mealEmoji: {
    fontSize: fontSize.xl,
  },
  mealLabel: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.plum,
  },
  mealScore: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.roseDark,
  },
  mealBarBg: {
    height: 6,
    backgroundColor: colors.blush,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  mealBarFill: {
    height: '100%',
    backgroundColor: colors.lavenderDark,
    borderRadius: radius.full,
  },
  philosophyCard: {
    marginTop: spacing.md,
    padding: spacing.md + 2,
  },
  philosophyTitle: {
    fontSize: fontSize.sm + 1,
    fontWeight: '700',
    color: colors.lavenderDark,
    marginBottom: spacing.xs,
  },
  philosophyText: {
    fontSize: fontSize.sm,
    color: colors.plum,
    lineHeight: 20,
  },
});
