import { Platform, StyleSheet, TextInput, View } from 'react-native';

import { SearchIcon } from '@/components/icons/SearchIcon';
import { theme } from '@/lib/theme';

type Props = {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  /** Inside a parent card: no outer border, only bottom divider. */
  embedded?: boolean;
  /** Pill shape, 1px black border, 8px vertical padding, SVG search icon (standalone). */
  pillOutline?: boolean;
  /** Top section inside a parent unified card: no outer border, divider below, 8px vertical padding + SVG icon. */
  unifiedTop?: boolean;
};

const inputAutofillOff = {
  autoComplete: 'off' as const,
  textContentType: 'none' as const,
  spellCheck: false,
  ...(Platform.OS === 'android' ? { importantForAutofill: 'no' as const } : {}),
};

const iosNoSmartText =
  Platform.OS === 'ios'
    ? { smartDashesType: 'no' as const, smartQuotesType: 'no' as const }
    : {};

export function SearchField({
  value,
  onChangeText,
  placeholder,
  embedded,
  pillOutline,
  unifiedTop,
}: Props) {
  if (unifiedTop) {
    return (
      <View style={styles.wrapUnifiedTop}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.grey}
          style={styles.inputPillOutline}
          autoCorrect={false}
          autoCapitalize="words"
          returnKeyType="search"
          {...inputAutofillOff}
        />
        <View style={styles.iconSlotPill} pointerEvents="none">
          <SearchIcon size={18} color={theme.grey} />
        </View>
      </View>
    );
  }

  if (pillOutline) {
    return (
      <View style={styles.wrapPillOutline}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.grey}
          style={styles.inputPillOutline}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          {...inputAutofillOff}
          {...iosNoSmartText}
        />
        <View style={styles.iconSlotPill} pointerEvents="none">
          <SearchIcon size={18} color={theme.grey} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, embedded && styles.wrapEmbedded]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.grey}
        style={styles.input}
        autoCorrect={false}
        autoCapitalize="words"
        returnKeyType="search"
        {...inputAutofillOff}
      />
      <View style={styles.iconSlot}>
        <View style={styles.magnifier} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapUnifiedTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingLeft: theme.spaceMd,
    paddingRight: theme.spaceSm,
    minHeight: 40,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.black,
  },
  wrapPillOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spaceSm,
    borderRadius: theme.radiusPill,
    borderWidth: 1,
    borderColor: theme.black,
    backgroundColor: theme.white,
    paddingVertical: 8,
    paddingLeft: theme.spaceMd,
    paddingRight: theme.spaceSm,
    minHeight: 40,
  },
  inputPillOutline: {
    flex: 1,
    fontFamily: theme.fonts.body,
    fontSize: theme.body,
    color: theme.textPrimary,
    paddingVertical: 0,
  },
  iconSlotPill: {
    paddingLeft: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.radiusMd,
    borderWidth: 1,
    borderColor: theme.borderSubtle,
    backgroundColor: theme.white,
    paddingLeft: theme.spaceMd,
    paddingRight: theme.spaceSm,
    minHeight: 52,
  },
  wrapEmbedded: {
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.borderSubtle,
  },
  input: {
    flex: 1,
    fontFamily: theme.fonts.body,
    fontSize: theme.body,
    color: theme.textPrimary,
    paddingVertical: 14,
  },
  iconSlot: {
    padding: theme.spaceXs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  magnifier: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: theme.grey,
  },
});
