import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { colors } from '../theme';
import { API_BASE_URL } from '../config';
import type { PayPalButtonProps } from './PayPalButton.types';

// Native (iOS/Android) PayPal login requires either the PayPal JS SDK inside a
// WebView or a browser redirect flow with a deep-link return URL. That needs
// extra native setup (deep linking + a return route), so on native we point the
// buyer at the web checkout, which has the full PayPal login popup wired up.
//
// This keeps the app honest: it does not fake a native charge.

// The web app runs on port 8081 at the same host as the backend API. Deriving
// it from API_BASE_URL means it uses the machine's LAN IP, not "localhost"
// (which on a phone would point at the phone itself).
const WEB_CHECKOUT_URL = API_BASE_URL.replace(/:\d+$/, ':8081');

export default function PayPalButton({ onCancel }: PayPalButtonProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Pay with PayPal</Text>
      <Text style={styles.body}>
        PayPal login runs in the web version of this app. Open it in a browser
        to log into your PayPal account and pay. On this device you can still
        choose Card or Cash on pickup.
      </Text>
      <TouchableOpacity
        style={styles.link}
        onPress={() => Linking.openURL(WEB_CHECKOUT_URL)}
      >
        <Text style={styles.linkText}>Open web checkout</Text>
      </TouchableOpacity>
      {onCancel && (
        <TouchableOpacity onPress={onCancel} style={styles.cancel}>
          <Text style={styles.cancelText}>Choose another method</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  title: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 6 },
  body: { fontSize: 13, color: colors.muted, lineHeight: 19 },
  link: {
    marginTop: 12,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  linkText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  cancel: { marginTop: 10, alignItems: 'center' },
  cancelText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
});
