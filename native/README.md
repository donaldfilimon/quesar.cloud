# Native shell (Capacitor)

Copied from `donaldfilimon/MLAI-CORPORATION-WWW` at `b6f3686b7316b1afcc5c780611c47f51750a26ae`
on 2026-09-22 (committed files only, via `git archive`):

| mlai path | here |
|---|---|
| `apps/mlai/capacitor.config.json` | `capacitor.config.json` (changed, see below) |
| `apps/mlai/android/` | `android/` (unchanged) |
| `packages/capacitor-cloudkit/` (`@mlai/capacitor-cloudkit`) | `capacitor-cloudkit/` (unchanged) |

mlai never tracked an `ios/` project, so there is none here.

## What changed: the shell loads the deployed site

In mlai the shell bundled a static copy of the Next build
(`webDir: capacitor/www`, staged by `apps/mlai/scripts/stage-capacitor-www.ts`).
quesar.cloud is a server-rendered TanStack Start app with server functions and
auth, so a static bundle cannot run it. The shell now points at the deployed
site instead:

```json
"server": { "url": "https://quesar.cloud", "cleartext": false }
```

**Assumption:** `https://quesar.cloud` is the production URL. Change
`server.url` in `capacitor.config.json` if it is not, or to a LAN/preview URL
for testing. `webDir` is `www/`, holding only a one-line offline notice, because
the Capacitor CLI requires a web directory to exist; it is not the app.
The staging script was not copied: there is nothing to stage.

## State: not built, not synced

- `bunx cap sync` was **not** run. The Android project still carries the files
  `cap sync` generated inside mlai: `android/capacitor.settings.gradle` points
  at mlai's Bun store (`../../../node_modules/.bun/...`) and at
  `../../../packages/capacitor-cloudkit/android`. Those paths do not resolve
  here. The copied `android/app/src/main/assets/` config is gitignored, so the
  new `server.url` reaches Android only after a sync.
- **Dependencies live in `native/package.json`**, separate from the root npm
  build so the web app never installs Capacitor. The versions are mlai's pins:
  `@capacitor/{core,android,ios,cli}` `^7.4.3`, `@capacitor-community/apple-sign-in`
  `^7.1.0`, `capacitor-secure-storage-plugin` `0.12.0`, and the CloudKit plugin as
  `file:./capacitor-cloudkit`. To build:

  ```bash
  cd native && bun install && bun run sync:android && bun run open:android
  ```

  The sync rewrites `android/capacitor.settings.gradle` to this directory's
  `node_modules`. Neither the install nor the sync has been run here, and they
  are unmeasured.
- **iOS is blocked:** `bunx cap add ios` needs CocoaPods, which is not
  installed on this machine. `capacitor-cloudkit/ios/` holds the Swift plugin
  source only.

## What the CloudKit plugin does

`@mlai/capacitor-cloudkit` exposes `isAvailable()` and `getAccountStatus()`.
On Android it reports unavailable. A green web gate never proved signed-device
CloudKit sync in mlai, and it does not here.
