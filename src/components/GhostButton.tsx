import React from 'react';
import { StyleSheet, Text, TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { colors, fontSize, radius, spacing } from '../theme';

interface GhostButtonProps extends TouchableOpacityProps {
  title: string;
  icon?: string;
  color?: string;
}

export const GhostButton: React.FC<GhostButtonProps> = ({
  title,
  icon,
  color = colors.plum,
  style,
  ...props
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[styles.button, style]}
      {...props}
    >
      <Text style={[styles.text, { color }]}>
        {icon ? `${icon} ` : ''}
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    backgroundColor: 'transparent',
  },
  text: {
    fontSize: fontSize.sm + 1,
    fontWeight: '600',
  },
});
