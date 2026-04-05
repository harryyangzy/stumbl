import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/lib/theme';
import type { WidgetDisplayProps } from '@/services/widget/widgetViewModel';

type Props = {
  model: WidgetDisplayProps;
};

export function WidgetPreviewCard({ model }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        {model.routeBadge ? (
          <View style={styles.pill}>
            <Text style={styles.pillText}>{model.routeBadge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.big}>{model.primaryValue}</Text>
      <Text style={styles.unit}>{model.unitLabel}</Text>
      {model.headsign ? <Text style={styles.head}>{model.headsign}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.widgetCardBg,
    borderRadius: theme.radiusLg,
    paddingVertical: theme.spaceLg,
    paddingHorizontal: theme.spaceMd,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.borderSubtle,
  },
  topRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: theme.spaceSm,
  },
  pill: {
    backgroundColor: theme.routePillBg,
    borderRadius: theme.radiusPill,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  pillText: {
    fontFamily: theme.fonts.heading,
    fontSize: 14,
    color: theme.routePillText,
  },
  big: {
    fontFamily: theme.fonts.heading,
    fontSize: 56,
    color: theme.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontFamily: theme.fonts.body,
    fontSize: theme.caption,
    color: theme.grey,
    marginTop: 6,
  },
  head: {
    marginTop: theme.spaceSm,
    fontFamily: theme.fonts.body,
    fontSize: theme.body,
    color: theme.textPrimary,
    textAlign: 'center',
  },
});
