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
  variant?: 'primary' | 'secondary' | 'ctaYellow';
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
  const isYellow = variant === 'ctaYellow';
  const isPrimary = variant === 'primary';

  if (isYellow) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !!(disabled || loading) }}
        disabled={disabled || loading}
        style={({ pressed }) => [
          styles.yellowHit,
          (disabled || loading) && styles.disabled,
          pressed && styles.yellowHitPressed,
        ]}
        {...rest}>
        <View style={[styles.yellowPill, style]}>
          {loading ? (
            <ActivityIndicator color={theme.black} />
          ) : (
            <Text style={[styles.label, styles.labelYellow]}>{title}</Text>
          )}
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        variant === 'secondary' && styles.secondary,
        (disabled || loading) && styles.disabled,
        style,
        isPrimary && styles.primary,
        pressed && isPrimary && styles.pressedPrimary,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator
          color={isPrimary ? theme.offWhite : theme.brandGreen}
        />
      ) : (
        <Text
          style={[
            styles.label,
            isPrimary && styles.labelPrimary,
            variant === 'secondary' && styles.labelSecondary,
          ]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  yellowHit: {
    alignSelf: 'center',
  },
  yellowHitPressed: {
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
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.brandGreen,
  },
  pressedPrimary: {
    backgroundColor: theme.brandGreenPressed,
  },
  disabled: {
    opacity: 0.45,
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
});
