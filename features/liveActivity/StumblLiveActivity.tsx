import { HStack, Image, Rectangle, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  background,
  cornerRadius,
  font,
  foregroundStyle,
  frame,
  offset,
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
   * stacks, which apply them once. Keep lock-screen banner in sync with
   * `features/widget/StumblWidget.tsx`.
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
  const white = '#FFFFFF';

  const isNow = props.stage === 'now';
  const targetDate = new Date(isNow ? props.busAtMs : props.leaveAtMs);
  const msRemaining = Math.max(0, targetDate.getTime() - Date.now());
  const badge = props.routeBadge || '—';
  const headsign = props.headsign || badge;

  function primaryUnitLabel(): string {
    if (isNow) return 'to bus';
    const sec = Math.ceil(msRemaining / 1000);
    if (sec < 60) return sec === 1 ? 'second' : 'seconds';
    const min = Math.ceil(sec / 60);
    return min === 1 ? 'minute' : 'minutes';
  }

  function footerTitle(): string {
    return isNow ? 'leave now' : 'time to leave';
  }

  function footerSubtitle(): string {
    return headsign ? `for ${headsign}` : '';
  }

  const numberFont = font({ family: 'Monotalic-NarrowMedium', size: 44 });
  const unitFont = font({ family: 'Parabolica-Medium', size: 14 });
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

  const compactTimer = (color: string, size = 15) => (
    <Text
      date={targetDate}
      dateStyle="timer"
      modifiers={[font({ family: 'Monotalic-NarrowMedium', size }), foregroundStyle(color)]}
    />
  );

  /**
   * Lock Screen banner — same structure as the Home Screen widget: big timer,
   * unit label beneath it, route badge top-trailing, white footer band.
   */
  const lockScreenCard = (
    <ZStack
      alignment="topLeading"
      modifiers={[
        background(gold),
        cornerRadius(20),
        frame({ maxWidth: Infinity, minHeight: 88, alignment: 'topLeading' }),
      ]}>
      <VStack spacing={0} modifiers={[padding({ leading: 16, top: 8 })]}>
        <Text date={targetDate} dateStyle="timer" modifiers={[numberFont, foregroundStyle(ink)]} />
        <ZStack modifiers={[offset({ y: -6 })]}>
          <Text modifiers={[unitFont, foregroundStyle(ink)]}>{primaryUnitLabel()}</Text>
        </ZStack>
      </VStack>

      {badge ? (
        <ZStack
          modifiers={[
            padding({ horizontal: 4 }),
            background(green),
            cornerRadius(6),
            padding({ top: 12, trailing: 14 }),
            frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topTrailing' }),
          ]}>
          <Text modifiers={[font({ family: 'Parabolica-Regular', size: 14 }), foregroundStyle(cream)]}>
            {badge}
          </Text>
        </ZStack>
      ) : null}

      <VStack
        spacing={0}
        modifiers={[frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'bottomLeading' })]}>
        <Spacer />
        <Rectangle modifiers={[foregroundStyle(ink), frame({ maxWidth: Infinity, height: 1 })]} />
        <HStack
          alignment="center"
          modifiers={[
            background(white),
            padding({ horizontal: 16, vertical: 9 }),
            frame({ maxWidth: Infinity }),
          ]}>
          <Text modifiers={[smallFont, foregroundStyle(ink)]}>{footerTitle()}</Text>
          {footerSubtitle() ? (
            <>
              <Spacer />
              <Text modifiers={[smallFont, foregroundStyle(ink)]}>{footerSubtitle()}</Text>
            </>
          ) : null}
        </HStack>
      </VStack>
    </ZStack>
  );

  return {
    banner: lockScreenCard,
    bannerSmall: lockScreenCard,

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
      <HStack modifiers={[padding({ trailing: 4 })]}>{compactTimer(cream, 22)}</HStack>
    ),
    expandedCenter: (
      <VStack alignment="center" spacing={2}>
        <Text modifiers={[labelFont, foregroundStyle(cream)]}>{footerTitle()}</Text>
      </VStack>
    ),
    expandedBottom: (
      <HStack alignment="center" spacing={6} modifiers={[padding({ top: 2 })]}>
        <Image systemName="figure.walk" size={13} color={cream} />
        <Text modifiers={[smallFont, foregroundStyle(cream)]}>{headsign}</Text>
      </HStack>
    ),
  };
}

export default createLiveActivity('StumblActivity', StumblLiveActivityView);
