import { useCallback, useEffect, useRef } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { theme } from '@/lib/theme';

const TICK = 10;
const VISIBLE = Math.min(Dimensions.get('window').width - 48, 340);

type Props = {
  min: number;
  max: number;
  value: number;
  onChange: (n: number) => void;
  unitSingular: string;
  unitPlural: string;
};

export function TimeRulerPicker({
  min,
  max,
  value,
  onChange,
  unitSingular,
  unitPlural,
}: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const range = max - min + 1;
  const sidePad = VISIBLE / 2 - TICK / 2;

  const snapTo = useCallback(
    (x: number) => {
      const idx = Math.round(x / TICK);
      const clamped = Math.min(max, Math.max(min, min + idx));
      return clamped;
    },
    [max, min]
  );

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const next = snapTo(x);
    onChange(next);
    scrollRef.current?.scrollTo({ x: (next - min) * TICK, animated: true });
  };

  useEffect(() => {
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ x: (value - min) * TICK, animated: false });
    }, 50);
    return () => clearTimeout(t);
  }, [min, value]);

  const unit = value === 1 ? unitSingular : unitPlural;

  return (
    <View style={styles.wrap}>
      <View style={styles.window}>
        <View style={styles.centerBar} pointerEvents="none" />
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={TICK}
          decelerationRate="fast"
          contentContainerStyle={{
            paddingHorizontal: sidePad,
            paddingVertical: 20,
          }}
          onMomentumScrollEnd={onScrollEnd}
          onScrollEndDrag={onScrollEnd}>
          {Array.from({ length: range }, (_, i) => {
            const n = min + i;
            const major = n % 5 === 0;
            return (
              <View key={n} style={styles.tickCol}>
                <View style={[styles.tick, major ? styles.tickMajor : styles.tickMinor]} />
              </View>
            );
          })}
        </ScrollView>
      </View>
      <View style={styles.capsule}>
        <Text style={styles.capsuleText}>{value}</Text>
      </View>
      <Text style={styles.unit}>{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginVertical: theme.spaceMd,
  },
  window: {
    width: VISIBLE,
    height: 120,
    position: 'relative',
  },
  centerBar: {
    position: 'absolute',
    left: VISIBLE / 2 - 1,
    top: 8,
    bottom: 32,
    width: 3,
    borderRadius: 2,
    backgroundColor: theme.brandGreen,
    zIndex: 2,
  },
  tickCol: {
    width: TICK,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 72,
  },
  tick: {
    width: 2,
    borderRadius: 1,
    backgroundColor: theme.borderSubtle,
  },
  tickMinor: {
    height: 12,
  },
  tickMajor: {
    height: 22,
    backgroundColor: theme.textSecondary,
  },
  capsule: {
    marginTop: -8,
    backgroundColor: theme.white,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: theme.radiusPill,
    borderWidth: 2,
    borderColor: theme.brandGreen,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  capsuleText: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  unit: {
    marginTop: theme.spaceSm,
    fontSize: theme.subtitle,
    color: theme.textSecondary,
    fontWeight: '500',
  },
});
