import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { theme } from '@/lib/theme';

type Props = {
  label?: string;
  onPress?: () => void;
};

export function BackLink({ label = '< Back', onPress }: Props) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={14}
      onPress={onPress ?? (() => router.back())}
      style={({ pressed }) => [styles.hit, pressed && styles.pressed]}>
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    alignSelf: 'flex-start',
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
