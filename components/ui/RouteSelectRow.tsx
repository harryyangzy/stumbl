import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/lib/theme';

type Props = {
  routeShortName: string;
  label: string;
  selected: boolean;
  onPress: () => void;
};

export function RouteSelectRow({ routeShortName, label, selected, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}>
      <View style={styles.pill}>
        <Text style={styles.pillText}>{routeShortName}</Text>
      </View>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
      <View style={[styles.radioOuter, selected && styles.radioOuterOn]}>
        {selected ? <View style={styles.radioInner} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.white,
    borderRadius: theme.radiusMd,
    paddingVertical: 14,
    paddingHorizontal: theme.spaceMd,
    marginBottom: theme.spaceSm,
    gap: 12,
  },
  pressed: {
    opacity: 0.92,
  },
  pill: {
    backgroundColor: theme.routePillBg,
    borderRadius: theme.radiusSm,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 48,
    alignItems: 'center',
  },
  pillText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.routePillText,
  },
  label: {
    flex: 1,
    fontSize: theme.body,
    color: theme.textPrimary,
    fontWeight: '500',
  },
  radioOuter: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: theme.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterOn: {
    borderColor: theme.brandGreen,
  },
  radioInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: theme.brandGreen,
  },
});
