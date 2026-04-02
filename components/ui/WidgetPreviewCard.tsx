import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/lib/theme';
import type { WidgetDisplayProps } from '@/services/widget/widgetViewModel';

type Props = {
  model: WidgetDisplayProps;
};

export function WidgetPreviewCard({ model }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
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
    padding: theme.spaceLg,
    alignItems: 'center',
  },
  row: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    marginBottom: theme.spaceSm,
  },
  pill: {
    backgroundColor: theme.routePillBg,
    borderRadius: theme.radiusSm,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  pillText: {
    fontWeight: '700',
    color: theme.routePillText,
    fontSize: 14,
  },
  big: {
    fontSize: 56,
    fontWeight: '800',
    color: theme.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontSize: 16,
    color: theme.textSecondary,
    fontWeight: '600',
    marginTop: 4,
  },
  head: {
    marginTop: theme.spaceSm,
    fontSize: 15,
    color: theme.textPrimary,
    textAlign: 'center',
  },
});
