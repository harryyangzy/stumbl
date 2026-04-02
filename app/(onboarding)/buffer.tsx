import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { TimeRulerPicker } from '@/components/ui/TimeRulerPicker';
import { theme } from '@/lib/theme';
import { useCommuteStore } from '@/store/commuteStore';

export default function BufferScreen() {
  const router = useRouter();
  const draft = useCommuteStore((s) => s.draft);
  const setDraft = useCommuteStore((s) => s.setDraft);

  const [value, setValue] = useState(draft.bufferMinutes ?? 3);

  const onNext = () => {
    setDraft({ bufferMinutes: value });
    router.push('/(onboarding)/summary');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.body}>
        <Text style={styles.title}>Add a time delay</Text>
        <Text style={styles.sub}>Arrive this many minutes before the bus is due</Text>
        <TimeRulerPicker
          min={0}
          max={15}
          value={value}
          onChange={setValue}
          unitSingular="Minute"
          unitPlural="Minutes"
        />
      </View>
      <View style={styles.footer}>
        <PrimaryButton title="Continue" onPress={onNext} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.screenBg },
  body: { flex: 1, padding: theme.spaceLg },
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
  footer: {
    padding: theme.spaceLg,
    paddingBottom: 28,
  },
});
