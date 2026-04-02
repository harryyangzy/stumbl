import { StyleSheet, TextInput, View } from 'react-native';

import { theme } from '@/lib/theme';

type Props = {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
};

export function SearchField({ value, onChangeText, placeholder }: Props) {
  return (
    <View style={styles.wrap}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        style={styles.input}
        autoCorrect={false}
        autoCapitalize="words"
        returnKeyType="search"
      />
      <View style={styles.iconSlot}>
        <View style={styles.magnifier} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  input: {
    flex: 1,
    fontSize: theme.body,
    color: theme.textPrimary,
    paddingVertical: theme.spaceSm,
  },
  iconSlot: {
    padding: theme.spaceXs,
  },
  magnifier: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: theme.textSecondary,
  },
});
