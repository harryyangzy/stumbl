import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { theme } from '@/lib/theme';
import { useCommuteStore } from '@/store/commuteStore';

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
      <View style={styles.center}>
        <Text style={styles.title}>Stumbl</Text>
        <Text style={styles.tag}>Stop waiting for the bus</Text>
      </View>
      <View style={styles.footer}>
        <PrimaryButton title="Get Started" onPress={onStart} />
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
  },
  title: {
    fontSize: 44,
    fontWeight: '800',
    color: theme.white,
    letterSpacing: -0.5,
  },
  tag: {
    marginTop: theme.spaceSm,
    fontSize: theme.subtitle,
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '500',
  },
  footer: {
    padding: theme.spaceLg,
    paddingBottom: 32,
  },
});
