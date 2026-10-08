# Building the Dosa Batter app for Android

The app is build-ready via **EAS Build** (Expo's cloud builder). You do not need
Android Studio or a Mac; EAS compiles in the cloud.

All commands assume Node 20 on PATH:

```bash
export PATH="$HOME/.local/node20/bin:$PATH"
cd dosa-batter-app
```

## One-time setup

1. **Expo account** (free): https://expo.dev/signup
2. Log in the CLI (interactive - enter your own credentials):
   ```bash
   npx eas login
   ```
3. Link the project (creates an EAS project id):
   ```bash
   npx eas init
   ```

## IMPORTANT: point the app at a public backend first

Edit `app.json` -> `expo.extra.apiUrl` and set it to your **deployed** backend's
HTTPS URL (the `server/` folder running somewhere public). The app will NOT work
in a release build while this is the placeholder or a LAN IP like
`http://192.168.x.x:4000`, because a published app cannot reach your laptop.

For a quick personal test you can instead run the build with an env override:
```bash
EXPO_PUBLIC_API_URL=https://your-backend.example.com npx eas build ...
```

## Option A - sideloadable APK (no store, no account fee)

Fastest way to install on any Android phone directly.

```bash
npx eas build --platform android --profile preview
```

- EAS builds an **.apk** in the cloud and gives you a download link + QR code.
- On the Android phone: open the link, download, tap the APK, allow
  "install from unknown sources", install. Done - no Play Store involved.

## Option B - Google Play Store (.aab)

Needs a **Google Play Developer account** ($25 one-time):
https://play.google.com/console/signup

1. Build the Play bundle:
   ```bash
   npx eas build --platform android --profile production
   ```
   This produces an **.aab** (Android App Bundle).

2. Submit it. Two ways:
   - **Manual:** download the `.aab` and upload it in Play Console
     (Create app -> Production -> Create release -> upload).
   - **Automated with EAS:** create a Play service-account key JSON (Play Console
     -> Setup -> API access), save it as `play-service-account.json` in this
     folder (it is gitignored), then:
     ```bash
     npx eas submit --platform android --profile production
     ```
     (The `submit.production.android` block in `eas.json` points at that file and
     the `internal` test track.)

3. In Play Console, complete the listing: app name, description, screenshots,
   icon, privacy policy URL, content rating, and data-safety form, then roll the
   release out (internal testing -> production).

## Notes / honest caveats

- **New Google Play personal developer accounts** currently must run a closed
  test with ~12+ testers for ~14 days before they can publish to production.
- Before taking **real money**: switch Stripe to live keys, deploy the backend
  with a database + Stripe webhooks, and recompute order totals server-side.
- Payment methods (Stripe/PayPal) are allowed because dosa batter is a
  **physical** product with pickup. Present it that way in the listing.
- iOS (App Store) uses the same tooling: `npx eas build --platform ios` and
  `npx eas submit --platform ios`, but requires an Apple Developer account
  ($99/year).
