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
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackLink } from '@/components/ui/BackLink';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SearchField } from '@/components/ui/SearchField';
import { theme } from '@/lib/theme';
import { getStaticGtfsService } from '@/services/gtfs/staticGtfsService';
import type { GtfsStop } from '@/types/gtfs';
import { useCommuteStore } from '@/store/commuteStore';

/**
 * How far the results panel tucks under the search pill (negative margin + matching paddingTop).
 * Reduced vs earlier so less white shows above the list behind the pill.
 */
const RESULTS_CARD_OVERLAP = 16;
/** Space reserved for the absolute back row so the title block doesn’t sit under it. */
const SCROLL_TOP_FOR_BACK = 44;

/** Tighter gap under subtitle (“enter your address…”) per spec (−2px vs headingToControl). */
const SUB_TO_SEARCH_GAP = theme.headingToControl - 2;
/** Title → subtitle: 2px tighter than headingLineGap. */
const TITLE_TO_SUB_GAP = theme.headingLineGap - 2;

export default function StopScreen() {
  const router = useRouter();
  const { height: windowHeight } = useWindowDimensions();
  const draft = useCommuteStore((s) => s.draft);
  const setDraft = useCommuteStore((s) => s.setDraft);

  /** Push main block down from top (~⅓ screen minus 100px vs earlier tuning). */
  const scrollContentPaddingTop =
    SCROLL_TOP_FOR_BACK + Math.max(0, Math.round(windowHeight / 3) - 100);

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
      setResults(svc.searchStops(query, 4));
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
  /**
   * Only show the panel under the pill while actively searching (incl. initial load spinner).
   * When a stop is selected and the field matches, hide the panel so it doesn’t stack under the
   * pill (double stroke / elevation overlap) — does not change list layout while typing.
   */
  const showResultsCard = showSuggestions && (loading || hasTypedQuery);

  const hasResultsList =
    showResultsCard && !loading && showSuggestions && hasTypedQuery && results.length > 0;

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
      <View style={styles.screenBody}>
        <View style={styles.main}>
          <View style={styles.backSlot}>
            <BackLink label="Home" onPress={() => router.replace('/(onboarding)/welcome')} />
          </View>

          <ScrollView
            style={styles.scrollArea}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="on-drag"
            contentContainerStyle={[
              styles.scrollContent,
              { paddingTop: scrollContentPaddingTop },
              hasResultsList && styles.scrollContentExtraBottom,
              selectedId && !showSuggestions && styles.scrollContentWithNext,
            ]}
            showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Find your transit stop</Text>
            <Text style={styles.sub}>Enter your address or stop name</Text>

            <View style={styles.pillLayer}>
              <SearchField value={q} onChangeText={setQ} placeholder="Search stops" pillOutline />
            </View>

            {showResultsCard ? (
              <View style={styles.resultsCard}>
                <View style={[styles.resultsCardClip, { paddingTop: RESULTS_CARD_OVERLAP }]}>
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
              </View>
            ) : null}
          </ScrollView>
        </View>

        {selectedId && !showSuggestions ? (
          <>
            <View style={styles.footerGap} />
            <View style={styles.footer}>
              <PrimaryButton title="Next" variant="ctaGreen" onPress={goNext} />
            </View>
          </>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.screenBg },
  screenBody: { flex: 1, flexDirection: 'column' },
  main: { flex: 1, minHeight: 0, flexDirection: 'column' },
  backSlot: {
    position: 'absolute',
    top: theme.spaceSm,
    left: theme.screenEdge,
    zIndex: 10,
  },
  scrollArea: { flex: 1, minHeight: 0 },
  /** flexGrow + flex-start: header stays fixed at top when results appear (no vertical re-centering). */
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: theme.screenEdge,
    paddingBottom: theme.spaceLg,
  },
  /** Room to scroll the results card fully above the fold (bottom stroke + last rows). */
  scrollContentExtraBottom: {
    paddingBottom: theme.spaceLg + 100,
  },
  /** When Next is shown, avoid double bottom gap; footer handles spacing. */
  scrollContentWithNext: {
    paddingBottom: theme.spaceSm,
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
    marginBottom: SUB_TO_SEARCH_GAP,
  },
  pillLayer: {
    zIndex: 2,
    position: 'relative',
    alignSelf: 'stretch',
    ...(Platform.OS === 'android' ? { elevation: 6 } : {}),
  },
  /**
   * Stroke on this shell; overflow hidden lives on `resultsCardClip` so list clipping doesn’t
   * eat the bottom corner border (common RN issue when both are on the same view).
   */
  resultsCard: {
    marginTop: -RESULTS_CARD_OVERLAP,
    marginBottom: 14,
    zIndex: 1,
    alignSelf: 'stretch',
    backgroundColor: theme.white,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.black,
    borderBottomLeftRadius: theme.radiusMd,
    borderBottomRightRadius: theme.radiusMd,
    ...(Platform.OS === 'ios'
      ? { borderCurve: 'continuous' as const }
      : {}),
  },
  resultsCardClip: {
    overflow: 'hidden',
    borderBottomLeftRadius: theme.radiusMd,
    borderBottomRightRadius: theme.radiusMd,
    ...(Platform.OS === 'ios'
      ? { borderCurve: 'continuous' as const }
      : {}),
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
    paddingVertical: 8,
    paddingHorizontal: theme.spaceMd,
    backgroundColor: theme.white,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.12)',
  },
  rowText: { gap: 4 },
  stopName: {
    fontFamily: theme.fonts.body,
    fontSize: theme.body,
    color: theme.textPrimary,
  },
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
});
