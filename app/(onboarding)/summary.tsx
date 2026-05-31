import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackLink } from '@/components/ui/BackLink';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { WidgetPreviewCard } from '@/components/ui/WidgetPreviewCard';
import { loadStumblWidget } from '@/lib/stumblWidgetLoader';
import { buildGoogleMapsCoordinateUrl } from '@/services/maps/googleMaps';
import { computeCountdownState } from '@/services/countdown/countdownService';
import { getStaticGtfsService } from '@/services/gtfs/staticGtfsService';
import { realtimeGtfsService } from '@/services/realtime/realtimeGtfsService';
import {
  countdownToWidgetProps,
  widgetPlaceholderProps,
  type WidgetDisplayProps,
} from '@/services/widget/widgetViewModel';
import { theme } from '@/lib/theme';
import type { OnboardingDraft } from '@/store/commuteStore';
import type { SavedCommute } from '@/types/commute';
import { useCommuteStore } from '@/store/commuteStore';

function draftToSaved(d: OnboardingDraft): SavedCommute | null {
  if (
    !d.stopId ||
    !d.stopName ||
    d.stopLat === undefined ||
    d.stopLon === undefined ||
    !d.routeId ||
    !d.routeShortName ||
    d.walkingMinutes === undefined ||
    d.bufferMinutes === undefined
  ) {
    return null;
  }
  return {
    stopId: d.stopId,
    stopName: d.stopName,
    stopLat: d.stopLat,
    stopLon: d.stopLon,
    routeId: d.routeId,
    routeShortName: d.routeShortName,
    headsign: d.headsign ?? null,
    walkingMinutes: d.walkingMinutes,
    bufferMinutes: d.bufferMinutes,
  };
}

const emptyPreview: WidgetDisplayProps = widgetPlaceholderProps;
const finalPreviewDelayMs = 500;

export default function SummaryScreen() {
  const router = useRouter();
  const draft = useCommuteStore((s) => s.draft);
  const saveCommute = useCommuteStore((s) => s.saveCommute);

  const [preview, setPreview] = useState<WidgetDisplayProps>(emptyPreview);

  useEffect(() => {
    const c = draftToSaved(draft);
    if (!c) return;
    let alive = true;
    (async () => {
      const now = new Date();
      try {
        const staticGtfs = await getStaticGtfsService();
        const realtime = await realtimeGtfsService.fetchTripUpdatesForCommute(c, now);
        const predictions = realtimeGtfsService.filterForCommute(realtime, c, now.getTime());
        const nextScheduled = staticGtfs.getScheduledArrivalsAfter(
          c.stopId,
          c.routeId,
          now,
          8
        );
        const mapsUrl = buildGoogleMapsCoordinateUrl(c.stopLat, c.stopLon);
        const state = computeCountdownState({
          commute: c,
          now,
          realtime,
          predictions,
          nextScheduled,
          mapsUrl,
        });
        if (alive) setPreview(countdownToWidgetProps(state));
      } catch {
        if (alive) setPreview(emptyPreview);
      }
    })();
    return () => {
      alive = false;
    };
  }, [draft]);

  const saved = draftToSaved(draft);

  const onAddToHome = async () => {
    if (!saved) return;
    saveCommute(saved);

    const widget = await loadStumblWidget();
    widget?.updateSnapshot(preview);

    Alert.alert(
      'Add the widget',
      'On your Home Screen, touch and hold an empty area, tap + in the corner, then search for Stumbl.',
      [
        {
          text: 'OK',
          onPress: () => {
            setTimeout(() => router.replace('/(main)'), finalPreviewDelayMs);
          },
        },
      ]
    );
  };

  if (!saved) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.missOuter}>
          <View style={styles.backSlot}>
            <BackLink />
          </View>
          <View style={styles.missWrap}>
            <Text style={styles.miss}>Finish the earlier steps first.</Text>
            <PrimaryButton title="Back to stops" onPress={() => router.replace('/(onboarding)/stop')} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.main}>
        <View style={styles.backSlot}>
          <BackLink />
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>See how long until you need to leave at a glance.</Text>
          <WidgetPreviewCard model={preview} />
        </View>
        <View style={styles.actions}>
          <PrimaryButton title="Add to Home" variant="ctaGreen" style={styles.addButton} onPress={onAddToHome} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.screenBg },
  main: { flex: 1, minHeight: 0 },
  backSlot: {
    position: 'absolute',
    top: 20,
    left: 26,
    zIndex: 10,
  },
  content: {
    position: 'absolute',
    top: 180,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 25,
  },
  title: {
    fontFamily: theme.fonts.heading,
    fontSize: 18,
    color: theme.black,
    lineHeight: 22,
    textAlign: 'center',
    width: 213,
  },
  actions: {
    position: 'absolute',
    top: 488,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  addButton: {
    width: 240,
    minHeight: 40,
    paddingVertical: 8,
  },
  missOuter: { flex: 1 },
  missWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spaceLg,
    paddingHorizontal: theme.screenEdge,
    gap: theme.spaceMd,
  },
  miss: {
    fontFamily: theme.fonts.body,
    fontSize: theme.body,
    textAlign: 'center',
  },
});
