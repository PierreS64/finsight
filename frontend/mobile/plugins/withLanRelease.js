const { withAndroidManifest, withAppBuildGradle } = require('@expo/config-plugins');

// The LAN preview uses a local HTTP API and a signing key kept outside Git.
// The plugin changes generated native files only during an explicit LAN build.
module.exports = function withLanRelease(config) {
  config = withAndroidManifest(config, (current) => {
    if (process.env.FINSIGHT_LAN_PREVIEW === '1') {
      current.modResults.manifest.application[0].$['android:usesCleartextTraffic'] = 'true';
    }
    return current;
  });

  return withAppBuildGradle(config, (current) => {
    if (process.env.FINSIGHT_LAN_PREVIEW !== '1') return current;

    const signingBlock = `signingConfigs {
        finsightLanRelease {
            storeFile file(System.getenv('FINSIGHT_RELEASE_KEYSTORE_PATH'))
            storePassword System.getenv('FINSIGHT_RELEASE_KEYSTORE_PASSWORD')
            keyAlias 'finsight'
            keyPassword System.getenv('FINSIGHT_RELEASE_KEYSTORE_PASSWORD')
        }`;
    const original = current.modResults.contents;
    const withKey = original.replace('signingConfigs {', signingBlock);
    const withRelease = withKey.replace(
      /(release\s*\{[\s\S]*?signingConfig )signingConfigs\.debug/,
      '$1signingConfigs.finsightLanRelease',
    );
    if (withRelease === original || !withRelease.includes('signingConfig signingConfigs.finsightLanRelease')) {
      throw new Error('Could not configure local release signing in generated Gradle file');
    }
    current.modResults.contents = withRelease;
    return current;
  });
};
