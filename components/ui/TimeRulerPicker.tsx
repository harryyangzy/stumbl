import { useCallback, useEffect, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { theme } from '@/lib/theme';

/** Wider columns = more space between time tick labels. */
const ITEM_W = 72;
/** Fits ~28pt selected time in the fixed lens. */
const TRACK_H = 56;
const STEP_SEC_DEFAULT = 20;

function formatTimeMmSs(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Distance from center index → size / opacity for scrolling ticks (lens is 28 @ 100%). */
function tierForDistance(d: number): { fontSize: number; opacity: number } {
  if (d <= 0) return { fontSize: 22, opacity: 0 };
  if (d === 1) return { fontSize: 22, opacity: 0.6 };
  if (d === 2) return { fontSize: 20, opacity: 0.4 };
  return { fontSize: 18, opacity: 0.4 };
}

type Props = {
  minSec: number;
  maxSec: number;
  stepSec?: number;
  valueSec: number;
  onChangeSec: (sec: number) => void;
  unitSingular: string;
  unitPlural: string;
};

export function TimeRulerPicker({
  minSec,
  maxSec,
  stepSec = STEP_SEC_DEFAULT,
  valueSec,
  onChangeSec,
  unitSingular,
  unitPlural,
}: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const { width: windowWidth } = useWindowDimensions();
  /** Matches screen horizontal inset so the track runs edge-to-edge. */
  const edgeBleed = theme.screenEdge;
  const sidePad = Math.max(0, (windowWidth - ITEM_W) / 2);
  const count = Math.floor((maxSec - minSec) / stepSec) + 1;

  const [centeredSec, setCenteredSec] = useState(valueSec);

  useEffect(() => {
    setCenteredSec(valueSec);
  }, [valueSec]);

  const indexForSec = useCallback(
    (sec: number) => Math.round((sec - minSec) / stepSec),
    [minSec, stepSec]
  );

  const centerIdx = indexForSec(centeredSec);

  const secFromIndex = useCallback(
    (idx: number) => {
      const raw = minSec + idx * stepSec;
      return Math.min(maxSec, Math.max(minSec, raw));
    },
    [maxSec, minSec, stepSec]
  );

  const snapFromOffset = useCallback(
    (x: number) => {
      const idx = Math.round(x / ITEM_W);
      return secFromIndex(idx);
    },
    [secFromIndex]
  );

  const scrollToSec = useCallback(
    (sec: number, animated: boolean) => {
      const i = indexForSec(sec);
      scrollRef.current?.scrollTo({ x: i * ITEM_W, animated });
    },
    [indexForSec]
  );

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    setCenteredSec(snapFromOffset(x));
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const next = snapFromOffset(x);
    onChangeSec(next);
    setCenteredSec(next);
    scrollToSec(next, true);
  };

  useEffect(() => {
    const t = setTimeout(() => scrollToSec(valueSec, false), 48);
    return () => clearTimeout(t);
  }, [minSec, maxSec, scrollToSec, stepSec, valueSec]);

  const unit = centeredSec === 60 ? unitSingular : unitPlural;

  return (
    <View
      style={[
        styles.wrap,
        {
          width: windowWidth,
          marginHorizontal: -edgeBleed,
          alignSelf: 'center',
        },
      ]}>
      <View style={styles.trackShell}>
        <View style={styles.ruleLine} />
        <View style={styles.trackInner}>
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={ITEM_W}
            decelerationRate="fast"
            scrollEventThrottle={16}
            onScroll={onScroll}
            style={styles.scroll}
            contentContainerStyle={{
              paddingHorizontal: sidePad,
              alignItems: 'center',
            }}
            onMomentumScrollEnd={onScrollEnd}
            onScrollEndDrag={onScrollEnd}>
            {Array.from({ length: count }, (_, i) => {
              const sec = minSec + i * stepSec;
              const d = Math.abs(i - centerIdx);
              const tier = tierForDistance(d);
              return (
                <View key={sec} style={styles.cell}>
                  <Text
                    style={[
                      styles.cellTextBase,
                      {
                        fontSize: tier.fontSize,
                        opacity: tier.opacity,
                      },
                    ]}>
                    {formatTimeMmSs(sec)}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
          <View style={styles.lensSlot} pointerEvents="none">
            <View style={styles.lensYellow}>
              <Text style={styles.lensText} numberOfLines={1}>
                {formatTimeMmSs(centeredSec)}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.ruleLine} />
      </View>

      <Text style={styles.unit}>{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginVertical: 0,
  },
  trackShell: {
    alignSelf: 'stretch',
    backgroundColor: theme.white,
  },
  ruleLine: {
    height: 1,
    backgroundColor: theme.grey,
  },
  trackInner: {
    height: TRACK_H,
    position: 'relative',
    justifyContent: 'center',
    backgroundColor: theme.white,
  },
  scroll: {
    height: TRACK_H,
  },
  cell: {
    width: ITEM_W,
    height: TRACK_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellTextBase: {
    fontFamily: theme.fonts.heading,
    fontVariant: ['tabular-nums'],
    color: theme.black,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
  lensSlot: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lensYellow: {
    backgroundColor: theme.yellow,
    paddingVertical: 0,
    paddingHorizontal: 6,
    borderRadius: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lensText: {
    fontFamily: theme.fonts.heading,
    fontSize: 28,
    lineHeight: 32,
    fontVariant: ['tabular-nums'],
    color: theme.black,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
  unit: {
    marginTop: Math.max(0, theme.spaceMd - 10),
    fontFamily: theme.fonts.body,
    fontSize: theme.body,
    color: theme.black,
  },
});
