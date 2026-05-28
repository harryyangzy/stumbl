import { Rectangle, Text, VStack, ZStack } from '@expo/ui/swift-ui';
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

import {
  getWidgetNextBusText,
  getWidgetPrimaryUnitLabel,
  normalizeWidgetProps,
  type WidgetDisplayProps,
} from '@/services/widget/widgetViewModel';

function StumblWidgetView(rawProps: Partial<WidgetDisplayProps>, _env: WidgetEnvironment) {
  'widget';

  const props = normalizeWidgetProps(rawProps);
  const gold = '#F8BB36';
  const green = '#148240';
  const cream = '#FBF2E5';
  const ink = '#000000';
  const primaryUnitLabel = getWidgetPrimaryUnitLabel(props);
  const nextBusText = getWidgetNextBusText(props);

  return (
    <ZStack
      alignment="topLeading"
      modifiers={[
        background(gold),
        cornerRadius(20),
        frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topLeading' }),
      ]}>
      <VStack
        alignment="leading"
        spacing={-18}
        modifiers={[offset({ x: 15, y: -6 })]}>
        <Text modifiers={[font({ family: 'Monotalic-Medium', size: 74 }), foregroundStyle(ink)]}>
          {props.primaryValue}
        </Text>
        <Text
          modifiers={[
            font({ family: 'Parabolica-Medium', size: 18.5 }),
            foregroundStyle(ink),
            offset({ y: -2 }),
          ]}>
          {primaryUnitLabel}
        </Text>
      </VStack>

      {props.routeBadge ? (
        <Text
          modifiers={[
            background(green),
            padding({ horizontal: 4 }),
            font({ family: 'Parabolica-Regular', size: 16 }),
            foregroundStyle(cream),
            offset({ x: 121, y: 20 }),
          ]}>
          {props.routeBadge}
        </Text>
      ) : null}

      <Rectangle
        modifiers={[
          background('#FFFFFF'),
          frame({ width: 232, height: 64 }),
          offset({ x: -14, y: 117 }),
        ]}
      />
      <Rectangle
        modifiers={[background(ink), frame({ width: 232, height: 1 }), offset({ x: -14, y: 117 })]}
      />

      <VStack
        alignment="leading"
        spacing={0}
        modifiers={[offset({ x: 16, y: 128 }), frame({ width: 125, alignment: 'topLeading' })]}>
        <Text modifiers={[font({ family: 'Parabolica-Regular', size: 12 }), foregroundStyle(ink)]}>
          Next Bus
        </Text>
        {nextBusText ? (
          <Text
            modifiers={[font({ family: 'Parabolica-Regular', size: 12 }), foregroundStyle(ink)]}>
            {nextBusText}
          </Text>
        ) : null}
      </VStack>
    </ZStack>
  );
}

export default createWidget('StumblWidget', StumblWidgetView);
