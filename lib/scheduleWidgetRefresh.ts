import { InteractionManager } from 'react-native';

import { refreshWidgetTimeline } from '@/services/widget/widgetTimelineService';
import type { SavedCommute } from '@/types/commute';

let pendingFrame: ReturnType<typeof setTimeout> | null = null;
let pendingInteraction: { cancel: () => void } | null = null;

/**
 * Run a widget timeline refresh after taps/navigation finish animating.
 * Coalesces rapid calls (e.g. save + hook effect) into one refresh.
 */
export function scheduleWidgetTimelineRefresh(getCommute: () => SavedCommute | null): void {
  if (pendingFrame) clearTimeout(pendingFrame);
  pendingInteraction?.cancel();

  pendingFrame = setTimeout(() => {
    pendingFrame = null;
    pendingInteraction = InteractionManager.runAfterInteractions(() => {
      pendingInteraction = null;
      void refreshWidgetTimeline(getCommute());
    });
  }, 0);
}
