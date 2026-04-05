import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { WidgetPreviewCard } from '@/components/ui/WidgetPreviewCard';
import { buildGoogleMapsCoordinateUrl } from '@/services/maps/googleMaps';
import { computeCountdownState } from '@/services/countdown/countdownService';
import { getStaticGtfsService } from '@/services/gtfs/staticGtfsService';
import { realtimeGtfsService } from '@/services/realtime/realtimeGtfsService';
import { countdownToWidgetProps, type WidgetDisplayProps } from '@/services/widget/widgetViewModel';
import { theme } from '@/lib/theme';
import { useCommuteStore } from '@/store/commuteStore';

const emptyPreview: WidgetDisplayProps = {
  primaryValue: '—',
  unitLabel: '—',
  routeBadge: '',
  headsign: '',
  state: 'empty',
  mapsUrl: '',
};

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

  const openMaps = () => {
    if (!commute) return;
    void Linking.openURL(buildGoogleMapsCoordinateUrl(commute.stopLat, commute.stopLon));
  };

  const edit = () => {
    beginEditSetup();
    router.push('/(onboarding)/stop');
  };

  if (!commute) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>No commute saved</Text>
          <PrimaryButton title="Set up" onPress={() => router.replace('/(onboarding)/welcome')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Stumbl</Text>
        <Text style={styles.sub}>
          The home screen widget refreshes on the same schedule when a development build is
          installed.
        </Text>

        <View style={styles.card}>
          <Text style={styles.line}>{commute.stopName}</Text>
          <Text style={styles.meta}>
            Route {commute.routeShortName} · Walk {commute.walkingMinutes}m · Buffer{' '}
            {commute.bufferMinutes}m
          </Text>
        </View>

        <Text style={styles.previewLabel}>Widget preview</Text>
        <WidgetPreviewCard model={preview} />
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton title="Open stop in Google Maps" onPress={openMaps} />
        <View style={styles.gap} />
        <PrimaryButton title="Edit setup" variant="secondary" onPress={edit} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.screenBg },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    padding: theme.spaceLg,
    alignItems: 'center',
    gap: theme.spaceMd,
  },
  emptyTitle: {
    fontFamily: theme.fonts.heading,
    fontSize: theme.title,
    color: theme.textPrimary,
    textAlign: 'center',
  },
  scroll: { padding: theme.spaceLg, paddingBottom: 200 },
  title: {
    fontFamily: theme.fonts.display,
    fontSize: 40,
    color: theme.brandGreen,
    letterSpacing: -0.5,
  },
  sub: {
    marginTop: theme.spaceXs,
    fontFamily: theme.fonts.body,
    fontSize: theme.body,
    color: theme.grey,
  },
  card: {
    marginTop: theme.spaceLg,
    padding: theme.spaceMd,
    backgroundColor: theme.white,
    borderRadius: theme.radiusMd,
    borderWidth: 1,
    borderColor: theme.borderSubtle,
  },
  line: {
    fontFamily: theme.fonts.heading,
    fontSize: theme.body,
    color: theme.textPrimary,
  },
  meta: {
    marginTop: 8,
    fontFamily: theme.fonts.body,
    fontSize: theme.caption,
    color: theme.grey,
  },
  previewLabel: {
    marginTop: theme.spaceLg,
    fontFamily: theme.fonts.heading,
    fontSize: theme.caption,
    color: theme.textPrimary,
    marginBottom: theme.spaceSm,
  },
  footer: {
    position: 'absolute',
    left: theme.spaceLg,
    right: theme.spaceLg,
    bottom: 28,
    alignItems: 'center',
  },
  gap: { height: theme.spaceSm },
});
