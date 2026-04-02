import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

import { useCommuteStore } from '@/store/commuteStore';

export default function Index() {
  const [ready, setReady] = useState(useCommuteStore.persist.hasHydrated);
  const savedCommute = useCommuteStore((s) => s.savedCommute);
  const onboardingComplete = useCommuteStore((s) => s.onboardingComplete);

  useEffect(() => {
    const unsub = useCommuteStore.persist.onFinishHydration(() => setReady(true));
    if (useCommuteStore.persist.hasHydrated()) setReady(true);
    return unsub;
  }, []);

  if (!ready) {
    return null;
  }

  if (savedCommute && onboardingComplete) {
    return <Redirect href="/(main)" />;
  }

  return <Redirect href="/(onboarding)/welcome" />;
}
