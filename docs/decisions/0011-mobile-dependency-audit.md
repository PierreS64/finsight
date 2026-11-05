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

## 2026-10-25 recheck and integration decision

`npm audit --omit=dev --json` still reports seven mobile package-level findings (five high, two moderate) across the same three leaf packages and their dependent flags; the web production audit reports zero. GitHub Actions Backend, Web and Mobile all passed for both the push and draft PR workflows on exact head `f1b58b8`. The GitHub advisories still list no patched `node-forge` release, `image-size` 2.0.3 as its fix, and `decode-uri-component` 0.5.0 as its fix. The compatibility constraints above still apply to Expo SDK 53, so no additional override was made.

The dependency assessment is complete for FNS-50, but this is a documented residual availability/integrity risk, not a zero-vulnerability release claim. Keep PR #1 as a draft while Phase 7 Android, recovery-email and signed-in workflow acceptance is incomplete. Reassess these packages before a production release or a compatible Expo/React Native upgrade. The local Jenkins build has not been rerun on `f1b58b8`; its last passing build #4 predates the dependency overrides.

## 2026-11-04 development-client recheck

The stable Android recovery redirect added `expo-dev-client@5.2.4`. A clean `npm ci --ignore-scripts` and `npm audit --omit=dev` initially reported 36 package-level findings (4 high, 31 moderate, 1 low). `node-forge` was locked at 1.4.0 under Expo CLI even though its compatible `^1.3.3` range allows 1.4.3. Updating only that lockfile entry to 1.4.3 reduced the production audit to 35 (3 high, 31 moderate, 1 low). Mobile TypeScript, lint, Expo Doctor (18/18) and Android export passed after the change.

The remaining high-severity leaf packages are `image-size@1.2.1` through Metro and `decode-uri-component@0.2.2` through `query-string@7.1.3`. The `image-size` 2.x fix changes the API used by Metro 0.82.5, so forcing it would break the existing bundle path. `decode-uri-component` is fixed in 0.5.1, outside the `query-string` 7 dependency range. Removing the apparently unused direct `query-string` dependency caused Android export to fail because Expo Router 5.1.11 calls `require("query-string")` without declaring it; it was restored, and export passed. The new high-severity decoder advisory is [GHSA-qr28-fpjm-wq7f](https://github.com/advisories/GHSA-qr28-fpjm-wq7f). Treat arbitrary untrusted links as a remaining availability risk and revisit the router/decoder pair together.

The moderate/low findings include `ajv@8.11.0` pinned by `expo-dev-launcher`, `glob@10.5.0` and `minimatch@9.0.9` through build tooling, and `deepmerge@4.3.1` through Expo configuration. The first three need a forced override or major dependency change to reach a patched version; `deepmerge` has no patched release in the current audit. No forced change was made without a compatible Expo SDK 53 validation path. The audit's dependent-package flags amplify these leaf advisories into 35 package-level findings, not 35 independent vulnerabilities. This is a demo dependency assessment, not a claim that the remaining advisories are resolved.
