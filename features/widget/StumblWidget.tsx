import { Rectangle, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  background,
  cornerRadius,
  font,
  foregroundStyle,
  frame,
  offset,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { WidgetDisplayProps } from '@/services/widget/widgetViewModel';

function StumblWidgetView(rawProps: Partial<WidgetDisplayProps>, _env: WidgetEnvironment) {
  'widget';

  /**
   * The 'widget' directive serializes only this function's source into the
   * widget extension's bare JS context — imports from other modules don't
   * exist there, so every helper must live inside this function body.
   * Keep in sync with `services/widget/widgetViewModel.ts`.
   */
  const props: WidgetDisplayProps = {
    primaryValue: '03',
    unitLabel: 'minutes',
    routeBadge: '2B',
    headsign: '',
    footerLabel: 'in 2 minutes',
    state: 'leave_in',
    mapsUrl: '',
    ...rawProps,
  };

  function getPrimaryUnitLabel(p: WidgetDisplayProps) {
    if (p.state === 'due') return 'bus due';
    if (p.state === 'empty') return 'setup';
    if (p.primaryValue.toLowerCase() === 'now') return 'leave now';
    return Number(p.primaryValue) === 1 ? 'minute' : 'minutes';
  }

  function getFooterTiming(p: WidgetDisplayProps) {
    if (p.footerLabel) return p.footerLabel;
    if (p.state === 'fallback') return 'Realtime unavailable';
    if (p.state === 'empty') return '';
    if (p.state === 'due') return 'due now';
    return '';
  }

  function getFooterTitle(p: WidgetDisplayProps, timing: string) {
    if (!timing || p.state === 'fallback' || p.state === 'empty') return '';
    return 'Next bus';
  }

  const gold = '#F8BB36';
  const green = '#148240';
  const cream = '#FBF2E5';
  const ink = '#000000';
  const primaryUnitLabel = getPrimaryUnitLabel(props);
  const footerTiming = getFooterTiming(props);
  const footerTitle = getFooterTitle(props, footerTiming);

  /**
   * Figma frame (node 565:28) is a 169×169 canvas but systemSmall widgets
   * render smaller (148×148 on iPhone SE), so all Figma dimensions are scaled
   * by 148/169 ≈ 0.876. Top-left content keeps its scaled Figma offsets; the
   * badge is pinned to the top-trailing corner and the white "Next Bus" band
   * to the bottom edge so nothing clips across widget sizes.
   *
   * IMPORTANT: the widget renderer (WidgetsDynamicView → UIBaseView) applies a
   * Text node's modifier array twice, so Text may only carry idempotent
   * modifiers (font / foregroundStyle). All layout modifiers (offset, padding,
   * background, frame) must live on wrapper stacks, which apply them once.
   */
  /** Words like "Now" are wider than 2 digits — shrink so they clear the badge. */
  const numberSize = props.primaryValue.length > 2 ? 48 : 65;

  return (
    <ZStack
      alignment="topLeading"
      modifiers={[
        background(gold),
        cornerRadius(20),
        frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topLeading' }),
      ]}>
      {/* Countdown number */}
      <ZStack modifiers={[offset({ x: 13, y: 18 })]}>
        <Text
          modifiers={[
            font({ family: 'Monotalic-NarrowMedium', size: numberSize }),
            foregroundStyle(ink),
          ]}>
          {props.primaryValue}
        </Text>
      </ZStack>
      {/* Unit label — Parabolica Medium, spaced below the number */}
      <ZStack modifiers={[offset({ x: 14, y: 84 })]}>
        <Text modifiers={[font({ family: 'Parabolica-Medium', size: 16 }), foregroundStyle(ink)]}>
          {primaryUnitLabel}
        </Text>
      </ZStack>

      {/* Route badge — Figma: 20 from top, 15 from trailing @169 */}
      {props.routeBadge ? (
        <ZStack
          modifiers={[
            padding({ horizontal: 4 }),
            background(green),
            padding({ top: 18, trailing: 13 }),
            frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topTrailing' }),
          ]}>
          <Text modifiers={[font({ family: 'Parabolica-Regular', size: 14 }), foregroundStyle(cream)]}>
            {props.routeBadge}
          </Text>
        </ZStack>
      ) : null}

      {/* Bottom band — white fill + text as separate full-width layers */}
      <VStack
        spacing={0}
        modifiers={[frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'bottomLeading' })]}>
        <Spacer />
        <Rectangle modifiers={[foregroundStyle(ink), frame({ maxWidth: Infinity, height: 1 })]} />
        <Rectangle modifiers={[foregroundStyle('#FFFFFF'), frame({ maxWidth: Infinity, height: 45 })]} />
      </VStack>
      {footerTiming ? (
        <VStack
          spacing={0}
          modifiers={[
            frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'bottomLeading' }),
            padding({ leading: 14, bottom: 8 }),
          ]}>
          <Spacer />
          {footerTitle ? (
            <Text
              modifiers={[
                font({ family: 'Parabolica-Regular', size: 10.5 }),
                foregroundStyle(ink),
              ]}>
              {footerTitle}
            </Text>
          ) : null}
          <Text
            modifiers={[font({ family: 'Parabolica-Regular', size: 10.5 }), foregroundStyle(ink)]}>
            {footerTiming}
          </Text>
        </VStack>
      ) : null}
    </ZStack>
  );
}

export default createWidget('StumblWidget', StumblWidgetView);
