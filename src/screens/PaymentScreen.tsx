import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCart } from '../state/CartContext';
import { formatPrice, PICKUP_ADDRESS } from '../data/products';
import { PaymentMethod, PAYMENT_META } from '../data/orders';
import { processPayment } from '../data/payments';
import { createStripeCheckout, fetchStripeSession } from '../data/stripeApi';
import { formatLongDate } from '../data/pickup';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme';
import { WEB_APP_URL } from '../config';
import PayPalButton from '../components/PayPalButton';

// Pull the Stripe session id out of a return URL (web or native deep link).
function sessionIdFromUrl(url: string): string | null {
  const m = url.match(/[?&]session_id=([^&#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

type Props = NativeStackScreenProps<RootStackParamList, 'Payment'>;

const METHODS: PaymentMethod[] = ['paypal', 'stripe', 'cash'];

export default function PaymentScreen({ route, navigation }: Props) {
  const { draft } = route.params;
  const { lines, total, placeOrder } = useCart();
  const [method, setMethod] = useState<PaymentMethod>('paypal');
  const [processing, setProcessing] = useState(false);

  const pickupDate = new Date(draft.pickup.dateISO);
  const meta = PAYMENT_META[method];
  const isPayPal = method === 'paypal';
  const isStripe = method === 'stripe';

  // Create the order record after any successful payment.
  const completeOrder = (paymentStatus: 'paid' | 'pending') => {
    const order = placeOrder({
      lines,
      total,
      customer: draft.customer,
      pickup: draft.pickup,
      paymentMethod: method,
      paymentStatus,
    });
    navigation.replace('OrderTracking', { orderId: order.id });
  };

  // Place the pending Stripe order (empties cart). Called only AFTER Stripe has
  // accepted the session, so a failed checkout leaves the cart intact.
  const placePendingStripeOrder = () =>
    placeOrder({
      lines,
      total,
      customer: draft.customer,
      pickup: draft.pickup,
      paymentMethod: 'stripe',
      paymentStatus: 'pending',
    });

  // Real Stripe. Two platform flows:
  //  - web:    full-page redirect to Stripe, return handled by StripeReturnHandler
  //  - native: open Stripe in an in-app browser with a DEEP LINK return URL, then
  //            confirm the session and update the order right here in the app.
  const handleStripe = async () => {
    setProcessing(true);
    try {
      if (Platform.OS === 'web') {
        const origin = WEB_APP_URL;
        const successUrl = `${origin}/?stripe=success&session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${origin}/?stripe=cancel`;
        const session = await createStripeCheckout(total, successUrl, cancelUrl);
        placePendingStripeOrder();
        window.location.href = session.url; // StripeReturnHandler takes over on return
        return;
      }

      // ---- Native (iPhone/Android via Expo Go) ----
      // Deep link back into the app. In Expo Go this is an exp:// URL.
      const returnUrl = Linking.createURL('stripe-return');
      const successUrl = `${returnUrl}?stripe=success&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${returnUrl}?stripe=cancel`;

      const session = await createStripeCheckout(total, successUrl, cancelUrl);

      // Open Stripe in an in-app browser that auto-closes when the deep link
      // fires, returning the final redirect URL to us. We do NOT place an order
      // yet - only a confirmed, paid return creates one. Cancelling or
      // dismissing leaves the cart intact and keeps the user on this screen.
      const result = await WebBrowser.openAuthSessionAsync(session.url, returnUrl);

      // Anything other than a successful redirect back = user cancelled or
      // dismissed. Do nothing: stay on the payment screen, cart untouched.
      if (result.type !== 'success' || !result.url) {
        setProcessing(false);
        return;
      }

      const cancelled = /[?&]stripe=cancel/.test(result.url);
      const sid = sessionIdFromUrl(result.url);
      if (cancelled || !sid) {
        // Explicit cancel from Stripe: stay here so they can pick another method.
        setProcessing(false);
        return;
      }

      // Verify with the backend that the session was actually paid.
      let paid = false;
      try {
        const confirmed = await fetchStripeSession(sid);
        paid = confirmed.paymentStatus === 'paid';
      } catch {
        paid = false;
      }

      if (!paid) {
        Alert.alert(
          'Payment not completed',
          'Your card was not charged. You can try again or choose another method.'
        );
        setProcessing(false);
        return;
      }

      // Only now, on confirmed payment, create the order (empties cart) and
      // open its tracking page.
      const order = placeOrder({
        lines,
        total,
        customer: draft.customer,
        pickup: draft.pickup,
        paymentMethod: 'stripe',
        paymentStatus: 'paid',
      });
      navigation.replace('OrderTracking', { orderId: order.id });
    } catch (e: any) {
      Alert.alert('Stripe checkout failed', e?.message ?? 'Please try again.');
      setProcessing(false);
    }
  };

  // Cash uses the plain pay button (no online charge).
  const handlePay = async () => {
    if (isStripe) {
      await handleStripe();
      return;
    }
    setProcessing(true);
    try {
      const result = await processPayment(method, total);
      if (!result.success) {
        Alert.alert('Payment failed', result.message ?? 'Please try again.');
        return;
      }
      completeOrder(meta.online ? 'paid' : 'pending');
    } finally {
      setProcessing(false);
    }
  };

  // Real PayPal: order is placed only after the server confirms capture.
  const handlePayPalPaid = () => completeOrder('paid');
  const handlePayPalError = (message: string) =>
    Alert.alert('PayPal payment failed', message);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionTitle}>Payment method</Text>
        {METHODS.map((m) => {
          const info = PAYMENT_META[m];
          const selected = m === method;
          return (
            <TouchableOpacity
              key={m}
              style={[styles.method, selected && styles.methodSelected]}
              onPress={() => setMethod(m)}
              disabled={processing}
            >
              <Text style={styles.methodIcon}>{info.icon}</Text>
              <View style={styles.methodText}>
                <Text style={styles.methodLabel}>{info.label}</Text>
                <Text style={styles.methodBlurb}>{info.blurb}</Text>
              </View>
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          );
        })}

        <Text style={styles.sectionTitle}>Pickup</Text>
        <View style={styles.card}>
          <Text style={styles.pickupWhen}>
            {formatLongDate(pickupDate)} · {draft.pickup.label}
          </Text>
          <Text style={styles.pickupWhere}>{PICKUP_ADDRESS}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Amount due</Text>
            <Text style={styles.summaryValue}>{formatPrice(total)}</Text>
          </View>
          {isPayPal ? (
            <Text style={styles.mockNote}>
              You'll log into your PayPal account to approve this payment.
              Running against PayPal Sandbox until live credentials are added.
            </Text>
          ) : (
            <Text style={styles.mockNote}>
              {method === 'stripe'
                ? "You'll be redirected to Stripe's secure checkout page to pay by card, then returned here. Uses Stripe test mode until a live key is added."
                : 'You will pay in cash at pickup.'}
            </Text>
          )}
        </View>

        {/* Real PayPal button renders inline so the login popup can open. */}
        {isPayPal && (
          <View style={styles.paypalWrap}>
            <PayPalButton
              amount={total}
              onPaid={handlePayPalPaid}
              onError={handlePayPalError}
            />
          </View>
        )}
      </ScrollView>

      {!isPayPal && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.payButton, processing && styles.payButtonDisabled]}
            onPress={handlePay}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.payButtonText}>
                {isStripe
                  ? `Continue to Stripe · ${formatPrice(total)}`
                  : meta.online
                  ? `Pay ${formatPrice(total)} with ${meta.label}`
                  : `Place order · pay ${formatPrice(total)} at pickup`}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
    marginTop: 8,
  },
  method: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  methodSelected: { borderColor: colors.primary },
  methodIcon: { fontSize: 26, marginRight: 14 },
  methodText: { flex: 1 },
  methodLabel: { fontSize: 16, fontWeight: '700', color: colors.text },
  methodBlurb: { fontSize: 13, color: colors.muted, marginTop: 2 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 12 },
  pickupWhen: { fontSize: 15, fontWeight: '700', color: colors.text },
  pickupWhere: { fontSize: 14, color: colors.muted, marginTop: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 16, fontWeight: '600', color: colors.text },
  summaryValue: { fontSize: 18, fontWeight: '800', color: colors.primary },
  mockNote: { fontSize: 12, color: colors.muted, marginTop: 10, lineHeight: 17 },
  paypalWrap: { marginTop: 4, minHeight: 60 },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  payButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  payButtonDisabled: { opacity: 0.7 },
  payButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
