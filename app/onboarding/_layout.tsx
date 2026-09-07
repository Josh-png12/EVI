import React from 'react';
import { Stack } from 'expo-router';
import { OnboardingProvider } from '../../src/context/onboarding-context';
import { colors } from '../../src/theme';

export default function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.cream },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="step-name" />
        <Stack.Screen name="step-medications" />
        <Stack.Screen name="step-times" />
        <Stack.Screen name="step-permissions" />
      </Stack>
    </OnboardingProvider>
  );
}
