import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import {
  capturePayPalOrder,
  createPayPalOrder,
  fetchPayPalConfig,
} from '../data/paypalApi';
import { colors } from '../theme';
import type { PayPalButtonProps } from './PayPalButton.types';

// Keep one SDK load in flight / cached across mounts.
let sdkPromise: Promise<any> | null = null;

function loadPayPalSdk(clientId: string, currency: string): Promise<any> {
  if (typeof document === 'undefined') {
    return Promise.reject(new Error('PayPal SDK requires a browser.'));
  }
  const w = window as any;
  if (w.paypal) return Promise.resolve(w.paypal);
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
      clientId
    )}&currency=${encodeURIComponent(currency)}&intent=capture`;
    script.async = true;
    script.onload = () => {
      if ((window as any).paypal) resolve((window as any).paypal);
      else reject(new Error('PayPal SDK loaded but window.paypal is missing.'));
    };
    script.onerror = () => reject(new Error('Failed to load the PayPal SDK.'));
    document.body.appendChild(script);
  });
  return sdkPromise;
}

export default function PayPalButton({
  amount,
  onPaid,
  onError,
  onCancel,
}: PayPalButtonProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Latest amount, so the SDK callbacks always read the current total.
  const amountRef = useRef(amount);
  amountRef.current = amount;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const cfg = await fetchPayPalConfig();
        if (!cfg.clientId || cfg.clientId.startsWith('your-')) {
          throw new Error(
            'PayPal is not configured on the server. Add real sandbox credentials to server/.env.'
          );
        }
        const paypal = await loadPayPalSdk(cfg.clientId, cfg.currency || 'EUR');
        if (cancelled || !containerRef.current) return;

        paypal
          .Buttons({
            style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' },
            // Ask our server to create the order (price lives server-side).
            createOrder: async () => {
              const order = await createPayPalOrder(amountRef.current);
              return order.id;
            },
            // After the buyer logs in and approves, capture on our server.
            onApprove: async (data: { orderID: string }) => {
              try {
                const result = await capturePayPalOrder(data.orderID);
                if (result.status === 'COMPLETED') {
                  onPaid(result.captureId);
                } else {
                  onError(`Payment not completed (status: ${result.status}).`);
                }
              } catch (e: any) {
                onError(e?.message ?? 'Capture failed.');
              }
            },
            onCancel: () => onCancel?.(),
            onError: (err: any) => onError(err?.message ?? 'PayPal error.'),
          })
          .render(containerRef.current);

        if (!cancelled) setLoading(false);
      } catch (e: any) {
        if (!cancelled) {
          setLoadError(e?.message ?? 'Could not start PayPal.');
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // Render the buttons once; amount changes are read via amountRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loadError) {
    return (
      <View style={styles.notice}>
        <Text style={styles.noticeText}>{loadError}</Text>
      </View>
    );
  }

  return (
    <View>
      {loading && (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Loading PayPal…</Text>
        </View>
      )}
      {/* PayPal renders its button (and login popup) into this element. */}
      {/* @ts-ignore - div is valid on web via react-native-web */}
      <div ref={containerRef as any} />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  loadingText: { marginLeft: 8, color: colors.muted },
  notice: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  noticeText: { color: '#B91C1C', fontSize: 13, lineHeight: 19 },
});
