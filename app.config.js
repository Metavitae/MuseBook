// One code, two apps. Plain build: Moonbook (the founder's own, never sends anything).
// MB_TESTER=1: "Moonbook Test" for the Kithe VIP Circle testers (invite code, daily
// numbers report, "Tell us what you think"). Its own app id, so the two never mix.
// On GitHub each build numbers itself, so Android always sees a newer version.
const base = require("./app.json").expo;
const tester = process.env.MB_TESTER === "1";
const run = Number(process.env.GITHUB_RUN_NUMBER || 0);

module.exports = {
  expo: {
    ...base,
    name: tester ? "Moonbook Test" : base.name,
    version: run ? `0.2.${run}` : base.version,
    android: {
      ...base.android,
      package: base.android.package + (tester ? ".tester" : ""),
      versionCode: Math.max(1, run),
    },
  },
};
