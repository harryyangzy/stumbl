const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('txt');

config.watchFolders = [...(config.watchFolders ?? []), path.resolve(__dirname, 'data')];

/** NativeWind / css-interop wraps `resolveRequest`; stub must run *after* that so it is the outermost check. */
const withWind = withNativeWind(config, { input: './global.css' });

const expoWidgetsStub = path.resolve(__dirname, 'stubs/expo-widgets.ts');
const innerResolveRequest = withWind.resolver.resolveRequest;

withWind.resolver.resolveRequest = (context, moduleName, platform) => {
  if (process.env.EXPO_NO_WIDGETS === '1' && moduleName === 'expo-widgets') {
    return { type: 'sourceFile', filePath: expoWidgetsStub };
  }
  if (innerResolveRequest) {
    return innerResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withWind;
