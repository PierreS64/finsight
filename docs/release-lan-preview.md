# FinSight LAN preview release

This package is for a private demo on one Windows PC and an Android phone on the same Wi-Fi network. The phone runs an embedded JavaScript bundle without Metro, Expo Go, USB reverse, Docker or WSL. The PC runs the packaged Spring Boot JAR and serves the static web build. It is not an Internet or Google Play deployment.

## Build on the release PC

From the repository root in PowerShell, verify the normal backend, web and mobile checks in `README.md`. Keep the existing private `.env`, `frontend/web/.env.local` and `frontend/mobile/.env.local` on this PC. The web build uses `http://127.0.0.1:8086`; the Android build uses the PC's current Wi-Fi IPv4 address. The example below uses `192.168.1.67` and must be changed if the address changes.

```powershell
Set-Location backend
.\mvnw.cmd -B -ntp verify
Set-Location ..\frontend\web
npm run lint
npm run build
Set-Location ..\mobile
npx tsc --noEmit
npm run lint
npx expo-doctor
Set-Location ..\..
powershell -ExecutionPolicy Bypass -File .\scripts\build-lan-android.ps1 -ApiHost 192.168.1.67
powershell -ExecutionPolicy Bypass -File .\scripts\package-lan-preview.ps1 -ApiHost 192.168.1.67
```

`build-lan-android.ps1` uses the locally backed-up signing material in `.secrets/release-signing/`. It regenerates the ignored Android project through Expo Prebuild and signs the release APK with that key. The first signing key was generated on 2026-11-09; its password and keystore are excluded from Git and the ZIP. Back up both securely. An Android update for `com.finsight.app` needs the same key. The package script refuses to overwrite an existing release directory or ZIP.

## Run the package

Unzip `FinSight-1.0.0-rc.1-LAN.zip`. Keep the private `.env` outside the ZIP and start the API in one terminal:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-api.ps1 -EnvFile D:\Codes\finsight\.env
```

Start the web server in another terminal:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-web.ps1
```

Open `http://127.0.0.1:5173/` on the PC. Install `FinSight-Android.apk` on the phone, join the same Wi-Fi and verify `http://192.168.1.67:8086/actuator/health` is reachable in the phone browser. If the phone cannot reach the API, allow inbound TCP 8086 only on the Windows **Private** network profile. The API requires Supabase JWTs for financial endpoints. Stop both foreground processes with Ctrl+C; the package does not start WSL.

Android stores the API URL at build time. If the PC's IP changes, rebuild the APK with the new `-ApiHost` and create a new package version. Keep the PC web on `127.0.0.1:5173`, which matches the current Supabase Auth redirect allowlist.

## Release boundaries

- The package contains no private `.env`, signing key, database password, OpenAI key or financial records. The Supabase publishable key is a public client value and is embedded in the client builds.
- The Android preview permits cleartext HTTP so it can reach the local API. Use HTTPS and remove this LAN-only setting before a public Internet release.
- The Android build uses Expo SDK 53 and Android SDK 35. The current `npm audit --omit=dev` still reports 22 package-level flags (3 high, 18 moderate, 1 low); see [ADR 0011](decisions/0011-mobile-dependency-audit.md) for the affected dependency paths and earlier compatibility assessment. Reassess them before a public store submission.
- The old development app has package ID `com.anonymous.finsight`; this signed preview uses `com.finsight.app`. Both can be installed, but Android may ask which FinSight app should open an authentication link.

Android's [command-line signing guide](https://developer.android.com/build/building-cmdline) describes release keys and APK verification. Expo's [APK guide](https://docs.expo.dev/build-reference/apk/) distinguishes directly installable APKs from Play Store AABs.
