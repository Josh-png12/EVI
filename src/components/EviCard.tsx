import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { colors, radius, shadow, spacing } from '../theme';

interface EviCardProps extends ViewProps {
  variant?: 'blush' | 'white' | 'lavender' | 'cream';
  elevated?: boolean;
}

export const EviCard: React.FC<EviCardProps> = ({
  children,
  variant = 'blush',
  elevated = true,
  style,
  ...props
}) => {
  const bgColors = {
    blush: colors.blush,
    white: colors.white,
    lavender: colors.lavender,
    cream: colors.cream,
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: bgColors[variant] },
        elevated && shadow.sm,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
});
