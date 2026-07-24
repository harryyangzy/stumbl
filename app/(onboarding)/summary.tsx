import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EditWidgetSheet, type EditSheetLine } from '@/components/ui/EditWidgetSheet';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { WidgetPreviewCard } from '@/components/ui/WidgetPreviewCard';
import { formatLineDestinationLabel } from '@/lib/routeLineLabel';
import { draftToSaved, getActiveCommute } from '@/lib/activeCommute';
import { refreshWidgetTimeline, computeWidgetDisplayProps } from '@/services/widget/widgetTimelineService';
import { getStaticGtfsService } from '@/services/gtfs/staticGtfsService';
import { useTransitAgencyId } from '@/hooks/useTransitAgencyId';
import {
  type WidgetDisplayProps,
} from '@/services/widget/widgetViewModel';
import { theme } from '@/lib/theme';
import { useCommuteStore } from '@/store/commuteStore';

const REFRESH_MS = 30_000;

export default function SummaryScreen() {
  const router = useRouter();
  const draft = useCommuteStore((s) => s.draft);
  const savedCommute = useCommuteStore((s) => s.savedCommute);
  const saveCommute = useCommuteStore((s) => s.saveCommute);
  const beginEditSetup = useCommuteStore((s) => s.beginEditSetup);
  const clearSaved = useCommuteStore((s) => s.clearSaved);
  const agencyId = useTransitAgencyId();

  const [preview, setPreview] = useState<WidgetDisplayProps | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [sheetLines, setSheetLines] = useState<EditSheetLine[]>([]);

  /** Returning users land here with an empty draft — rebuild it from the saved commute. */
  const draftComplete = draftToSaved(draft) !== null;
  useEffect(() => {
    if (!draftComplete && savedCommute) beginEditSetup();
  }, [draftComplete, savedCommute, beginEditSetup]);

  const activeCommute = getActiveCommute(draft, savedCommute);

  useEffect(() => {
    const commute = getActiveCommute(draft, savedCommute);
    if (!commute) return;
    let alive = true;

    const refresh = async () => {
      try {
        const props = await computeWidgetDisplayProps(commute);
        if (!alive) return;
        setPreview(props);
      } catch {
        if (alive) setPreview(null);
      }
    };

    refresh();
    const id = setInterval(refresh, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [draft, savedCommute]);

  /** All selected lines for the edit sheet (falls back to the primary route). */
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!draft.stopId) return;
      try {
        const svc = await getStaticGtfsService(agencyId);
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
  }, [draft.stopId, draft.selectedRouteIds, draft.routeId, agencyId]);

  const saved = activeCommute;

  const onAddToHome = async () => {
    if (!saved) return;
    saveCommute(saved);

    await refreshWidgetTimeline(saved);

    Alert.alert(
      'Add the widget',
      'On your Home Screen, touch and hold an empty area, tap + in the corner, then search for Stumbl.'
    );
  };

  const onOpenMenu = () => {
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
          <WidgetPreviewCard model={preview} loading={preview === null} />
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
    zIndex: 10,
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
    right: theme.screenEdge - 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minWidth: 44,
    minHeight: 44,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
