import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { theme } from '@/lib/theme';

type Props = PressableProps & {
  title: string;
  variant?: 'primary' | 'secondary' | 'ctaYellow' | 'ctaGreen' | 'ctaOutline';
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({
  title,
  variant = 'primary',
  loading,
  disabled,
  style,
  ...rest
}: Props) {
  const inactive = !!(disabled || loading);
  const isYellow = variant === 'ctaYellow';
  const isCtaGreen = variant === 'ctaGreen';
  const isCtaOutline = variant === 'ctaOutline';
  const isPrimary = variant === 'primary';

  if (isYellow) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: inactive }}
        disabled={inactive}
        style={({ pressed }) => [
          styles.ctaHit,
          pressed && !inactive && styles.ctaHitPressed,
        ]}
        {...rest}>
        <View style={[styles.yellowPill, inactive && styles.pillEmpty, style]}>
          {loading ? (
            <ActivityIndicator color={theme.black} />
          ) : (
            <Text style={[styles.label, inactive ? styles.labelBlack : styles.labelYellow]}>{title}</Text>
          )}
        </View>
      </Pressable>
    );
  }

  if (isCtaGreen) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: inactive }}
        disabled={inactive}
        style={({ pressed }) => [
          styles.ctaHit,
          pressed && !inactive && styles.ctaHitPressed,
        ]}
        {...rest}>
        <View style={[styles.greenPill, inactive && styles.pillEmpty, style]}>
          {loading ? (
            <ActivityIndicator color={theme.black} />
          ) : (
            <Text style={[styles.label, inactive ? styles.labelBlack : styles.labelPrimary]}>{title}</Text>
          )}
        </View>
      </Pressable>
    );
  }

  if (isCtaOutline) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: inactive }}
        disabled={inactive}
        style={({ pressed }) => [
          styles.ctaHit,
          pressed && !inactive && styles.ctaHitPressed,
        ]}
        {...rest}>
        <View style={[styles.outlinePill, inactive && styles.pillEmpty, style]}>
          {loading ? (
            <ActivityIndicator color={theme.black} />
          ) : (
            <Text style={[styles.label, styles.labelBlack]}>{title}</Text>
          )}
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        variant === 'secondary' && styles.secondary,
        variant === 'secondary' && inactive && styles.secondaryInactive,
        style,
        isPrimary && !inactive && styles.primary,
        isPrimary && inactive && styles.primaryInactive,
        pressed && isPrimary && !inactive && styles.pressedPrimary,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={inactive ? theme.black : isPrimary ? theme.offWhite : theme.brandGreen} />
      ) : (
        <Text
          style={[
            styles.label,
            isPrimary && (inactive ? styles.labelBlack : styles.labelPrimary),
            variant === 'secondary' && (inactive ? styles.labelBlack : styles.labelSecondary),
          ]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ctaHit: {
    alignSelf: 'center',
  },
  ctaHitPressed: {
    opacity: 0.9,
  },
  /** Background lives on this inner view so iOS always paints the pill (Pressable fill can fail). */
  yellowPill: {
    backgroundColor: theme.yellow,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: theme.radiusPill,
    borderWidth: 1,
    borderColor: theme.black,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    overflow: 'hidden',
  },
  greenPill: {
    backgroundColor: theme.brandGreen,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: theme.radiusPill,
    borderWidth: 1,
    borderColor: theme.black,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    overflow: 'hidden',
  },
  outlinePill: {
    backgroundColor: 'transparent',
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: theme.radiusPill,
    borderWidth: 1,
    borderColor: theme.black,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    overflow: 'hidden',
  },
  pillEmpty: {
    backgroundColor: 'transparent',
  },
  base: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 30,
    borderRadius: theme.radiusPill,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  primary: {
    backgroundColor: theme.brandGreen,
  },
  primaryInactive: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.black,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.brandGreen,
  },
  secondaryInactive: {
    borderColor: theme.black,
  },
  pressedPrimary: {
    backgroundColor: theme.brandGreenPressed,
  },
  label: {
    fontFamily: theme.fonts.heading,
    fontSize: theme.button,
  },
  labelPrimary: {
    color: theme.offWhite,
  },
  labelYellow: {
    color: theme.black,
  },
  labelSecondary: {
    color: theme.brandGreen,
  },
  labelBlack: {
    color: theme.black,
  },
});
