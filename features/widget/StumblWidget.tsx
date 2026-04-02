import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  background,
  cornerRadius,
  font,
  foregroundStyle,
  frame,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { WidgetDisplayProps } from '@/services/widget/widgetViewModel';

function StumblWidgetView(props: WidgetDisplayProps, _env: WidgetEnvironment) {
  'widget';

  const card = '#E8DFD2';
  const ink = '#1C1C1E';
  const muted = '#5C5C5C';
  const pillBg = '#F4D03F';

  return (
    <VStack
      modifiers={[
        padding({ all: 14 }),
        background(card),
        cornerRadius(18),
        frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topLeading' }),
      ]}>
      <HStack modifiers={[padding({ bottom: 6 })]}>
        {props.routeBadge ? (
          <Text
            modifiers={[
              padding({ horizontal: 10, vertical: 4 }),
              background(pillBg),
              cornerRadius(8),
              font({ size: 12, weight: 'semibold' }),
              foregroundStyle(ink),
            ]}>
            {props.routeBadge}
          </Text>
        ) : null}
        <Spacer />
      </HStack>
      <Text modifiers={[font({ size: 44, weight: 'bold' }), foregroundStyle(ink)]}>
        {props.primaryValue}
      </Text>
      <Text modifiers={[font({ size: 14, weight: 'medium' }), foregroundStyle(muted)]}>
        {props.unitLabel}
      </Text>
      {props.headsign ? (
        <Text
          modifiers={[
            padding({ top: 8 }),
            font({ size: 13, weight: 'regular' }),
            foregroundStyle(ink),
          ]}>
          {props.headsign}
        </Text>
      ) : null}
    </VStack>
  );
}

export default createWidget('StumblWidget', StumblWidgetView);
