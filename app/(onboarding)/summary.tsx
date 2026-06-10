import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActionSheetIOS, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EditWidgetSheet, type EditSheetLine } from '@/components/ui/EditWidgetSheet';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { WidgetPreviewCard } from '@/components/ui/WidgetPreviewCard';
import { formatLineDestinationLabel } from '@/lib/routeLineLabel';
import { refreshWidgetTimeline } from '@/services/widget/widgetTimelineService';
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

export default function SummaryScreen() {
  const router = useRouter();
  const draft = useCommuteStore((s) => s.draft);
  const savedCommute = useCommuteStore((s) => s.savedCommute);
  const saveCommute = useCommuteStore((s) => s.saveCommute);
  const beginEditSetup = useCommuteStore((s) => s.beginEditSetup);
  const clearSaved = useCommuteStore((s) => s.clearSaved);

  const [preview, setPreview] = useState<WidgetDisplayProps>(emptyPreview);
  const [editOpen, setEditOpen] = useState(false);
  const [sheetLines, setSheetLines] = useState<EditSheetLine[]>([]);

  /** Returning users land here with an empty draft — rebuild it from the saved commute. */
  const draftComplete = draftToSaved(draft) !== null;
  useEffect(() => {
    if (!draftComplete && savedCommute) beginEditSetup();
  }, [draftComplete, savedCommute, beginEditSetup]);

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

  /** All selected lines for the edit sheet (falls back to the primary route). */
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!draft.stopId) return;
      try {
        const svc = await getStaticGtfsService();
        const rows = svc.routesServingStop(draft.stopId);
        const selected = draft.selectedRouteIds ?? (draft.routeId ? [draft.routeId] : []);
        const items = rows
          .filter((r) => selected.includes(r.route.routeId))
          .map((r) => ({
            routeId: r.route.routeId,
            shortName: r.route.shortName,
            label: formatLineDestinationLabel(
              r.route.shortName,
              r.headsign || r.route.longName
            ),
          }));
        if (alive) setSheetLines(items);
      } catch {
        if (alive) setSheetLines([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [draft.stopId, draft.selectedRouteIds, draft.routeId]);

  const saved = draftToSaved(draft) ?? savedCommute;

  const onAddToHome = async () => {
    if (!saved) return;
    saveCommute(saved);

    await refreshWidgetTimeline(saved);

    Alert.alert(
      'Add the widget',
      'On your Home Screen, touch and hold an empty area, tap + in the corner, then search for Stumbl.'
    );
  };

  const onReset = () => {
    Alert.alert('Reset widget?', 'This clears your saved setup and starts over.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          clearSaved();
          router.replace('/(onboarding)/welcome');
        },
      },
    ]);
  };

  const onOpenMenu = () => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['Cancel', 'Reset Widget'],
        cancelButtonIndex: 0,
        destructiveButtonIndex: 1,
      },
      (buttonIndex) => {
        if (buttonIndex === 1) onReset();
      }
    );
  };

  const goEdit = (
    pathname:
      | '/(onboarding)/stop'
      | '/(onboarding)/line'
      | '/(onboarding)/walking'
      | '/(onboarding)/buffer'
  ) => {
    setEditOpen(false);
    router.push({ pathname, params: { edit: '1' } });
  };

  if (!saved) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.missOuter}>
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
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Widget Preview</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="More options"
            hitSlop={14}
            onPress={onOpenMenu}
            style={styles.dotsHit}>
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </Pressable>
        </View>
        <View style={styles.content}>
          <WidgetPreviewCard model={preview} />
          <View style={styles.stopBlock}>
            <Text style={styles.stopName}>{saved.stopName}</Text>
            <Text style={styles.stopRole}>Primary Stop</Text>
          </View>
        </View>
        <View style={styles.actions}>
          <PrimaryButton title="Add to Home" variant="ctaGreen" style={styles.addButton} onPress={onAddToHome} />
          <Pressable accessibilityRole="button" hitSlop={10} onPress={() => setEditOpen(true)}>
            <Text style={styles.editLink}>Edit Widget</Text>
          </Pressable>
        </View>

      </View>

      <EditWidgetSheet
        visible={editOpen}
        onClose={() => setEditOpen(false)}
        lines={sheetLines}
        walkingMinutes={saved.walkingMinutes}
        bufferMinutes={saved.bufferMinutes}
        stopName={saved.stopName}
        onEditLines={() => goEdit('/(onboarding)/line')}
        onEditWalking={() => goEdit('/(onboarding)/walking')}
        onEditBuffer={() => goEdit('/(onboarding)/buffer')}
        onEditStop={() => goEdit('/(onboarding)/stop')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.screenBg },
  main: { flex: 1, minHeight: 0 },
  header: {
    marginTop: 12,
    justifyContent: 'center',
  },
  pageTitle: {
    fontFamily: theme.fonts.heading,
    fontSize: 18,
    lineHeight: 18,
    color: theme.black,
    textAlign: 'center',
  },
  dotsHit: {
    position: 'absolute',
    right: theme.screenEdge,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: theme.black,
  },
  content: {
    position: 'absolute',
    top: 148,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 20,
  },
  stopBlock: {
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
    fontFamily: theme.fonts.body,
    fontSize: 16,
    color: theme.black,
    textAlign: 'center',
  },
  actions: {
    position: 'absolute',
    top: 446,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 12,
  },
  addButton: {
    width: 240,
    minHeight: 40,
    paddingVertical: 8,
  },
  editLink: {
    fontFamily: theme.fonts.body,
    fontSize: 16,
    color: theme.brandGreen,
    textAlign: 'center',
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
