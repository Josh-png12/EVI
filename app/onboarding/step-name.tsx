import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOnboarding } from '../../src/context/onboarding-context';
import { colors, fontSize, radius, spacing } from '../../src/theme';
import { ConfirmButton } from '../../src/components/ConfirmButton';
import { EviLogo } from '../../src/components/EviLogo';

export default function StepNameScreen() {
  const router = useRouter();
  const { draft, setName } = useOnboarding();
  const [localName, setLocalName] = useState(draft.name || 'Eva Luna');

  const handleNext = () => {
    setName(localName.trim() || 'Evi');
    router.push('/onboarding/step-medications');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <EviLogo size="lg" />
          <Text style={styles.greeting}>Bienvenida a EVI 🌷</Text>
          <Text style={styles.description}>
            Estoy aquí para acompañarte y ayudarte a recordar tus medicamentos de forma tranquila y respetuosa.
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>¿Cómo te gustaría que te llame?</Text>
          <TextInput
            value={localName}
            onChangeText={setLocalName}
            placeholder="Ej. Eva Luna o Evi"
            placeholderTextColor={colors.muted}
            style={styles.input}
            autoFocus
            autoCapitalize="words"
          />
        </View>

        <View style={styles.footer}>
          <ConfirmButton
            title="Continuar"
            icon="🌸"
            onPress={handleNext}
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
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  greeting: {
    fontSize: fontSize.xl + 2,
    fontWeight: '700',
    color: colors.plum,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  description: {
    fontSize: fontSize.md,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
    paddingHorizontal: spacing.md,
  },
  form: {
    marginVertical: spacing.xl,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.plum,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.lg,
    color: colors.plum,
  },
  footer: {
    marginBottom: spacing.md,
  },
});
