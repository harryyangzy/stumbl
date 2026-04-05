import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackLink } from '@/components/ui/BackLink';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { WidgetPreviewCard } from '@/components/ui/WidgetPreviewCard';
import { buildGoogleMapsCoordinateUrl } from '@/services/maps/googleMaps';
import { computeCountdownState } from '@/services/countdown/countdownService';
import { getStaticGtfsService } from '@/services/gtfs/staticGtfsService';
import { realtimeGtfsService } from '@/services/realtime/realtimeGtfsService';
import { countdownToWidgetProps, type WidgetDisplayProps } from '@/services/widget/widgetViewModel';
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

const emptyPreview: WidgetDisplayProps = {
  primaryValue: '—',
  unitLabel: 'Preview',
  routeBadge: '',
  headsign: '',
  state: 'empty',
  mapsUrl: '',
};

export default function SummaryScreen() {
  const router = useRouter();
  const draft = useCommuteStore((s) => s.draft);
  const saveCommute = useCommuteStore((s) => s.saveCommute);
  const beginEditSetup = useCommuteStore((s) => s.beginEditSetup);

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

  const onAddToHome = () => {
    if (!saved) return;
    saveCommute(saved);
    Alert.alert(
      'Add the widget',
      'On your Home Screen, touch and hold an empty area, tap + in the corner, then search for Stumbl.',
      [{ text: 'OK', onPress: () => router.replace('/(main)') }]
    );
  };

  const onEdit = () => {
    beginEditSetup();
    router.push('/(onboarding)/stop');
  };

  if (!saved) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.missWrap}>
          <Text style={styles.miss}>Finish the earlier steps first.</Text>
          <PrimaryButton title="Back to stops" onPress={() => router.replace('/(onboarding)/stop')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <BackLink />

        <Text style={styles.title}>You are set</Text>
        <Text style={styles.sub}>Review your commute and add the home screen widget.</Text>

        <View style={styles.card}>
          <Row label="Stop" value={saved.stopName} />
          <Row label="Route" value={`${saved.routeShortName} · ${saved.headsign ?? ''}`} />
          <Row label="Walk" value={`${saved.walkingMinutes} min`} />
          <Row label="Buffer" value={`${saved.bufferMinutes} min`} />
        </View>

        <Text style={styles.previewLabel}>Widget preview</Text>
        <WidgetPreviewCard model={preview} />
      </ScrollView>
      <View style={styles.actions}>
        <PrimaryButton title="Add to Home" onPress={onAddToHome} />
        <View style={styles.gap} />
        <PrimaryButton title="Edit setup" variant="secondary" onPress={onEdit} />
      </View>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.screenBg },
  scroll: { padding: theme.spaceLg, paddingBottom: 200 },
  title: {
    ...theme.textHeading,
    marginBottom: theme.spaceXs,
  },
  sub: {
    fontFamily: theme.fonts.body,
    fontSize: theme.subtitle,
    color: theme.grey,
    marginBottom: theme.spaceMd,
  },
  card: {
    backgroundColor: theme.white,
    borderRadius: theme.radiusMd,
    padding: theme.spaceMd,
    borderWidth: 1,
    borderColor: theme.borderSubtle,
    gap: 14,
    marginBottom: theme.spaceLg,
  },
  row: { gap: 4 },
  rowLabel: {
    fontFamily: theme.fonts.heading,
    fontSize: theme.caption,
    color: theme.grey,
  },
  rowValue: {
    fontFamily: theme.fonts.body,
    fontSize: theme.body,
    color: theme.textPrimary,
  },
  previewLabel: {
    fontFamily: theme.fonts.heading,
    fontSize: theme.caption,
    color: theme.textPrimary,
    marginBottom: theme.spaceSm,
  },
  actions: {
    position: 'absolute',
    left: theme.spaceLg,
    right: theme.spaceLg,
    bottom: 28,
    alignItems: 'center',
  },
  gap: { height: theme.spaceSm },
  missWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spaceLg,
    gap: theme.spaceMd,
  },
  miss: {
    fontFamily: theme.fonts.body,
    fontSize: theme.body,
    textAlign: 'center',
  },
});
