import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { colors, fontSize, radius, shadow, spacing } from '../theme';

interface ConfirmButtonProps extends TouchableOpacityProps {
  title: string;
  icon?: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'accent' | 'success';
}

export const ConfirmButton: React.FC<ConfirmButtonProps> = ({
  title,
  icon,
  loading = false,
  variant = 'primary',
  disabled,
  style,
  ...props
}) => {
  const bgColors = {
    primary: colors.rose,
    secondary: colors.lavender,
    accent: colors.roseDark,
    success: colors.success,
  };

  const textColors = {
    primary: colors.white,
    secondary: colors.lavenderDark,
    accent: colors.white,
    success: colors.white,
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={disabled || loading}
      style={[
        styles.button,
        { backgroundColor: bgColors[variant] },
        shadow.sm,
        disabled && styles.disabled,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} size="small" />
      ) : (
        <Text style={[styles.text, { color: textColors[variant] }]}>
          {title} {icon ? `${icon}` : ''}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
