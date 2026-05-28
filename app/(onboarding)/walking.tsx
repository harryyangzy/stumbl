import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackLink } from '@/components/ui/BackLink';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { TimeRulerPicker } from '@/components/ui/TimeRulerPicker';
import { theme } from '@/lib/theme';
import { useCommuteStore } from '@/store/commuteStore';

const MAX_WALK_SEC = 30 * 60;
const STEP_SEC = 20;

function minutesToSteppedSec(minutes: number | undefined, fallbackMin: number, maxSec: number): number {
  const m = minutes ?? fallbackMin;
  const raw = Math.round(m * 60);
  const stepped = Math.round(raw / STEP_SEC) * STEP_SEC;
  return Math.min(maxSec, Math.max(0, stepped));
}

export default function WalkingScreen() {
  const router = useRouter();
  const draft = useCommuteStore((s) => s.draft);
  const setDraft = useCommuteStore((s) => s.setDraft);

  const [seconds, setSeconds] = useState(() =>
    minutesToSteppedSec(draft.walkingMinutes, 5, MAX_WALK_SEC)
  );

  const onNext = () => {
    setDraft({ walkingMinutes: seconds / 60 });
    router.push('/(onboarding)/buffer');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screenBody}>
        <View style={styles.main}>
          <View style={styles.backSlot}>
            <BackLink />
          </View>
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>How long does it take you to get to the stop?</Text>
            <TimeRulerPicker
              minSec={0}
              maxSec={MAX_WALK_SEC}
              stepSec={STEP_SEC}
              valueSec={seconds}
              onChangeSec={setSeconds}
              unitSingular="Minute"
              unitPlural="Minutes"
            />
          </ScrollView>
          <View style={styles.footerGap} />
        </View>
        <View style={styles.footer}>
          <PrimaryButton title="Next" variant="ctaGreen" onPress={onNext} />
        </View>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.screenEdge,
    paddingTop: 44,
    paddingBottom: 0,
    width: '100%',
  },
  footerGap: {
    height: theme.scrollContentAboveFooter,
    flexShrink: 0,
  },
  title: {
    ...theme.textHeading,
    textAlign: 'center',
    alignSelf: 'stretch',
    marginBottom: theme.headingToControl,
  },
  footer: {
    flexShrink: 0,
    paddingTop: 0,
    paddingBottom: 32,
    paddingHorizontal: theme.screenEdge,
    alignItems: 'center',
  },
});
