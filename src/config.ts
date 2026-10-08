import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Expo inlines EXPO_PUBLIC_* vars into process.env at build time. Declare the
// minimal shape so TypeScript knows about it without pulling in @types/node.
declare const process: { env: { EXPO_PUBLIC_API_URL?: string; EXPO_PUBLIC_APP_MODE?: string } };

// Production builds read the backend URL from app.json -> expo.extra.apiUrl.
// Set this to your deployed public HTTPS backend (e.g. the Render service in
// server/render.yaml) so the installed Android/iOS app can reach it over the
// internet, not just on the local network.
const extraApiUrl = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)
  ?.apiUrl;

// Still-unset placeholder from the template. Treated as "not configured".
const PLACEHOLDER = 'REPLACE-WITH-YOUR-BACKEND-URL';

// Base URL of the payments backend (the server/ folder).
//
// Override at build/run time with EXPO_PUBLIC_API_URL, e.g.
//   EXPO_PUBLIC_API_URL=https://your-backend.onrender.com npm run start
//
// Local-dev defaults (only used when no public/env URL is configured):
//  - web / iOS simulator / desktop: localhost
//  - Android emulator: 10.0.2.2 maps to the host machine's localhost
//  - physical device: whatever host Expo already used to serve the bundle
const DEFAULT_PORT = 4000;

// Whether this JS is running in a packaged/standalone build (installed app)
// rather than Expo Go / a dev server. In a real build there is no dev host to
// fall back to, so a missing public URL is a hard misconfiguration.
const IS_STANDALONE = Constants.executionEnvironment === 'standalone';

// Host that Expo used to deliver this bundle (e.g. "192.168.1.20:8081" on a
// physical device, "localhost:8081" on web). Lets a real phone on the same
// Wi-Fi reach a dev server without hardcoding a LAN IP.
function devServerHost(): string | undefined {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    // Older/alternate field used by some Expo runtimes.
    (Constants as unknown as { expoGoConfig?: { hostUri?: string } }).expoGoConfig
      ?.hostUri;
  return hostUri?.split(':')[0];
}

function defaultBaseUrl(): string {
  // Prefer the real dev-server host on a physical device; this is the address
  // the phone is already successfully talking to for the JS bundle.
  const devHost = devServerHost();
  if (devHost && devHost !== 'localhost' && devHost !== '127.0.0.1') {
    return `http://${devHost}:${DEFAULT_PORT}`;
  }
  const host = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  // 10.0.2.2 only works on the Android emulator; on a real phone it is a dead
  // end. If we reach here on a device it means the Expo dev-server host could
  // not be detected - start Expo with REACT_NATIVE_PACKAGER_HOSTNAME=<LAN IP>
  // or set EXPO_PUBLIC_API_URL to the backend URL.
  if (Platform.OS === 'android' && host === '10.0.2.2') {
    console.warn(
      '[config] Falling back to 10.0.2.2 (Android emulator only). On a real ' +
        'device set EXPO_PUBLIC_API_URL=http://<your-LAN-IP>:4000 or start ' +
        'Expo with REACT_NATIVE_PACKAGER_HOSTNAME=<your-LAN-IP>.'
    );
  }
  return `http://${host}:${DEFAULT_PORT}`;
}

function isUsablePublicUrl(url: string | undefined): url is string {
  if (!url) return false;
  if (url.includes(PLACEHOLDER)) return false;
  return /^https?:\/\//.test(url);
}

// Resolution order:
//  1. EXPO_PUBLIC_API_URL env var (handy for dev / LAN / CI overrides)
//  2. app.json expo.extra.apiUrl (the public URL used by production builds)
//  3. localhost / emulator / dev-host default (local development only)
function resolveBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
  if (isUsablePublicUrl(envUrl)) return envUrl;

  const configured = extraApiUrl?.replace(/\/$/, '');
  if (isUsablePublicUrl(configured)) {
    // Android release builds block cleartext (http) traffic by default, and
    // payment redirects require TLS. Warn loudly if a non-HTTPS public URL is
    // shipped so it is caught before it fails silently on-device.
    if (IS_STANDALONE && configured.startsWith('http://')) {
      console.warn(
        `[config] API_BASE_URL is http:// in a release build (${configured}). ` +
          'Android blocks cleartext traffic; use an https:// URL.'
      );
    }
    return configured;
  }

  // No public URL configured. In a packaged build there is nothing to reach
  // over the internet, so make the failure explicit rather than silently
  // pointing at localhost (which is the device itself).
  if (IS_STANDALONE) {
    console.error(
      '[config] No public backend URL set. Set expo.extra.apiUrl in app.json ' +
        '(or EXPO_PUBLIC_API_URL) to your deployed https:// backend.'
    );
  }

  return defaultBaseUrl();
}

export const API_BASE_URL = resolveBaseUrl();

// Feature flag: PayPal is temporarily disabled so the app offers Stripe (card)
// and cash only. All PayPal code, the PayPalButton component, and the server
// endpoints are left intact; flip this back to true to re-enable the option in
// the payment UI.
export const PAYPAL_ENABLED = false;

// 'owner' | 'customer' | undefined (undefined = both roles available, dev mode)
export const APP_MODE = (process.env.EXPO_PUBLIC_APP_MODE as 'owner' | 'customer' | undefined) ?? undefined;

// Origin of the web app itself. Used to build Stripe return URLs on web so the
// buyer is sent back to THIS web app (where StripeReturnHandler processes the
// result) - not to the backend API.
//
// The only reliable source for that is the browser's own location.origin: it
// is localhost:8081 in dev and the deployed web origin in production. Deriving
// it from API_BASE_URL was wrong once the backend lived on its own HTTPS domain
// (Render) - it sent buyers to the backend, which has no "/" page and responds
// "Cannot GET /". Native builds don't use this (they use a deep link instead).
declare const window: { location?: { origin?: string } } | undefined;

function resolveWebAppUrl(): string {
  const origin =
    typeof window !== 'undefined' ? window?.location?.origin : undefined;
  if (origin) return origin.replace(/\/$/, '');
  // Fallback for non-browser contexts: reuse the dev host on :8081. (Not used
  // on native, which builds Stripe return URLs via Linking.createURL.)
  return API_BASE_URL.replace(/:\d+$/, ':8081');
}

export const WEB_APP_URL = resolveWebAppUrl();
