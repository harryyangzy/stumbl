import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/lib/theme';
import {
  getWidgetFooterTitle,
  getWidgetPrimaryUnitLabel,
  widgetCountdownSecondsRemaining,
  type WidgetDisplayProps,
} from '@/services/widget/widgetViewModel';

type Props = {
  model: WidgetDisplayProps | null;
  loading?: boolean;
};

/** Figma widget frame (node 565:28): 169×169 with hero 117pt + footer 52pt. */
const CARD = 169;
const HERO = 117;
const FOOTER = CARD - HERO;

function formatPreviewPrimaryValue(model: WidgetDisplayProps, nowMs: number): string {
  const remaining = widgetCountdownSecondsRemaining(model, nowMs);
  if (remaining == null) return model.primaryValue;
  return String(remaining).padStart(2, '0');
}

function previewUnitLabel(model: WidgetDisplayProps, nowMs: number): string {
  const remaining = widgetCountdownSecondsRemaining(model, nowMs);
  if (remaining != null && remaining < 60) {
    return remaining === 1 ? 'second' : 'seconds';
  }
  return getWidgetPrimaryUnitLabel(model);
}

export function WidgetPreviewCard({ model, loading = false }: Props) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (model?.countdownTargetMs == null) return;
    setNowMs(Date.now());
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [model?.countdownTargetMs]);

  if (loading || !model) {
    return (
      <View style={styles.card}>
        <View style={styles.hero}>
          <View style={styles.countdown}>
            <Text style={styles.big}>…</Text>
          </View>
        </View>
      </View>
    );
  }

  const primaryValue = formatPreviewPrimaryValue(model, nowMs);
  const unitLabel = previewUnitLabel(model, nowMs);
  const footerTitle = getWidgetFooterTitle(model);
  const footerSubtitle = model.footerLabel;

  return (
    <View style={styles.card}>
      <View style={styles.hero}>
        <View style={styles.countdown}>
          <Text style={styles.big}>{primaryValue}</Text>
          <Text style={styles.unit}>{unitLabel}</Text>
        </View>
        {model.routeBadge ? <Text style={styles.routeBadge}>{model.routeBadge}</Text> : null}
      </View>
      <View style={styles.footer}>
        {footerTitle ? <Text style={styles.footerText}>{footerTitle}</Text> : null}
        {footerSubtitle ? <Text style={styles.footerText}>{footerSubtitle}</Text> : null}
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
