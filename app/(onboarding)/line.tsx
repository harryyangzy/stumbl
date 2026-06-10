import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OnboardingProgressBar } from '@/components/ui/OnboardingProgressBar';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { RouteSelectRow } from '@/components/ui/RouteSelectRow';
import { formatLineDestinationLabel } from '@/lib/routeLineLabel';
import { theme } from '@/lib/theme';
import { getStaticGtfsService } from '@/services/gtfs/staticGtfsService';
import { useCommuteStore } from '@/store/commuteStore';

const TITLE_TO_SUB_GAP = theme.headingLineGap - 2;

type LineOption = { routeId: string; shortName: string; label: string };

export default function LineScreen() {
  const router = useRouter();
  /** Opened from the widget preview's edit sheet — confirm goes back instead of forward. */
  const isEdit = useLocalSearchParams<{ edit?: string }>().edit === '1';
  const draft = useCommuteStore((s) => s.draft);
  const setDraft = useCommuteStore((s) => s.setDraft);

  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState<LineOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!draft.stopId) {
        setLoading(false);
        return;
      }
      const svc = await getStaticGtfsService();
      const rows = svc.routesServingStop(draft.stopId);
      if (!cancelled) {
        setOptions(
          rows.map((r) => ({
            routeId: r.route.routeId,
            shortName: r.route.shortName,
            label: r.headsign || r.route.longName,
          }))
        );
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [draft.stopId]);

  const selectedIds = useMemo(
    () => draft.selectedRouteIds ?? (draft.routeId ? [draft.routeId] : []),
    [draft.selectedRouteIds, draft.routeId]
  );

  const toggleRoute = useCallback(
    (o: LineOption) => {
      const has = selectedIds.includes(o.routeId);
      const next = has ? selectedIds.filter((id) => id !== o.routeId) : [...selectedIds, o.routeId];
      const primary = options.find((x) => x.routeId === next[0]);
      setDraft({
        selectedRouteIds: next,
        ...(primary
          ? {
              routeId: primary.routeId,
              routeShortName: primary.shortName,
              headsign: primary.label,
            }
          : {
              routeId: undefined,
              routeShortName: undefined,
              headsign: undefined,
            }),
      });
    },
    [options, selectedIds, setDraft]
  );

  const onNext = () => {
    if (selectedIds.length === 0) return;
    if (isEdit) {
      router.back();
    } else {
      router.push('/(onboarding)/walking');
    }
  };

  if (!draft.stopId) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.missOuter}>
          <OnboardingProgressBar step={2} />
          <View style={styles.missWrap}>
            <Text style={styles.miss}>Select a stop first.</Text>
            <PrimaryButton title="Back" onPress={() => router.back()} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screenBody}>
        <OnboardingProgressBar step={2} />
        <View style={styles.main}>
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>What transit line do you take?</Text>
            <Text style={styles.sub}>Select one or more</Text>

            {loading ? (
              <ActivityIndicator color={theme.brandGreen} style={styles.loader} />
            ) : (
              <View style={styles.lineList}>
                {options.map((o) => (
                  <RouteSelectRow
                    key={o.routeId}
                    routeShortName={o.shortName}
                    destinationLabel={formatLineDestinationLabel(o.shortName, o.label)}
                    selected={selectedIds.includes(o.routeId)}
                    onPress={() => toggleRoute(o)}
                  />
                ))}
              </View>
            )}
          </ScrollView>
          <View style={styles.footerGap} />
        </View>
        <View style={styles.footer} pointerEvents="box-none">
          {selectedIds.length > 0 ? (
            <PrimaryButton title={isEdit ? 'Done' : 'Next'} variant="ctaGreen" onPress={onNext} />
          ) : (
            <View style={styles.footerPlaceholder} />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.screenBg },
  screenBody: { flex: 1, flexDirection: 'column' },
  main: { flex: 1, minHeight: 0, flexDirection: 'column' },
  scrollArea: { flex: 1, minHeight: 0 },
  /** Same vertical rhythm as walking/buffer: centered in the scroll area above footerGap. */
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.screenEdge,
    paddingTop: 44,
    paddingBottom: 0,
    width: '100%',
  },
  title: {
    ...theme.textHeading,
    textAlign: 'left',
    alignSelf: 'stretch',
    marginBottom: TITLE_TO_SUB_GAP,
  },
  sub: {
    fontFamily: theme.fonts.body,
    fontSize: theme.subtitle,
    color: theme.grey,
    textAlign: 'left',
    alignSelf: 'stretch',
    marginBottom: theme.headingToControl,
  },
  loader: { marginTop: 0, alignSelf: 'flex-start' },
  lineList: { gap: 6, width: '100%' },
  missOuter: { flex: 1 },
  footerGap: {
    height: theme.scrollContentAboveFooter,
    flexShrink: 0,
  },
  footer: {
    flexShrink: 0,
    paddingTop: 0,
    paddingBottom: 32,
    paddingHorizontal: theme.screenEdge,
    alignItems: 'center',
  },
  /** Keeps footer height stable when Next is hidden so the question block stays aligned. */
  footerPlaceholder: {
    minHeight: 40,
  },
  missWrap: {
    flex: 1,
    paddingVertical: theme.spaceLg,
    paddingHorizontal: theme.screenEdge,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spaceMd,
  },
  miss: {
    fontFamily: theme.fonts.body,
    fontSize: theme.body,
    textAlign: 'center',
  },
});
