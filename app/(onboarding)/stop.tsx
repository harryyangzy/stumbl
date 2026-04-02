import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SearchField } from '@/components/ui/SearchField';
import { theme } from '@/lib/theme';
import { getStaticGtfsService } from '@/services/gtfs/staticGtfsService';
import type { GtfsStop } from '@/types/gtfs';
import { useCommuteStore } from '@/store/commuteStore';

export default function StopScreen() {
  const router = useRouter();
  const draft = useCommuteStore((s) => s.draft);
  const setDraft = useCommuteStore((s) => s.setDraft);

  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<GtfsStop[]>([]);

  useEffect(() => {
    if (draft.stopName && !q) {
      setQ(draft.stopName);
    }
  }, [draft.stopName, q]);

  const runSearch = useCallback(async (query: string) => {
    const svc = await getStaticGtfsService();
    setResults(svc.searchStops(query, 50));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await getStaticGtfsService();
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
      void runSearch(q.trim());
    }, 180);
    return () => clearTimeout(t);
  }, [q, runSearch]);

  const selectedId = draft.stopId;

  const onPick = (s: GtfsStop) => {
    setDraft({
      stopId: s.stopId,
      stopName: s.stopName,
      stopLat: s.stopLat,
      stopLon: s.stopLon,
    });
  };

  const canContinue = Boolean(selectedId);

  const goNext = () => {
    if (selectedId) router.push('/(onboarding)/route');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Find your transit stop</Text>
        <Text style={styles.sub}>Enter your address or stop name</Text>

        <SearchField value={q} onChangeText={setQ} placeholder="Search stops" />

        {loading ? (
          <ActivityIndicator style={styles.loader} color={theme.brandGreen} />
        ) : (
          <View style={styles.dropdown}>
            {results.length === 0 ? (
              <Text style={styles.empty}>Try a street name or stop code</Text>
            ) : (
              results.map((s) => {
                const active = s.stopId === selectedId;
                return (
                  <Pressable
                    key={s.stopId}
                    onPress={() => onPick(s)}
                    style={({ pressed }) => [
                      styles.row,
                      active && styles.rowOn,
                      pressed && styles.rowPressed,
                    ]}>
                    <View style={styles.rowText}>
                      <Text style={styles.stopName}>{s.stopName}</Text>
                      {s.stopCode ? <Text style={styles.code}>Code {s.stopCode}</Text> : null}
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
        )}
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton title="Continue" onPress={goNext} disabled={!canContinue} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.screenBg },
  scroll: { padding: theme.spaceLg, paddingBottom: 140 },
  title: {
    fontSize: theme.title,
    fontWeight: '800',
    color: theme.textPrimary,
    marginBottom: theme.spaceXs,
  },
  sub: {
    fontSize: theme.subtitle,
    color: theme.textSecondary,
    marginBottom: theme.spaceMd,
  },
  loader: { marginTop: theme.spaceLg },
  dropdown: {
    marginTop: theme.spaceSm,
    backgroundColor: theme.white,
    borderRadius: theme.radiusMd,
    borderWidth: 1,
    borderColor: theme.borderSubtle,
    overflow: 'hidden',
    maxHeight: 420,
  },
  empty: {
    padding: theme.spaceMd,
    color: theme.textSecondary,
    fontSize: theme.body,
  },
  row: {
    paddingVertical: 14,
    paddingHorizontal: theme.spaceMd,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.borderSubtle,
  },
  rowOn: { backgroundColor: 'rgba(45,106,79,0.08)' },
  rowPressed: { opacity: 0.9 },
  rowText: { gap: 4 },
  stopName: { fontSize: theme.body, fontWeight: '600', color: theme.textPrimary },
  code: { fontSize: theme.caption, color: theme.textSecondary },
  footer: {
    position: 'absolute',
    left: theme.spaceLg,
    right: theme.spaceLg,
    bottom: 24,
  },
});
