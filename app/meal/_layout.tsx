import React from 'react';
import { Stack } from 'expo-router';
import { colors } from '../../src/theme';

export default function MealLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.cream },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[type]" />
    </Stack>
  );
}
