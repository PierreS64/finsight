# 0011 — Expo SDK 53 dependency audit

On 2026-10-24, `npm audit --omit=dev` in `frontend/mobile` reported 17 package-level findings (6 high, 11 moderate). The project remains on Expo SDK 53 and React Native 0.79.6 to meet the Android SDK 35 target. `npm audit fix --force` proposes Expo 44, which violates that target and is not a remediation.

Two scoped npm overrides remove compatible transitive findings without changing the Expo or React Native versions:

| Dependency path | Change | Verification |
| --- | --- | --- |
| `expo -> @expo/metro-config -> postcss` | 8.4.49 to 8.5.31 | Android export and Expo Doctor passed |
| `expo -> @expo/config-plugins -> xcode -> uuid` | 7.0.3 to 11.1.1 | `xcode` UUID generation, Android export and Expo Doctor passed |

After a clean `npm ci`, the production audit reports 7 package-level findings (5 high, 2 moderate). These represent three vulnerable leaf packages plus four dependent-package flags:

- `node-forge@1.4.0` is reached through `expo -> @expo/cli -> @expo/code-signing-certificates`; the audit also flags Expo, CLI and code-signing-certificates. [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv) has no patched version as of this review. The inspected Expo CLI uses it in tooling for code signing; the application does not call it for financial data or JWT verification. This is a build-tool dependency assessment, not proof of immunity for every CLI operation.
- `image-size@1.2.1` is reached through React Native's Metro bundler. [GHSA-5p2g-fcmc-qvqq](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq) and [GHSA-w3rx-r6r6-pgpr](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr) describe infinite loops in JXL, HEIF and ICNS parsers. Metro's inspected `Assets.js` calls `image-size` for its image asset list, which does not include those three formats. Version 2.0.3 fixes the advisories, but Metro 0.82.5 calls the version 1 function API; version 2 changes its CommonJS exports. A forced override would break bundling. Revisit with a compatible Metro/React Native release or a tested upstream patch.
- `query-string@7.1.3 -> decode-uri-component@0.2.2` is used by Expo Router's path handling. [GHSA-vcc3-ghjq-m6fr](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr) describes CPU exhaustion from malformed URI input; the audit also flags `query-string`. The patched decoder 0.5.x and `query-string` 10 are ESM packages, while the installed Expo Router 5 build uses CommonJS `require("query-string")`. Avoid a forced incompatible override; revisit with a compatible Expo Router release. Treat untrusted links as a remaining availability risk.

The audit includes build tooling even with `--omit=dev` because Expo and React Native depend on those tools from their production dependency graph. Findings are not evidence that the Android application executes every affected code path. Recheck advisories and dependency compatibility before release or SDK upgrades.

Verification: clean `npm ci --ignore-scripts`, `npx tsc --noEmit`, `npm run lint`, `npx expo-doctor` (18/18), `npx expo export --platform android --output-dir dist`, `xcode` UUID generation, and `npm audit --omit=dev`. The export did not install or interact with an Android emulator; no authenticated device flow was exercised for this dependency change.
