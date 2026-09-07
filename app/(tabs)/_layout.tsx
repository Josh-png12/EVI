import React from 'react';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors, fontSize } from '../../src/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.line,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.roseDark,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: {
          fontSize: fontSize.xs,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Hoy',
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <Text style={{ fontSize: 20 }}>{focused ? '🌸' : '🌱'}</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Historial',
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <Text style={{ fontSize: 20 }}>{focused ? '📖' : '📑'}</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progreso',
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <Text style={{ fontSize: 20 }}>{focused ? '✨' : '📊'}</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <Text style={{ fontSize: 20 }}>{focused ? '⚙️' : '🌸'}</Text>
          ),
        }}
      />
    </Tabs>
  );
}
