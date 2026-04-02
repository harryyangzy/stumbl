const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('txt');

config.watchFolders = [...(config.watchFolders ?? []), path.resolve(__dirname, 'data')];

module.exports = withNativeWind(config, { input: './global.css' });
