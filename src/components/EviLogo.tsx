import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius, spacing } from '../theme';

interface EviLogoProps {
  size?: 'sm' | 'md' | 'lg';
}

export const EviLogo: React.FC<EviLogoProps> = ({ size = 'md' }) => {
  const sizes = {
    sm: { box: 36, font: fontSize.md },
    md: { box: 54, font: fontSize.xl },
    lg: { box: 76, font: fontSize.xxl },
  }[size];

  return (
    <View
      style={[
        styles.badge,
        {
          width: sizes.box,
          height: sizes.box,
          borderRadius: radius.full,
        },
      ]}
    >
      <Text style={[styles.emojis, { fontSize: sizes.font }]}>🌸🌙</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.blush,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  emojis: {
    textAlign: 'center',
  },
});
