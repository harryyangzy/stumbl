import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { TRANSIT_AGENCY_LIST, type TransitAgencyId } from '@/lib/transitAgencies';
import { theme } from '@/lib/theme';
import { useCommuteStore } from '@/store/commuteStore';

/** Chebyshev ring at each radius for a solid black outline around the wordmark. */
function logoStrokeOffsets(radii: number[]): [number, number][] {
  const out: [number, number][] = [];
  for (const r of radii) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx === 0 && dy === 0) continue;
        if (Math.max(Math.abs(dx), Math.abs(dy)) === r) {
          out.push([dx, dy]);
        }
      }
    }
  }
  return out;
}

const LOGO_STROKE_OFFSETS = logoStrokeOffsets([1]);

function StumblWordmark() {
  return (
    <View style={styles.markWrap}>
      <View style={styles.markInner}>
        {LOGO_STROKE_OFFSETS.map(([dx, dy], i) => (
          <Text
            key={i}
            pointerEvents="none"
            style={[
              styles.logoStroke,
              {
                transform: [{ translateX: dx }, { translateY: dy }],
              },
            ]}>
            stumbl
          </Text>
        ))}
        <Text style={styles.logoFill}>stumbl</Text>
      </View>
    </View>
  );
}

export default function WelcomeScreen() {
  const router = useRouter();
  const resetDraft = useCommuteStore((s) => s.resetDraft);
  const setDraft = useCommuteStore((s) => s.setDraft);
  const savedCommute = useCommuteStore((s) => s.savedCommute);
  const draftAgency = useCommuteStore((s) => s.draft.agencyId);
  const selectedAgency = draftAgency ?? savedCommute?.agencyId;

  const onPickAgency = (agencyId: TransitAgencyId) => {
    setDraft({ agencyId });
  };

  const onStart = () => {
    if (!savedCommute) {
      resetDraft();
      if (selectedAgency) {
        setDraft({ agencyId: selectedAgency });
      }
    }
    router.push('/(onboarding)/stop');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.welcomeColumn}>
        <View style={styles.center}>
          <View style={styles.brandBlock}>
            <StumblWordmark />
            <View style={[styles.tagBox, { marginTop: theme.welcomeLogoToTag - 4 }]}>
              <Text style={styles.tag}>Stop waiting for the bus</Text>
            </View>
          </View>

          <Text style={styles.cityHeading}>Choose your city</Text>
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
                  <Text style={[styles.cityLabel, selected && styles.cityLabelSelected]}>
                    {agency.label}
                  </Text>
                  <Text style={[styles.cityRegion, selected && styles.cityRegionSelected]}>
                    {agency.region}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.ctaSpacer} />
          <PrimaryButton
            title="Get Started"
            variant="ctaYellow"
            disabled={!selectedAgency}
            onPress={onStart}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.brandGreen,
  },
  welcomeColumn: {
    flex: 1,
    paddingHorizontal: theme.screenEdge,
    justifyContent: 'center',
    paddingBottom: 32,
  },
  center: {
    width: '100%',
    alignItems: 'center',
  },
  brandBlock: {
    alignItems: 'center',
  },
  cityHeading: {
    marginTop: 28,
    fontFamily: theme.fonts.heading,
    fontSize: theme.body,
    color: theme.offWhite,
  },
  cityRow: {
    marginTop: 12,
    width: '100%',
    gap: 10,
  },
  cityCard: {
    width: '100%',
    borderWidth: 1,
    borderColor: theme.black,
    backgroundColor: theme.offWhite,
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
  cityLabelSelected: {
    color: theme.black,
  },
  cityRegion: {
    marginTop: 2,
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.black,
  },
  cityRegionSelected: {
    color: theme.black,
  },
  ctaSpacer: {
    height: theme.welcomeTagToCta,
  },
  markWrap: {
    alignItems: 'center',
  },
  markInner: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: theme.displayLogo + 8,
    minWidth: 260,
  },
  logoStroke: {
    position: 'absolute',
    fontFamily: theme.fonts.display,
    fontSize: theme.displayLogo,
    color: theme.black,
  },
  logoFill: {
    fontFamily: theme.fonts.display,
    fontSize: theme.displayLogo,
    color: theme.offWhite,
  },
  tagBox: {
    alignSelf: 'center',
    backgroundColor: theme.white,
    borderWidth: 1,
    borderColor: theme.black,
    paddingVertical: 3,
    paddingLeft: 8,
    paddingRight: 16,
  },
  tag: {
    fontFamily: theme.fonts.body,
    fontSize: theme.body,
    color: theme.black,
  },
});
