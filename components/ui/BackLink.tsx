import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BackIcon } from '@/components/icons/BackIcon';
import { theme } from '@/lib/theme';

type Props = {
  label?: string;
  onPress?: () => void;
};

export function BackLink({ label = 'Back', onPress }: Props) {
  const router = useRouter();
  const text = label.replace(/^<\s*/, '');

  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={14}
      onPress={onPress ?? (() => router.back())}
      style={({ pressed }) => [styles.hit, pressed && styles.pressed]}>
      <View style={styles.row}>
        <View style={styles.iconSlot}>
          <BackIcon color={theme.brandGreen} />
        </View>
        <Text numberOfLines={1} style={styles.text}>
          {text}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    marginBottom: theme.spaceSm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 16,
  },
  iconSlot: {
    width: 7,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  text: {
    fontFamily: theme.fonts.heading,
    fontSize: 16,
    lineHeight: 16,
    color: theme.brandGreen,
    includeFontPadding: false,
    flexShrink: 0,
  },
});
