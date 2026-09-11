import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOnboarding } from '../../src/context/onboarding-context';
import { useEvi } from '../../src/hooks/use-evi';
import { requestNotificationPermissions, scheduleAllNotifications } from '../../src/services/notifications/notification-service';
import { colors, fontSize, radius, spacing } from '../../src/theme';
import { ConfirmButton } from '../../src/components/ConfirmButton';
import { GhostButton } from '../../src/components/GhostButton';
import { EviCard } from '../../src/components/EviCard';
import { EviLogo } from '../../src/components/EviLogo';

export default function StepPermissionsScreen() {
  const router = useRouter();
  const { draft, resetDraft } = useOnboarding();
  const { completeOnboarding } = useEvi();
  const [loading, setLoading] = useState(false);

  const handleFinish = async (requestPerm: boolean) => {
    setLoading(true);
    try {
      if (requestPerm) {
        await requestNotificationPermissions();
      }

      await completeOnboarding(
        draft.name || 'Evi',
        draft.medications,
        draft.referenceTimes
      );

      resetDraft();
      router.replace('/(tabs)/home');
    } catch (err) {
      console.error('Error completing onboarding:', err);
      Alert.alert(
        'No pudimos guardar tu configuración',
        'Tus datos no se guardaron. Revisa el almacenamiento disponible e inténtalo nuevamente.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.stepIndicator}>Paso 4 de 4</Text>
          <View style={styles.logoRow}>
            <EviLogo size="lg" />
          </View>
          <Text style={styles.title}>Notificaciones locales 🔔</Text>
          <Text style={styles.subtitle}>
            EVI funciona de forma 100% privada en tu teléfono. No enviamos tus datos a ningún servidor ni a internet.
          </Text>

          <EviCard variant="lavender" style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>✨ ¿Cómo te recordará EVI?</Text>
            <Text style={styles.benefitItem}>• Avisos suaves cerca de tus horas de comida.</Text>
            <Text style={styles.benefitItem}>• Opción de posponer si estás ocupada.</Text>
            <Text style={styles.benefitItem}>• Sin culpa, sin presiones y sin alarmas estridentes.</Text>
          </EviCard>
        </View>

        <View style={styles.footer}>
          <ConfirmButton
            title="Activar recordatorios"
            icon="💗"
            loading={loading}
            onPress={() => handleFinish(true)}
          />
          <GhostButton
            title="Ahora no, continuar"
            color={colors.muted}
            onPress={() => handleFinish(false)}
            disabled={loading}
            style={styles.skipBtn}
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
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  content: {
    marginTop: spacing.sm,
  },
  stepIndicator: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.roseDark,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  logoRow: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  title: {
    fontSize: fontSize.xl + 2,
    fontWeight: '700',
    color: colors.plum,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 22,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.lg,
  },
  benefitCard: {
    padding: spacing.md + 2,
  },
  benefitTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.lavenderDark,
    marginBottom: spacing.sm,
  },
  benefitItem: {
    fontSize: fontSize.sm + 1,
    color: colors.plum,
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  footer: {
    marginBottom: spacing.md,
  },
  skipBtn: {
    marginTop: spacing.xs,
  },
});
