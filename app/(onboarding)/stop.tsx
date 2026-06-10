import { useLocalSearchParams, useRouter } from 'expo-router';
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

import { OnboardingProgressBar } from '@/components/ui/OnboardingProgressBar';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SearchField } from '@/components/ui/SearchField';
import { theme } from '@/lib/theme';
import { searchAddresses, type AddressResult } from '@/services/geocoding/geocodingService';
import { getStaticGtfsService } from '@/services/gtfs/staticGtfsService';
import type { GtfsStop } from '@/types/gtfs';
import { useCommuteStore } from '@/store/commuteStore';

/**
 * How far the results panel tucks under the search pill (negative margin + matching paddingTop).
 * Reduced vs earlier so less white shows above the list behind the pill.
 */
const RESULTS_CARD_OVERLAP = 16;
/** Top spacing below the progress bar so the title block keeps its vertical rhythm. */
const SCROLL_TOP_FOR_BACK = 44;

/** Tighter gap under subtitle (“enter your address…”) per spec (−2px vs headingToControl). */
const SUB_TO_SEARCH_GAP = theme.headingToControl - 2;
/** Title → subtitle: 2px tighter than headingLineGap. */
const TITLE_TO_SUB_GAP = theme.headingLineGap - 2;

/** Don't geocode tiny fragments — addresses are longer, and it keeps Nominatim traffic down. */
const MIN_ADDRESS_QUERY_LEN = 4;
/** Address lookup debounced much slower than stop search (network + geocoder rate limits). */
const ADDRESS_DEBOUNCE_MS = 600;

