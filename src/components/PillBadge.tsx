import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DoseStatus } from '../types';
import { colors, fontSize, radius, spacing } from '../theme';

interface PillBadgeProps {
  status: DoseStatus;
  customLabel?: string;
}

export const PillBadge: React.FC<PillBadgeProps> = ({ status, customLabel }) => {
  const config = {
    taken: {
      bg: '#EEF3EC',
      color: colors.success,
      text: customLabel || 'Tomada ✨',
    },
    pending: {
      bg: colors.blush,
      color: colors.roseDark,
      text: customLabel || 'Pendiente ⏳',
    },
    snoozed: {
      bg: colors.lavender,
      color: colors.lavenderDark,
      text: customLabel || 'Pospuesta ⏰',
    },
    unrecorded: {
      bg: '#F1EFEC',
      color: colors.muted,
      text: customLabel || 'Sin registro',
    },
  }[status];

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.color }]}>{config.text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
});
