// Dynamic Expo config.
//
// The app ships as two installable variants driven by EXPO_PUBLIC_APP_MODE
// (set per EAS build profile in eas.json: preview:owner / preview:customer):
//
//   owner    -> staff order-management build
//   customer -> shopper build (default)
//
// Android/iOS do not allow two apps with the same package/bundle id to be
// installed at once, so each variant needs its own id. Expo's eas.json does
// NOT accept android.package, so that must be set here in the app config.
//
// All shared config still lives in app.json; this file reads it as the base
// and only overrides the per-variant fields.

const base = require('./app.json').expo;

const MODE = process.env.EXPO_PUBLIC_APP_MODE; // 'owner' | 'customer' | undefined

// Per-variant identity. 'customer' is the default/original id so existing
// installs and the EAS project keep working unchanged.
const VARIANTS = {
  owner: {
    name: 'Dosa Batter Owner',
    androidPackage: 'com.dosabatter.owner',
    iosBundleId: 'com.dosabatter.owner',
  },
  customer: {
    name: 'Dosa Batter',
    androidPackage: 'com.dosabatter.app',
    iosBundleId: 'com.dosabatter.app',
  },
};

const variant = VARIANTS[MODE] ?? VARIANTS.customer;

module.exports = () => ({
  ...base,
  name: variant.name,
  android: {
    ...base.android,
    package: variant.androidPackage,
  },
  ios: {
    ...base.ios,
    bundleIdentifier: variant.iosBundleId,
  },
});
