const { IOSConfig, withDangerousMod, withXcodeProject } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');
const plist = require('@expo/plist').default;

const WIDGET_TARGET = 'ExpoWidgetsTarget';

/** Fonts referenced by `features/widget/StumblWidget.tsx`. */
const WIDGET_FONTS = [
  'assets/fonts/Monotalic-NarrowMedium.ttf',
  'assets/fonts/fonnts.com-Parabolica_Regular.otf',
  'assets/fonts/fonnts.com-Parabolica_Medium.otf',
];

function getWidgetTargetUuid(project) {
  const section = project.pbxNativeTargetSection();
  for (const [uuid, target] of Object.entries(section)) {
    if (target?.name === WIDGET_TARGET) {
      return uuid;
    }
  }
  return null;
}

function widgetHasResourcesBuildPhase(project, targetUuid) {
  const target = project.pbxNativeTargetSection()[targetUuid];
  return target?.buildPhases?.some((phase) => phase.comment === 'Resources') ?? false;
}

function ensureWidgetResourcesBuildPhase(project, targetUuid) {
  if (widgetHasResourcesBuildPhase(project, targetUuid)) {
    return;
  }
  project.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', targetUuid);
}

function withWidgetFonts(config) {
  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const platformRoot = config.modRequest.platformProjectRoot;
      const fontsDir = path.join(platformRoot, WIDGET_TARGET, 'Fonts');
      const fontBasenames = [];

      fs.mkdirSync(fontsDir, { recursive: true });

      for (const fontRel of WIDGET_FONTS) {
        const src = path.join(projectRoot, fontRel);
        const basename = path.basename(src);
        fs.copyFileSync(src, path.join(fontsDir, basename));
        fontBasenames.push(basename);
      }

      const infoPlistPath = path.join(platformRoot, WIDGET_TARGET, 'Info.plist');
      if (fs.existsSync(infoPlistPath)) {
        const info = plist.parse(fs.readFileSync(infoPlistPath, 'utf8'));
        info.UIAppFonts = Array.from(new Set([...(info.UIAppFonts ?? []), ...fontBasenames]));
        fs.writeFileSync(infoPlistPath, plist.build(info));
      }

      return config;
    },
  ]);

  config = withXcodeProject(config, (config) => {
    const project = config.modResults;
    const targetUuid = getWidgetTargetUuid(project);

    if (!targetUuid) {
      return config;
    }

    ensureWidgetResourcesBuildPhase(project, targetUuid);
    IOSConfig.XcodeUtils.ensureGroupRecursively(project, `${WIDGET_TARGET}/Fonts`);

    for (const fontRel of WIDGET_FONTS) {
      const filepath = path.join(WIDGET_TARGET, 'Fonts', path.basename(fontRel));
      IOSConfig.XcodeUtils.addResourceFileToGroup({
        filepath,
        groupName: `${WIDGET_TARGET}/Fonts`,
        project,
        isBuildFile: true,
        targetUuid,
        verbose: true,
      });
    }

    return config;
  });

  return config;
}

module.exports = withWidgetFonts;
