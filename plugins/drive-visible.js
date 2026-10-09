// Lets MuseBook see whether the Google Drive app is on the phone (Android 11+
// hides other apps unless the manifest names them). Used by the restore
// screen's "Open Google Drive" button.
const { withAndroidManifest } = require("expo/config-plugins");

const DRIVE = "com.google.android.apps.docs";

module.exports = (config) =>
  withAndroidManifest(config, (c) => {
    const m = c.modResults.manifest;
    m.queries = m.queries || [{}];
    const q = m.queries[0];
    q.package = q.package || [];
    if (!q.package.some((p) => p.$["android:name"] === DRIVE)) q.package.push({ $: { "android:name": DRIVE } });
    return c;
  });
