import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/lib/theme';
import {
  getWidgetFooterTitle,
  getWidgetPrimaryUnitLabel,
  type WidgetDisplayProps,
} from '@/services/widget/widgetViewModel';

type Props = {
  model: WidgetDisplayProps;
};

/** Figma widget frame (node 565:28): 169×169 with hero 117pt + footer 52pt. */
const CARD = 169;
const HERO = 117;
const FOOTER = CARD - HERO;

export function WidgetPreviewCard({ model }: Props) {
  const unitLabel = getWidgetPrimaryUnitLabel(model);
  const footerTitle = getWidgetFooterTitle(model);
  const footerTiming = model.footerLabel;

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
        {footerTitle ? <Text style={styles.footerText}>{footerTitle}</Text> : null}
        {footerTiming ? <Text style={styles.footerText}>{footerTiming}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD,
    height: CARD,
    backgroundColor: theme.yellow,
    borderRadius: theme.radiusMd,
    overflow: 'hidden',
  },
  hero: {
    height: HERO,
    position: 'relative',
  },
  countdown: {
    position: 'absolute',
    left: 15,
    top: 6,
    alignItems: 'flex-start',
  },
  routeBadge: {
    position: 'absolute',
    right: 15,
    top: 20,
    backgroundColor: theme.brandGreen,
    paddingHorizontal: 4,
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.offWhite,
  },
  footer: {
    height: FOOTER,
    width: '100%',
    backgroundColor: theme.white,
    borderTopWidth: 1,
    borderColor: theme.black,
    paddingLeft: 16,
    paddingTop: 11,
  },
  big: {
    fontFamily: 'Monotalic-NarrowMedium',
    fontSize: 74,
    lineHeight: 74,
    color: theme.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  unit: {
    marginTop: -11,
    fontFamily: theme.fonts.heading,
    fontSize: 18.5,
    lineHeight: 18.5,
    color: theme.black,
  },
  footerText: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    lineHeight: 14,
    color: theme.black,
  },
});