export default function StopScreen() {
  const router = useRouter();
  /** Opened from the widget preview's edit sheet — confirm goes back instead of forward. */
  const isEdit = useLocalSearchParams<{ edit?: string }>().edit === '1';
  const { height: windowHeight } = useWindowDimensions();
  const draft = useCommuteStore((s) => s.draft);
  const setDraft = useCommuteStore((s) => s.setDraft);

  /** Push main block down from top (~⅓ screen minus 100px vs earlier tuning). */
  const scrollContentPaddingTop =
    SCROLL_TOP_FOR_BACK + Math.max(0, Math.round(windowHeight / 3) - 100);

  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<GtfsStop[]>([]);
  const [addressResults, setAddressResults] = useState<AddressResult[]>([]);
  /** Set after tapping an address suggestion — replaces the list with stops near that address. */
  const [addressStops, setAddressStops] = useState<{ label: string; stops: GtfsStop[] } | null>(
    null
  );
  const searchSeq = useRef(0);
  const addressSeq = useRef(0);

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

  /** Address geocoding runs on its own, slower debounce alongside stop search. */
  const runAddressSearch = useCallback(async (query: string) => {
    const seq = ++addressSeq.current;
    const trimmed = query.trim();
    if (trimmed.length < MIN_ADDRESS_QUERY_LEN) {
      if (seq === addressSeq.current) setAddressResults([]);
      return;
    }
    try {
      const svc = await getStaticGtfsService();
      const found = await searchAddresses(trimmed, svc.bounds(), 2);
      if (seq === addressSeq.current) setAddressResults(found);
    } catch {
      if (seq === addressSeq.current) setAddressResults([]);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void runAddressSearch(q);
    }, ADDRESS_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [q, runAddressSearch]);

  const selectedId = draft.stopId;
  /** After a pick, list was hidden; show again when the user edits the search (new hunt). */
  const showSuggestions = !selectedId || q.trim() !== (draft.stopName ?? '').trim();

  const hasTypedQuery = q.trim().length > 0;
  /**
   * Only show the panel under the pill while actively searching (incl. initial load spinner).
   * When a stop is selected and the field matches, hide the panel so it doesn’t stack under the
   * pill (double stroke / elevation overlap) — does not change list layout while typing.
   */
  const showResultsCard = showSuggestions && (loading || hasTypedQuery);

  const listedCount = addressStops
    ? addressStops.stops.length
    : results.length + addressResults.length;
  const hasResultsList =
    showResultsCard && !loading && showSuggestions && hasTypedQuery && listedCount > 0;

  /** Typing again abandons the "stops near address" view and resumes normal search. */
  const onChangeQuery = (text: string) => {
    setQ(text);
    setAddressStops(null);
  };

  const onPick = (s: GtfsStop) => {
    Keyboard.dismiss();
    setAddressStops(null);
    setDraft({
      stopId: s.stopId,
      stopName: s.stopName,
      stopLat: s.stopLat,
      stopLon: s.stopLon,
    });
  };

  const onPickAddress = async (a: AddressResult) => {
    Keyboard.dismiss();
    try {
      const svc = await getStaticGtfsService();
      setAddressStops({ label: a.label, stops: svc.nearestStops(a.lat, a.lon, 4) });
    } catch {
      /* keep current list if GTFS unexpectedly unavailable */
    }
  };

  const goNext = () => {
    if (!selectedId) return;
    if (isEdit) {
      router.back();
    } else {
      router.push('/(onboarding)/line');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screenBody}>
        <OnboardingProgressBar step={1} />
        <View style={styles.main}>
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
              <SearchField
                value={q}
                onChangeText={onChangeQuery}
                placeholder="Search stops"
                pillOutline
              />
            </View>

            {showResultsCard ? (
              <View style={styles.resultsCard}>
                <View style={[styles.resultsCardClip, { paddingTop: RESULTS_CARD_OVERLAP }]}>
                  {loading && showSuggestions ? (
                    <ActivityIndicator style={styles.loaderInCard} color={theme.brandGreen} />
                  ) : null}

                  {!loading && showSuggestions && hasTypedQuery && listedCount === 0 ? (
                    <View style={styles.emptyInCard} />
                  ) : null}

                  {!loading && showSuggestions && hasTypedQuery && addressStops ? (
                    <>
                      <View style={[styles.row, styles.rowDivider]}>
                        <Text style={styles.nearbyHeader}>Stops near {addressStops.label}</Text>
                      </View>
                      {addressStops.stops.map((s, index) => {
                        const isLast = index === addressStops.stops.length - 1;
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
                    </>
                  ) : null}

                  {!loading && showSuggestions && hasTypedQuery && !addressStops ? (
                    <>
                      {results.map((s, index) => {
                        const isLast = index === results.length - 1 && addressResults.length === 0;
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
                      {addressResults.map((a, index) => {
                        const isLast = index === addressResults.length - 1;
                        return (
                          <TouchableOpacity
                            key={a.id}
                            activeOpacity={0.75}
                            onPress={() => void onPickAddress(a)}
                            style={[styles.row, !isLast && styles.rowDivider]}>
                            <View style={styles.rowText}>
                              <Text style={styles.stopName}>{a.label}</Text>
                              <Text style={styles.addressTag}>Address · show nearby stops</Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </>
                  ) : null}
                </View>
              </View>
            ) : null}
          </ScrollView>
        </View>

        {selectedId && !showSuggestions ? (
          <>
            <View style={styles.footerGap} />
            <View style={styles.footer}>
              <PrimaryButton title={isEdit ? 'Done' : 'Next'} variant="ctaGreen" onPress={goNext} />
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
    ...(Platform.OS === 'ios' ? { borderCurve: 'continuous' as const } : {}),
  },
  resultsCardClip: {
    overflow: 'hidden',
    borderBottomLeftRadius: theme.radiusMd,
    borderBottomRightRadius: theme.radiusMd,
    ...(Platform.OS === 'ios' ? { borderCurve: 'continuous' as const } : {}),
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
  addressTag: {
    fontFamily: theme.fonts.body,
    fontSize: theme.body - 3,
    color: theme.grey,
  },
  nearbyHeader: {
    fontFamily: theme.fonts.body,
    fontSize: theme.body - 2,
    color: theme.grey,
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
