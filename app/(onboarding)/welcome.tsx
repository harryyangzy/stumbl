import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { theme } from '@/lib/theme';
import { useCommuteStore } from '@/store/commuteStore';

const LOGO_STROKE_OFFSETS: [number, number][] = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];

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
  const savedCommute = useCommuteStore((s) => s.savedCommute);

  const onStart = () => {
    if (!savedCommute) {
      resetDraft();
    }
    router.push('/(onboarding)/stop');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.center}>
        <View style={styles.brandBlock}>
          <StumblWordmark />
          <View style={styles.tagBox}>
            <Text style={styles.tag}>Stop waiting for the bus</Text>
          </View>
        </View>
      </View>
      <View style={styles.footer}>
        <PrimaryButton title="Get Started" variant="ctaYellow" onPress={onStart} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.brandGreen,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spaceLg,
    alignItems: 'center',
  },
  brandBlock: {
    alignItems: 'center',
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
    marginTop: 12,
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
  footer: {
    padding: theme.spaceLg,
    paddingBottom: 32,
    alignItems: 'center',
  },
});
