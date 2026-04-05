import { useCallback, useEffect, useRef, useState } from 'react';
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

const ITEM_W = 56;

function formatMinuteValue(n: number): string {
  return `${n}:00`;
}

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
  const width = Dimensions.get('window').width;
  const sidePad = Math.max(0, (width - ITEM_W) / 2);
  const count = max - min + 1;

  const [centered, setCentered] = useState(value);

  useEffect(() => {
    setCentered(value);
  }, [value]);

  const snapFromOffset = useCallback(
    (x: number) => {
      const idx = Math.round(x / ITEM_W);
      return Math.min(max, Math.max(min, min + idx));
    },
    [max, min]
  );

  const scrollToValue = useCallback(
    (v: number, animated: boolean) => {
      const i = v - min;
      scrollRef.current?.scrollTo({ x: i * ITEM_W, animated });
    },
    [min]
  );

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    setCentered(snapFromOffset(x));
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const next = snapFromOffset(x);
    onChange(next);
    setCentered(next);
    scrollToValue(next, true);
  };

  useEffect(() => {
    const t = setTimeout(() => scrollToValue(value, false), 48);
    return () => clearTimeout(t);
  }, [min, max, scrollToValue, value]);

  const unit = centered === 1 ? unitSingular : unitPlural;

  return (
    <View style={styles.wrap}>
      <View style={styles.trackShell}>
        <View style={styles.ruleLine} />
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={ITEM_W}
          decelerationRate="fast"
          scrollEventThrottle={16}
          onScroll={onScroll}
          contentContainerStyle={{
            paddingHorizontal: sidePad,
            paddingVertical: 18,
          }}
          onMomentumScrollEnd={onScrollEnd}
          onScrollEndDrag={onScrollEnd}>
          {Array.from({ length: count }, (_, i) => {
            const n = min + i;
            const active = n === centered;
            return (
              <View key={n} style={styles.cell}>
                <View style={[styles.capsule, active && styles.capsuleOn]}>
                  <Text style={[styles.cellText, active ? styles.cellTextOn : styles.cellTextOff]}>
                    {formatMinuteValue(n)}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
        <View style={styles.ruleLine} />
      </View>

      <Text style={styles.unit}>{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    alignSelf: 'stretch',
    marginVertical: theme.spaceMd,
  },
  trackShell: {
    alignSelf: 'stretch',
    backgroundColor: theme.white,
  },
  ruleLine: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.15)',
    marginHorizontal: theme.spaceLg,
  },
  cell: {
    width: ITEM_W,
    alignItems: 'center',
    justifyContent: 'center',
  },
  capsule: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: theme.radiusPill,
    minWidth: 52,
    alignItems: 'center',
  },
  capsuleOn: {
    backgroundColor: theme.yellow,
  },
  cellText: {
    fontFamily: theme.fonts.heading,
    fontSize: 17,
    fontVariant: ['tabular-nums'],
  },
  cellTextOn: {
    color: theme.black,
  },
  cellTextOff: {
    color: theme.grey,
  },
  unit: {
    marginTop: theme.spaceMd,
    fontFamily: theme.fonts.body,
    fontSize: theme.body,
    color: theme.black,
  },
});
