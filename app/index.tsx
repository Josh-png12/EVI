import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useEvi } from '../src/hooks/use-evi';
import { colors, fontSize, spacing } from '../src/theme';
import { EviLogo } from '../src/components/EviLogo';

export default function IndexScreen() {
  const { data, ready } = useEvi();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;

    if (!data.onboardingComplete) {
      router.replace('/onboarding/step-name');
    } else {
      router.replace('/(tabs)/home');
    }
  }, [ready, data.onboardingComplete]);

  return (
    <View style={styles.container}>
      <EviLogo size="lg" />
      <Text style={styles.title}>EVI</Text>
      <Text style={styles.subtitle}>Tu compañera de bienestar</Text>
      <ActivityIndicator color={colors.rose} style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.plum,
    marginTop: spacing.md,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.muted,
    marginTop: spacing.xs,
  },
  loader: {
    marginTop: spacing.xl,
  },
});
