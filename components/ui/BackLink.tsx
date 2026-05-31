import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { BackIcon } from '@/components/icons/BackIcon';
import { theme } from '@/lib/theme';

type Props = {
  label?: string;
  onPress?: () => void;
};

export function BackLink({ label = '< Back', onPress }: Props) {
  const router = useRouter();
  const text = label.replace(/^<\s*/, '');

  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={14}
      onPress={onPress ?? (() => router.back())}
      style={({ pressed }) => [styles.hit, pressed && styles.pressed]}>
      <BackIcon color={theme.brandGreen} />
      <Text style={styles.text}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    marginBottom: theme.spaceSm,
  },
  pressed: { opacity: 0.7 },
  text: {
    fontFamily: theme.fonts.body,
    fontSize: theme.body,
    color: theme.brandGreen,
  },
});
