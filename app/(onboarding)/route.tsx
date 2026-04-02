import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { RouteSelectRow } from '@/components/ui/RouteSelectRow';
import { theme } from '@/lib/theme';
import { getStaticGtfsService } from '@/services/gtfs/staticGtfsService';
import { useCommuteStore } from '@/store/commuteStore';

export default function RouteScreen() {
  const router = useRouter();
  const draft = useCommuteStore((s) => s.draft);
  const setDraft = useCommuteStore((s) => s.setDraft);

  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState<{ routeId: string; shortName: string; label: string }[]>(
    []
  );

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

  const selected = draft.routeId;

  const onNext = () => {
    if (selected) router.push('/(onboarding)/walking');
  };

  if (!draft.stopId) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.miss}>Select a stop first.</Text>
        <PrimaryButton title="Back" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>What transit line do you take?</Text>
        <Text style={styles.sub}>Select one route for this MVP</Text>

        {loading ? (
          <ActivityIndicator color={theme.brandGreen} style={styles.loader} />
        ) : (
          options.map((o) => (
            <RouteSelectRow
              key={o.routeId}
              routeShortName={o.shortName}
              label={o.label}
              selected={o.routeId === selected}
              onPress={() =>
                setDraft({
                  routeId: o.routeId,
                  routeShortName: o.shortName,
                  headsign: o.label,
                })
              }
            />
          ))
        )}
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton title="Continue" onPress={onNext} disabled={!selected} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.screenBg },
  scroll: { padding: theme.spaceLg, paddingBottom: 120 },
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
  footer: {
    position: 'absolute',
    left: theme.spaceLg,
    right: theme.spaceLg,
    bottom: 24,
  },
  miss: { padding: theme.spaceLg, fontSize: theme.body },
});
