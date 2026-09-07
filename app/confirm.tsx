import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEvi } from '../src/hooks/use-evi';
import { MealType, mealMeta } from '../src/types';
import { colors, fontSize, radius, spacing } from '../src/theme';
import { ConfirmButton } from '../src/components/ConfirmButton';
import { EviCard } from '../src/components/EviCard';
import { EviLogo } from '../src/components/EviLogo';

export default function ConfirmScreen() {
  const router = useRouter();
  const { mealType, medicationName } = useLocalSearchParams<{
    mealType?: string;
    medicationName?: string;
  }>();

  const { data } = useEvi();
  const name = data.settings.name || 'Evi';

  const type = (mealType as MealType) || 'lunch';
  const meta = mealMeta[type] || mealMeta.lunch;

  const now = new Date();
  const timeFormatted = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.logoRow}>
            <EviLogo size="lg" />
          </View>

          <Text style={styles.sparkleTitle}>✨ Ya quedó registrado</Text>

          <EviCard variant="lavender" style={styles.detailCard}>
            <Text style={styles.mealTimeLine}>
              {meta.emoji} {meta.label} · {timeFormatted}
            </Text>
            {medicationName && (
              <Text style={styles.medicationName}>💊 {medicationName}</Text>
            )}
          </EviCard>

          <Text style={styles.encouragementText}>Muy bien, {name} 💗</Text>
          <Text style={styles.gentleSubtext}>
            Un momento de cuidado cumplido. Que disfrutes mucho tu día.
          </Text>
        </View>

        <View style={styles.footer}>
          <ConfirmButton
            title="Volver a Inicio"
            icon="🌸"
            onPress={() => router.replace('/(tabs)/home')}
          />
        </View>
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
    padding: spacing.xl,
    justifyContent: 'space-between',
  },
  content: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  logoRow: {
    marginBottom: spacing.lg,
  },
  sparkleTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.plum,
    textAlign: 'center',
    letterSpacing: -0.2,
    marginBottom: spacing.lg,
  },
  detailCard: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xl,
  },
  mealTimeLine: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.lavenderDark,
  },
  medicationName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.plum,
    marginTop: spacing.xs,
  },
  encouragementText: {
    fontSize: fontSize.xl + 2,
    fontWeight: '700',
    color: colors.roseDark,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  gentleSubtext: {
    fontSize: fontSize.md,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.md,
  },
  footer: {
    marginBottom: spacing.md,
  },
});
