import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackLink } from '@/components/ui/BackLink';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SearchField } from '@/components/ui/SearchField';
import { theme } from '@/lib/theme';
import { getStaticGtfsService } from '@/services/gtfs/staticGtfsService';
import type { GtfsStop } from '@/types/gtfs';
import { useCommuteStore } from '@/store/commuteStore';

/** Pull results card up under the pill (visual overlap). */
const RESULTS_CARD_OVERLAP = 24;
export default function StopScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const searchPillWidth = Math.max(0, windowWidth - theme.spaceLg * 2);
  const resultsTopWhite = Math.round(searchPillWidth / 2);

  const router = useRouter();
  const draft = useCommuteStore((s) => s.draft);
  const setDraft = useCommuteStore((s) => s.setDraft);

  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<GtfsStop[]>([]);
  const searchSeq = useRef(0);

  /** Keep query in sync when draft stop changes — never refill when user clears the field. */
  const lastDraftStopId = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (lastDraftStopId.current === draft.stopId) return;
    lastDraftStopId.current = draft.stopId;
    setQ(draft.stopName ?? '');
  }, [draft.stopId, draft.stopName]);

  const runSearch = useCallback(async (query: string) => {
    const seq = ++searchSeq.current;
    const trimmed = query.trim();
    if (!trimmed) {
      if (seq === searchSeq.current) setResults([]);
      return;
    }
    try {
      const svc = await getStaticGtfsService();
      if (seq !== searchSeq.current) return;
      setResults(svc.searchStops(query, 5));
    } catch {
      if (seq === searchSeq.current) setResults([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await getStaticGtfsService();
      } catch {
        /* load errors surface as empty results; singleton not stuck half-initialized */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void runSearch(q);
    }, 100);
    return () => clearTimeout(t);
  }, [q, runSearch]);

  const selectedId = draft.stopId;
  /** After a pick, list was hidden; show again when the user edits the search (new hunt). */
  const showSuggestions =
    !selectedId || q.trim() !== (draft.stopName ?? '').trim();

  const hasTypedQuery = q.trim().length > 0;
  /** No browse list when empty — only show card while loading, typing, or stop chosen (compact). */
  const showResultsCard =
    loading || (selectedId && !showSuggestions) || (showSuggestions && hasTypedQuery);

  const onPick = (s: GtfsStop) => {
    Keyboard.dismiss();
    setDraft({
      stopId: s.stopId,
      stopName: s.stopName,
      stopLat: s.stopLat,
      stopLon: s.stopLon,
    });
  };

  const goNext = () => {
    if (selectedId) router.push('/(onboarding)/line');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.main}>
        <ScrollView
          style={styles.scrollArea}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <BackLink label="< Home" onPress={() => router.replace('/(onboarding)/welcome')} />
          <Text style={styles.title}>Find your transit stop</Text>
          <Text style={styles.sub}>Enter your address or stop name</Text>

          <View style={styles.pillLayer}>
            <SearchField value={q} onChangeText={setQ} placeholder="Search stops" pillOutline />
          </View>

          {showResultsCard ? (
            <View
              style={[
                styles.resultsCard,
                selectedId ? styles.resultsCardFlushTop : null,
                selectedId ? styles.resultsCardSelectedBody : null,
                {
                  paddingTop:
                    selectedId && !showSuggestions
                      ? 8
                      : RESULTS_CARD_OVERLAP + resultsTopWhite,
                },
              ]}>
              {loading && showSuggestions ? (
                <ActivityIndicator style={styles.loaderInCard} color={theme.brandGreen} />
              ) : null}

              {!loading && showSuggestions && hasTypedQuery && results.length === 0 ? (
                <View style={styles.emptyInCard} />
              ) : null}

              {!loading &&
                showSuggestions &&
                hasTypedQuery &&
                results.map((s, index) => {
                  const isLast = index === results.length - 1;
                  return (
                    <TouchableOpacity
                      key={s.stopId}
                      activeOpacity={0.75}
                      onPress={() => onPick(s)}
                      style={[styles.row, !isLast && styles.rowDivider]}>
                      <View style={styles.rowText}>
                        <Text style={styles.stopName}>{s.stopName}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
            </View>
          ) : null}
        </ScrollView>
      </View>
      <View style={styles.footer}>
        <PrimaryButton title="Next" variant="ctaYellow" onPress={goNext} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.screenBg },
  /** Same role as welcome `center`: takes remaining space above the footer. */
  main: { flex: 1, minHeight: 0 },
  scrollArea: { flex: 1 },
  scrollContent: {
    paddingHorizontal: theme.spaceLg,
    paddingBottom: theme.spaceLg,
  },
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
  pillLayer: {
    zIndex: 2,
    position: 'relative',
    ...(Platform.OS === 'android' ? { elevation: 4 } : {}),
  },
  resultsCard: {
    marginTop: -RESULTS_CARD_OVERLAP,
    zIndex: 1,
    backgroundColor: theme.white,
    borderRadius: theme.radiusMd,
    borderWidth: 1,
    borderColor: theme.black,
    overflow: 'hidden',
  },
  /** Square top corners when a stop is chosen (meets pill visually). */
  resultsCardFlushTop: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  /** Compact card when list is hidden after selection. */
  resultsCardSelectedBody: {
    minHeight: 8,
    paddingBottom: theme.spaceSm,
  },
  loaderInCard: {
    paddingVertical: theme.spaceLg,
    backgroundColor: theme.white,
  },
  emptyInCard: {
    minHeight: theme.spaceLg,
    backgroundColor: theme.white,
  },
  row: {
    paddingVertical: 16,
    paddingHorizontal: theme.spaceMd,
    backgroundColor: theme.white,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.12)',
  },
  rowText: { gap: 4 },
  stopName: {
    fontFamily: theme.fonts.heading,
    fontSize: theme.body,
    color: theme.textPrimary,
  },
  /** Identical to welcome.tsx footer (Get Started). */
  footer: {
    padding: theme.spaceLg,
    paddingBottom: 32,
    alignItems: 'center',
  },
});
