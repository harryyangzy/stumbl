const path = require('path');

module.exports = function (api) {
  const useWidgetStub = process.env.EXPO_NO_WIDGETS === '1';
  api.cache(() => useWidgetStub);

  const plugins = [];

  if (useWidgetStub) {
    plugins.push([
      'module-resolver',
      {
        root: [path.resolve(__dirname)],
        alias: {
          'expo-widgets': path.resolve(__dirname, 'stubs/expo-widgets.ts'),
        },
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      },
    ]);
  }

  plugins.push('react-native-worklets/plugin');

  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    plugins,
  };
};
