import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OnboardingProgressBar } from '@/components/ui/OnboardingProgressBar';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { TRANSIT_AGENCY_LIST, type TransitAgencyId } from '@/lib/transitAgencies';
import { theme } from '@/lib/theme';
import { useCommuteStore } from '@/store/commuteStore';

const TITLE_TO_SUB_GAP = theme.headingLineGap - 2;

export default function CityScreen() {
  const router = useRouter();
  const draftAgency = useCommuteStore((s) => s.draft.agencyId);
  const savedAgency = useCommuteStore((s) => s.savedCommute?.agencyId);
  const setDraft = useCommuteStore((s) => s.setDraft);
  const selectedAgency = draftAgency ?? savedAgency;

  const onPickAgency = (agencyId: TransitAgencyId) => {
    setDraft({ agencyId });
  };

  const onNext = () => {
    if (!selectedAgency) return;
    router.push('/(onboarding)/stop');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screenBody}>
        <OnboardingProgressBar step={1} />
        <View style={styles.main}>
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Choose your city</Text>
            <Text style={styles.sub}>Which transit system do you use?</Text>

            <View style={styles.cityRow}>
              {TRANSIT_AGENCY_LIST.map((agency) => {
                const selected = selectedAgency === agency.id;
                return (
                  <Pressable
                    key={agency.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => onPickAgency(agency.id)}
                    style={[styles.cityCard, selected && styles.cityCardSelected]}>
                    <Text style={styles.cityLabel}>{agency.label}</Text>
                    <Text style={styles.cityRegion}>{agency.region}</Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
          <View style={styles.footerGap} />
        </View>
        <View style={styles.footer} pointerEvents={selectedAgency ? 'auto' : 'none'}>
          <PrimaryButton
            title="Next"
            variant="ctaGreen"
            onPress={onNext}
            disabled={!selectedAgency}
            style={!selectedAgency ? styles.footerButtonHidden : undefined}
          />
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
  cityRow: {
    width: '100%',
    gap: 10,
  },
  cityCard: {
    width: '100%',
    borderWidth: 1,
    borderColor: theme.black,
    backgroundColor: theme.white,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  cityCardSelected: {
    backgroundColor: theme.yellow,
  },
  cityLabel: {
    fontFamily: theme.fonts.heading,
    fontSize: theme.body,
    color: theme.black,
  },
  cityRegion: {
    marginTop: 2,
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.black,
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
  footerButtonHidden: {
    opacity: 0,
  },
});
