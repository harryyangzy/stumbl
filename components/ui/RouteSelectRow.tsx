import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/lib/theme';

const CHECKBOX = 18;
const CHECKBOX_RADIUS = 6;
const CHECKBOX_STROKE = 1;
const CHECKBOX_INNER = 12;
const CHECKBOX_INNER_RADIUS = 4;
/** Match `lineBoxText` lineHeight so checkbox centers on the line badge row. */
const LINE_ROW_HEIGHT = 20;

type Props = {
  routeShortName: string;
  /** Already formatted, e.g. "to Natural Science". */
  destinationLabel: string;
  selected: boolean;
  onPress: () => void;
};

export function RouteSelectRow({
  routeShortName,
  destinationLabel,
  selected,
  onPress,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}>
      <View style={styles.pill}>
        <View style={styles.leftCluster}>
          <View style={styles.lineBox}>
            <Text style={styles.lineBoxText}>{routeShortName}</Text>
          </View>
          <Text
            style={styles.destination}
            numberOfLines={2}
            {...(Platform.OS === 'android' ? { includeFontPadding: false } : {})}>
            {destinationLabel}
          </Text>
        </View>
        <View style={styles.checkboxAlign}>
          <View style={[styles.checkboxOuter, selected && styles.checkboxOuterSelected]}>
            {selected ? <View style={styles.checkboxInner} /> : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  /** White fill + grey stroke; holds line number, destination, checkbox. */
  pill: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: theme.white,
    borderRadius: theme.radiusPill,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
    paddingVertical: 8,
    paddingHorizontal: theme.spaceSm,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.995 }],
  },
  /** Line number + “to …” grouped; 8px between them; shares space with checkbox via space-between on pill. */
  leftCluster: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    minWidth: 0,
    marginRight: theme.spaceSm,
  },
  lineBox: {
    backgroundColor: theme.routePillBg,
    borderRadius: 6,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 4,
    paddingRight: 4,
    minHeight: LINE_ROW_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineBoxText: {
    fontFamily: theme.fonts.heading,
    fontSize: 15,
    lineHeight: 20,
    color: theme.routePillText,
  },
  destination: {
    flex: 1,
    flexShrink: 1,
    paddingTop: 0,
    fontFamily: theme.fonts.body,
    fontSize: theme.body,
    lineHeight: LINE_ROW_HEIGHT,
    color: theme.textPrimary,
  },
  /** Keeps checkbox vertically centered on the line badge row when destination wraps. */
  checkboxAlign: {
    marginTop: Math.max(0, (LINE_ROW_HEIGHT - CHECKBOX) / 2),
  },
  checkboxOuter: {
    width: CHECKBOX,
    height: CHECKBOX,
    borderRadius: CHECKBOX_RADIUS,
    borderWidth: CHECKBOX_STROKE,
    borderColor: theme.grey,
    backgroundColor: theme.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOuterSelected: {
    borderColor: theme.brandGreen,
  },
  checkboxInner: {
    width: CHECKBOX_INNER,
    height: CHECKBOX_INNER,
    borderRadius: CHECKBOX_INNER_RADIUS,
    backgroundColor: theme.brandGreen,
  },
});
