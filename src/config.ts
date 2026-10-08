import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Expo inlines EXPO_PUBLIC_* vars into process.env at build time. Declare the
// minimal shape so TypeScript knows about it without pulling in @types/node.
declare const process: { env: { EXPO_PUBLIC_API_URL?: string } };

// Production builds read the backend URL from app.json -> expo.extra.apiUrl.
// (A placeholder today; set it to your deployed HTTPS backend before shipping.)
const extraApiUrl = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)
  ?.apiUrl;

// Base URL of the PayPal backend (the server/ folder).
//
// Override at build time with EXPO_PUBLIC_API_URL, e.g.
//   EXPO_PUBLIC_API_URL=http://192.168.1.20:4000 npm run start
//
// Defaults:
//  - web / iOS simulator / desktop: localhost
//  - Android emulator: 10.0.2.2 maps to the host machine's localhost
const DEFAULT_PORT = 4000;

function defaultBaseUrl(): string {
  const host = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  return `http://${host}:${DEFAULT_PORT}`;
}

// Resolution order:
//  1. EXPO_PUBLIC_API_URL env var (handy for dev / LAN testing)
//  2. app.json expo.extra.apiUrl (set this for production builds)
//  3. localhost / emulator default
function resolveBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
  if (envUrl) return envUrl;

  const configured = extraApiUrl?.replace(/\/$/, '');
  if (configured && !configured.includes('REPLACE-WITH-YOUR-BACKEND-URL')) {
    return configured;
  }

  return defaultBaseUrl();
}

export const API_BASE_URL = resolveBaseUrl();

// Origin of the web app itself (Expo serves it on port 8081 at the same host as
// the backend). Used to build Stripe return URLs so the buyer comes back to the
// LAN address rather than "localhost" (which on a phone is the phone itself).
export const WEB_APP_URL = API_BASE_URL.replace(/:\d+$/, ':8081');
