import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/lib/theme';
import {
  getWidgetNextBusText,
  getWidgetPrimaryUnitLabel,
  type WidgetDisplayProps,
} from '@/services/widget/widgetViewModel';

type Props = {
  model: WidgetDisplayProps;
};

export function WidgetPreviewCard({ model }: Props) {
  const unitLabel = getWidgetPrimaryUnitLabel(model);
  const nextBusText = getWidgetNextBusText(model);

  return (
    <View style={styles.card}>
      <View style={styles.hero}>
        <View style={styles.countdown}>
          <Text style={styles.big}>{model.primaryValue}</Text>
          <Text style={styles.unit}>{unitLabel}</Text>
        </View>
        {model.routeBadge ? <Text style={styles.routeBadge}>{model.routeBadge}</Text> : null}
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>Next Bus</Text>
        {nextBusText ? <Text style={styles.footerText}>{nextBusText}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 169,
    height: 169,
    backgroundColor: theme.yellow,
    borderRadius: theme.radiusMd,
    overflow: 'hidden',
  },
  hero: {
    height: 117,
    position: 'relative',
  },
  countdown: {
    position: 'absolute',
    left: 15,
    top: -6,
    alignItems: 'center',
  },
  routeBadge: {
    position: 'absolute',
    left: 121,
    top: 20,
    backgroundColor: theme.brandGreen,
    paddingHorizontal: 4,
    fontFamily: theme.fonts.body,
    fontSize: 16,
    color: theme.offWhite,
  },
  footer: {
    height: 64,
    width: 232,
    marginLeft: -14,
    backgroundColor: theme.white,
    borderTopWidth: 1,
    borderColor: theme.black,
    paddingLeft: 30,
    paddingTop: 12,
  },
  big: {
    fontFamily: theme.fonts.display,
    fontSize: 74,
    lineHeight: 91,
    color: theme.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  unit: {
    marginTop: -19,
    fontFamily: theme.fonts.heading,
    fontSize: 18.5,
    color: theme.black,
    textAlign: 'center',
  },
  footerText: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    lineHeight: 14,
    color: theme.black,
  },
});
