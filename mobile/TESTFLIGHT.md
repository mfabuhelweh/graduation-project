# TestFlight Release

This Expo app is configured for an iOS TestFlight build with the `testflight` EAS profile.

## Prerequisites

1. An Expo account logged in with `npx eas login`
2. An Apple Developer account with access to App Store Connect
3. The iOS bundle identifier in `app.json` must stay unique:
   - `com.graduationproject.votesecurevoter`

## Build for TestFlight

From `mobile/` run:

```bash
npm run testflight:build
```

This creates an iOS store build using the `testflight` profile in `eas.json`.

## Submit to TestFlight

After the build finishes, run:

```bash
npm run testflight:submit
```

If this is the first App Store Connect submission, EAS may ask for Apple credentials and app metadata.

## Current release settings

- App version: `1.0.0`
- iOS build number starts at `1`
- `autoIncrement` is enabled for TestFlight builds

## Useful notes

- Update `expo.version` in `app.json` when you want a new app version visible in App Store Connect.
- `ios.buildNumber` will increment automatically on each TestFlight build.
- To inspect build status, use `npx eas build:list --platform ios`.
