import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BackIcon } from '@/components/icons/BackIcon';
import { theme } from '@/lib/theme';

export type EditSheetLine = {
  routeId: string;
  shortName: string;
  label: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  lines: EditSheetLine[];
  walkingMinutes: number;
  bufferMinutes: number;
  stopName: string;
  onEditLines: () => void;
  onEditWalking: () => void;
  onEditBuffer: () => void;
  onEditStop: () => void;
};

/** "1:00" style label from fractional minutes. */
function formatClock(minutes: number): string {
  const totalSec = Math.max(0, Math.round(minutes * 60));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function ChevronRight() {
  return <BackIcon color={theme.black} style={styles.chevron} />;
}

/** Slide-up sheet on the widget preview page for reviewing/editing the commute setup. */
export function EditWidgetSheet({
  visible,
  onClose,
  lines,
  walkingMinutes,
  bufferMinutes,
  stopName,
  onEditLines,
  onEditWalking,
  onEditBuffer,
  onEditStop,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTouch} onPress={onClose} accessibilityLabel="Close edit widget" />
        <View style={styles.sheet}>
          <Pressable onPress={onClose} hitSlop={16} style={styles.handleSlot}>
            <View style={styles.handle} />
          </Pressable>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <Pressable onPress={onEditLines} hitSlop={8} style={styles.headerRow}>
                <Text style={styles.headerText}>Transit Lines</Text>
                <ChevronRight />
              </Pressable>
              <View style={styles.lineList}>
                {lines.map((l) => (
                  <Pressable key={l.routeId} onPress={onEditLines} style={styles.lineRow}>
                    <View style={styles.lineBadge}>
                      <Text style={styles.lineBadgeText}>{l.shortName}</Text>
                    </View>
                    <Text style={styles.lineLabel} numberOfLines={1}>
                      {l.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Pressable onPress={onEditWalking} hitSlop={8} style={styles.headerRow}>
                <Text style={styles.headerText}>Travel Times</Text>
                <ChevronRight />
              </Pressable>
              <View style={styles.timeTable}>
                <Pressable onPress={onEditWalking} style={styles.timeRow}>
                  <View style={styles.timeBadge}>
                    <Text style={styles.timeBadgeText}>{formatClock(walkingMinutes)}</Text>
                  </View>
                  <Text style={styles.timeLabel} numberOfLines={1}>
                    to stop
                  </Text>
                </Pressable>
                <Pressable onPress={onEditBuffer} style={styles.timeRow}>
                  <View style={styles.timeBadge}>
                    <Text style={styles.timeBadgeText}>{formatClock(bufferMinutes)}</Text>
                  </View>
                  <Text style={styles.timeLabel} numberOfLines={1}>
                    between stop buffer
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.section}>
              <Pressable onPress={onEditStop} hitSlop={8} style={styles.headerRow}>
                <Text style={styles.headerText}>{stopName}</Text>
                <ChevronRight />
              </Pressable>
              <Text style={styles.stopRole}>Primary Stop</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  backdropTouch: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    height: '90%',
    backgroundColor: theme.white,
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: theme.grey,
    paddingTop: 12,
    overflow: 'hidden',
  },
  handleSlot: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  handle: {
    width: 114,
    height: 6,
    borderRadius: theme.radiusPill,
    backgroundColor: '#D9D9D9',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 32,
    paddingHorizontal: 40,
    paddingBottom: 40,
    gap: 46,
  },
  section: {
    alignSelf: 'stretch',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  headerText: {
    fontFamily: theme.fonts.heading,
    fontSize: 18,
    color: theme.black,
  },
  chevron: {
    transform: [{ rotate: '180deg' }],
  },
  lineList: {
    marginTop: 10,
    gap: 5,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.white,
    borderWidth: 1,
    borderColor: theme.grey,
    borderRadius: 17,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  lineBadge: {
    backgroundColor: theme.yellow,
    paddingHorizontal: 4,
  },
  lineBadgeText: {
    fontFamily: theme.fonts.body,
    fontSize: 16,
    color: theme.black,
  },
  lineLabel: {
    fontFamily: theme.fonts.body,
    fontSize: 16,
    color: theme.black,
    flexShrink: 1,
  },
  timeTable: {
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.4)',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.4)',
  },
  timeBadge: {
    backgroundColor: theme.yellow,
    paddingHorizontal: 6,
  },
  timeBadgeText: {
    fontFamily: theme.fonts.heading,
    fontSize: 16,
    color: theme.black,
  },
  timeLabel: {
    fontFamily: theme.fonts.body,
    fontSize: 16,
    color: theme.black,
    flexShrink: 1,
  },
  stopRole: {
    marginTop: 2,
    fontFamily: theme.fonts.body,
    fontSize: 16,
    color: theme.black,
  },
});
