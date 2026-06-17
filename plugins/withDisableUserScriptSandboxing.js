const { withXcodeProject } = require('expo/config-plugins');

/**
 * CocoaPods "[CP] Copy Pods Resources" writes to Pods/resources-to-copy-*.txt.
 * With ENABLE_USER_SCRIPT_SANDBOXING=YES (Xcode default), Release archives fail for
 * app extensions such as ExpoWidgetsTarget.
 */
function withDisableUserScriptSandboxing(config) {
  return withXcodeProject(config, (config) => {
    const configurations = config.modResults.pbxXCBuildConfigurationSection();
    for (const key of Object.keys(configurations)) {
      const entry = configurations[key];
      if (entry?.buildSettings) {
        entry.buildSettings.ENABLE_USER_SCRIPT_SANDBOXING = 'NO';
      }
    }
    return config;
  });
}

module.exports = withDisableUserScriptSandboxing;
