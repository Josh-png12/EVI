import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOnboarding } from '../../src/context/onboarding-context';
import { MealType, mealMeta, mealTypes } from '../../src/types';
import { colors, fontSize, radius, spacing } from '../../src/theme';
import { ConfirmButton } from '../../src/components/ConfirmButton';
import { EviCard } from '../../src/components/EviCard';

export default function StepTimesScreen() {
  const router = useRouter();
  const { draft, setReferenceTime } = useOnboarding();

  const [times, setTimes] = useState<Record<MealType, string>>({
    breakfast: draft.referenceTimes.breakfast || '08:15',
    lunch: draft.referenceTimes.lunch || '13:00',
    dinner: draft.referenceTimes.dinner || '19:30',
  });

  const handleChangeTime = (meal: MealType, val: string) => {
    setTimes((prev) => ({ ...prev, [meal]: val }));
    setReferenceTime(meal, val);
  };

  const handleContinue = () => {
    router.push('/onboarding/step-permissions');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.stepIndicator}>Paso 3 de 4</Text>
          <Text style={styles.title}>Horarios habituales ⏰</Text>
          <Text style={styles.subtitle}>
            Tus comidas no tienen que ser exactas. Estos horarios son una referencia aproximada para que EVI pueda enviarte recordatorios suaves.
          </Text>

          {mealTypes.map((meal) => (
            <EviCard key={meal} variant="white" style={styles.timeCard}>
              <View style={styles.timeRow}>
                <View style={styles.mealInfo}>
                  <Text style={styles.mealEmoji}>{mealMeta[meal].emoji}</Text>
                  <View>
                    <Text style={styles.mealLabel}>{mealMeta[meal].label}</Text>
                    <Text style={styles.mealHint}>Hora aproximada</Text>
                  </View>
                </View>

                <TextInput
                  value={times[meal]}
                  onChangeText={(val) => handleChangeTime(meal, val)}
                  placeholder="HH:MM"
                  placeholderTextColor={colors.muted}
                  style={styles.timeInput}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
              </View>
            </EviCard>
          ))}

          <View style={styles.tipBox}>
            <Text style={styles.tipTitle}>💡 Recuerda</Text>
            <Text style={styles.tipText}>
              La acción principal en tu día a día siempre será presionar <Text style={styles.bold}>"Estoy por comer"</Text>. EVI irá conociendo tus horarios habituales, pero tú tienes el control.
            </Text>
          </View>
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
  timeCard: {
    marginBottom: spacing.md,
    paddingVertical: spacing.md,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  mealEmoji: {
    fontSize: fontSize.xxl,
  },
  mealLabel: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.plum,
  },
  mealHint: {
    fontSize: fontSize.xs,
    color: colors.muted,
  },
  timeInput: {
    backgroundColor: colors.blush,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.plum,
    textAlign: 'center',
    width: 90,
  },
  tipBox: {
    backgroundColor: colors.lavender,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  tipTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.lavenderDark,
    marginBottom: spacing.xs,
  },
  tipText: {
    fontSize: fontSize.sm,
    color: colors.plum,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '700',
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.cream,
  },
});
