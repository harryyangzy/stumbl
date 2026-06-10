import { StyleSheet, View } from 'react-native';

import { theme } from '@/lib/theme';

/** stop → line → walking → buffer */
export const ONBOARDING_TOTAL_STEPS = 4;

type Props = {
  /** 1-based step in the onboarding flow. */
  step: number;
  totalSteps?: number;
};

/** Full-bleed progress bar shown at the top of onboarding screens (replaces the back button). */
export function OnboardingProgressBar({ step, totalSteps = ONBOARDING_TOTAL_STEPS }: Props) {
  const pct = Math.min(1, Math.max(0, step / totalSteps)) * 100;
  return (
    <View style={styles.track} accessibilityRole="progressbar">
      <View style={[styles.fill, { width: `${pct}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    alignSelf: 'stretch',
    height: 4,
    backgroundColor: theme.white,
  },
  fill: {
    height: 4,
    backgroundColor: theme.brandGreen,
  },
});
