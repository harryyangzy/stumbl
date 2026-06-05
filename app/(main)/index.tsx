import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackLink } from '@/components/ui/BackLink';
import { WidgetPreviewCard } from '@/components/ui/WidgetPreviewCard';
import { theme } from '@/lib/theme';
import { buildGoogleMapsCoordinateUrl } from '@/services/maps/googleMaps';
import { computeCountdownState } from '@/services/countdown/countdownService';
import { getStaticGtfsService } from '@/services/gtfs/staticGtfsService';
import { realtimeGtfsService } from '@/services/realtime/realtimeGtfsService';
import {
  countdownToWidgetProps,
  widgetPlaceholderProps,
  type WidgetDisplayProps,
} from '@/services/widget/widgetViewModel';
import { useCommuteStore } from '@/store/commuteStore';

const emptyPreview: WidgetDisplayProps = widgetPlaceholderProps;

function formatDurationClock(minutes: number) {
  const seconds = Math.max(0, Math.round(minutes * 60));
  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
  return `${mm}:${String(ss).padStart(2, '0')}`;
}

export default function MainScreen() {
  const router = useRouter();
  const commute = useCommuteStore((s) => s.savedCommute);
  const beginEditSetup = useCommuteStore((s) => s.beginEditSetup);
  const [preview, setPreview] = useState<WidgetDisplayProps>(emptyPreview);

  useEffect(() => {
    if (!commute) {
      setPreview(emptyPreview);
      return;
    }

    let alive = true;

    const tick = async () => {
      const now = new Date();
      try {
        const staticGtfs = await getStaticGtfsService();
        const realtime = await realtimeGtfsService.fetchTripUpdatesForCommute(commute, now);
        const predictions = realtimeGtfsService.filterForCommute(realtime, commute, now.getTime());
        const nextScheduled = staticGtfs.getScheduledArrivalsAfter(
          commute.stopId,
          commute.routeId,
          now,
          8
        );
        const mapsUrl = buildGoogleMapsCoordinateUrl(commute.stopLat, commute.stopLon);
        const state = computeCountdownState({
          commute,
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
    };

    void tick();
    const id = setInterval(() => void tick(), 15_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [commute]);

  const editWidget = () => {
    beginEditSetup();
    router.push('/(onboarding)/stop');
  };

  if (!commute) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No widget setup yet.</Text>
          <Pressable accessibilityRole="button" onPress={() => router.replace('/(onboarding)/welcome')}>
            <Text style={styles.editLink}>Set Up Widget</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.backSlot}>
            <BackLink onPress={() => router.back()} />
          </View>
          <Text style={styles.headerTitle}>Widget Preview</Text>
        </View>

        <View style={styles.previewBlock}>
          <WidgetPreviewCard model={preview} />
          <View style={styles.stopBlock}>
            <Text style={styles.stopName}>{commute.stopName}</Text>
            <Text style={styles.stopRole}>Primary Stop</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transit Lines</Text>
          <View style={styles.lineRow}>
            <Text style={styles.routeBadge}>{commute.routeShortName}</Text>
            <Text style={styles.rowText}>to {commute.headsign || commute.stopName}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Travel Times</Text>
          <View style={styles.travelRow}>
            <Text style={styles.timeBadge}>{formatDurationClock(commute.walkingMinutes)}</Text>
            <Text style={styles.rowText}>to stop name</Text>
          </View>
          <View style={styles.travelRow}>
            <Text style={styles.timeBadge}>{formatDurationClock(commute.bufferMinutes)}</Text>
            <Text style={styles.rowText}>between stop buffer</Text>
          </View>
        </View>

        <Pressable accessibilityRole="button" style={styles.editHit} onPress={editWidget}>
          <Text style={styles.editLink}>Edit Widget</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.screenBg,
  },
  scroll: {
    flexGrow: 1,
    padding: 40,
  },
  header: {
    minHeight: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backSlot: {
    position: 'absolute',
    left: 0,
  },
  headerTitle: {
    fontFamily: theme.fonts.heading,
    fontSize: 18,
    lineHeight: 18,
    color: theme.black,
    textAlign: 'center',
  },
  previewBlock: {
    alignItems: 'center',
    marginTop: 76,
  },
  stopBlock: {
    width: 169,
    marginTop: 20,
    alignItems: 'center',
  },
  stopName: {
    fontFamily: theme.fonts.heading,
    fontSize: 18,
    lineHeight: 18,
    color: theme.black,
    textAlign: 'center',
  },
  stopRole: {
    marginTop: 2,
    fontFamily: theme.fonts.body,
    fontSize: 16,
    color: theme.black,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    marginTop: 78,
    backgroundColor: theme.grey,
    opacity: 0.8,
  },
  section: {
    marginTop: 33,
  },
  sectionTitle: {
    fontFamily: theme.fonts.heading,
    fontSize: 18,
    lineHeight: 18,
    color: theme.black,
    marginBottom: 10,
  },
  lineRow: {
    minHeight: 35,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: theme.grey,
    backgroundColor: theme.white,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeBadge: {
    backgroundColor: theme.yellow,
    paddingHorizontal: 4,
    fontFamily: theme.fonts.body,
    fontSize: 16,
    color: theme.black,
  },
  rowText: {
    flexShrink: 1,
    fontFamily: theme.fonts.body,
    fontSize: 16,
    color: theme.black,
  },
  travelRow: {
    minHeight: 33,
    borderTopWidth: 1,
    borderColor: theme.grey,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingLeft: 6,
  },
  timeBadge: {
    backgroundColor: theme.yellow,
    paddingHorizontal: 6,
    fontFamily: theme.fonts.heading,
    fontSize: 16,
    color: theme.black,
  },
  editHit: {
    marginTop: 'auto',
    paddingTop: 48,
    alignSelf: 'center',
  },
  editLink: {
    fontFamily: theme.fonts.heading,
    fontSize: 16,
    color: theme.brandGreen,
    textAlign: 'center',
  },
  empty: {
    flex: 1,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  emptyText: {
    fontFamily: theme.fonts.body,
    fontSize: 16,
    color: theme.black,
  },
});
