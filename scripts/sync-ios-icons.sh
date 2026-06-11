#!/usr/bin/env bash
# Keep native iOS icon/splash assets in sync with app.config.ts sources.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ICON_SRC="$ROOT/assets/icon.png"
SPLASH_SRC="$ROOT/assets/splash.png"
APP_ICON_DIR="$ROOT/ios/Stumbl/Images.xcassets/AppIcon.appiconset"
SPLASH_DIR="$ROOT/ios/Stumbl/Images.xcassets/SplashScreenLegacy.imageset"

if [[ ! -d "$ROOT/ios" ]]; then
  echo "sync-ios-icons: ios/ not found — run npm run prebuild first"
  exit 0
fi

cp "$ICON_SRC" "$APP_ICON_DIR/App-Icon-1024x1024@1x.png"

# Splash legacy imageset expects phone-sized assets; center the square mark on brand green.
magick -size 1284x2778 'xc:#148240' \
  \( "$SPLASH_SRC" -resize 900x900 \) \
  -gravity center -composite \
  "$SPLASH_DIR/image.png"
cp "$SPLASH_DIR/image.png" "$SPLASH_DIR/image@2x.png"
cp "$SPLASH_DIR/image.png" "$SPLASH_DIR/image@3x.png"

echo "sync-ios-icons: updated AppIcon and SplashScreenLegacy from assets/"
