import { HStack, Image, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  background,
  cornerRadius,
  font,
  foregroundStyle,
  frame,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import {
  createLiveActivity,
  type LiveActivityComponent,
  type LiveActivityLayout,
} from 'expo-widgets';

import type { LiveActivityDisplayProps } from '@/services/liveActivity/liveActivityViewModel';

/** `LiveActivityEnvironment` isn't re-exported from the package root — derive it. */
type LiveActivityEnv = Parameters<LiveActivityComponent<LiveActivityDisplayProps>>[1];

function StumblLiveActivityView(
  rawProps: Partial<LiveActivityDisplayProps>,
  _env: LiveActivityEnv
): LiveActivityLayout {
  'widget';

  /**
   * The 'widget' directive serializes only this function's source into the
   * widget extension's bare JS context — imports from other modules don't exist
   * there, so every helper must live inside this function body. SwiftUI
   * components (@expo/ui) and modifiers are injected as globals by the bundle.
   *
   * IMPORTANT: the renderer applies a Text node's modifier array twice, so Text
   * may only carry idempotent modifiers (font / foregroundStyle). All layout
   * modifiers (padding, background, frame, cornerRadius) must live on wrapper
   * stacks, which apply them once. Keep this in sync with StumblWidget.tsx.
   */
  const props: LiveActivityDisplayProps = {
    routeBadge: '2B',
    headsign: '',
    leaveAtMs: Date.now(),
    busAtMs: Date.now(),
    stage: 'soon',
    mapsUrl: '',
    ...rawProps,
  };

  const gold = '#F8BB36';
  const green = '#148240';
  const cream = '#FBF2E5';
  const ink = '#000000';

  const isNow = props.stage === 'now';
  // Counting down to "leave now" while there's still time, then to the bus.
  const targetDate = new Date(isNow ? props.busAtMs : props.leaveAtMs);
  const leadLabel = isNow ? 'Leave now' : 'Time to leave';
  const badge = props.routeBadge || '—';
  const numberFont = font({ family: 'Monotalic-NarrowMedium', size: 40 });
  const labelFont = font({ family: 'Parabolica-Medium', size: 14 });
  const smallFont = font({ family: 'Parabolica-Regular', size: 12 });

  const badgePill = (
    <ZStack
      modifiers={[padding({ horizontal: 6, vertical: 2 }), background(green), cornerRadius(6)]}>
      <Text modifiers={[font({ family: 'Parabolica-Regular', size: 14 }), foregroundStyle(cream)]}>
        {badge}
      </Text>
    </ZStack>
  );

  const compactTimer = (color: string) => (
    <Text
      date={targetDate}
      dateStyle="timer"
      modifiers={[font({ family: 'Monotalic-NarrowMedium', size: 15 }), foregroundStyle(color)]}
    />
  );

  return {
    /**
     * Lock Screen / Notification Center banner — a branded gold card mirroring
     * the Home Screen widget so the countdown reads the same everywhere.
     */
    banner: (
      <HStack
        alignment="center"
        modifiers={[
          background(gold),
          cornerRadius(20),
          padding({ horizontal: 18, vertical: 14 }),
          frame({ maxWidth: Infinity }),
        ]}>
        <VStack alignment="leading" spacing={2}>
          <Text modifiers={[labelFont, foregroundStyle(ink)]}>{leadLabel}</Text>
          <Text
            date={targetDate}
            dateStyle="timer"
            modifiers={[numberFont, foregroundStyle(ink)]}
          />
        </VStack>
        <Spacer />
        <VStack alignment="trailing" spacing={6}>
          {badgePill}
          <HStack alignment="center" spacing={4}>
            <Image systemName="figure.walk" size={13} color={ink} />
            <Text modifiers={[smallFont, foregroundStyle(ink)]}>{props.headsign}</Text>
          </HStack>
        </VStack>
      </HStack>
    ),

    // Dynamic Island — collapsed
    compactLeading: (
      <HStack modifiers={[padding({ leading: 2 })]}>
        <Image systemName="figure.walk" size={16} color={green} />
      </HStack>
    ),
    compactTrailing: <HStack modifiers={[padding({ trailing: 2 })]}>{compactTimer(gold)}</HStack>,
    minimal: <HStack>{compactTimer(gold)}</HStack>,

    // Dynamic Island — expanded (long press)
    expandedLeading: <HStack modifiers={[padding({ leading: 4 })]}>{badgePill}</HStack>,
    expandedTrailing: (
      <HStack modifiers={[padding({ trailing: 4 })]}>
        <Text
          date={targetDate}
          dateStyle="timer"
          modifiers={[font({ family: 'Monotalic-NarrowMedium', size: 22 }), foregroundStyle(cream)]}
        />
      </HStack>
    ),
    expandedCenter: (
      <VStack alignment="center" spacing={2}>
        <Text modifiers={[labelFont, foregroundStyle(cream)]}>{leadLabel}</Text>
      </VStack>
    ),
    expandedBottom: (
      <HStack alignment="center" spacing={6} modifiers={[padding({ top: 2 })]}>
        <Image systemName="figure.walk" size={13} color={cream} />
        <Text modifiers={[smallFont, foregroundStyle(cream)]}>{props.headsign}</Text>
      </HStack>
    ),
  };
}

export default createLiveActivity('StumblActivity', StumblLiveActivityView);
