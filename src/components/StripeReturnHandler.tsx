import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../state/CartContext';
import { fetchStripeSession } from '../data/stripeApi';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// On web, Stripe redirects back to the app with ?stripe=success|cancel&
// session_id=.... Because that is a full-page reload, React Navigation starts
// at the initial (home) route. This component ONLY acts when such a return
// param is present, and then moves the user to the right screen:
//   - cancel / unpaid -> back to Payment (so they can retry), cart kept
//   - confirmed paid  -> OrderTracking (the only "order successful" path)
//
// A plain app load with no ?stripe=... param does nothing (so the home page
// never jumps to Payment on startup), even if a stale pending order exists.
//
// Two things make the redirect reliable after a hard reload:
//   1. We wait until the navigator reports isReady() before navigating, so the
//      call isn't swallowed by the initial route still mounting.
//   2. The effect depends on `orders`, so if the persisted pending order isn't
//      hydrated on the first render we re-run once it is. A ref guards against
//      handling the same return twice.
export default function StripeReturnHandler() {
  const navigation = useNavigation<Nav>();
  const { markPaid, removeOrder, clear, orders } = useApp();
  const handledRef = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (handledRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const stripe = params.get('stripe');
    const sessionId = params.get('session_id');

    // The pending Stripe order is the most recent one awaiting payment.
    // (orders is newest-first.) If it hasn't hydrated yet, bail and let the
    // effect re-run when `orders` updates.
    const pending = orders.find(
      (o) => o.paymentMethod === 'stripe' && o.paymentStatus === 'pending'
    );
    if (!pending) return;

    const clearUrl = () => {
      window.history.replaceState({}, '', window.location.pathname);
    };

    // Navigate only once the navigator is mounted/ready, otherwise the call can
    // be lost to the initial route. isReady() lives on the root navigator (not
    // in the screen-level type), so read it defensively. Poll briefly until ready.
    const isNavReady = () => {
      const nav = navigation as unknown as { isReady?: () => boolean };
      return nav.isReady ? nav.isReady() : true;
    };
    const navigateWhenReady = (fn: () => void) => {
      const tryNav = (attempt = 0) => {
        if (isNavReady()) {
          fn();
        } else if (attempt < 50) {
          setTimeout(() => tryNav(attempt + 1), 50);
        }
      };
      tryNav();
    };

    const backToPayment = () =>
      navigateWhenReady(() =>
        navigation.navigate('Payment', {
          draft: { customer: pending.customer, pickup: pending.pickup },
        })
      );

    // Plain app load with no ?stripe=... param (e.g. the buyer used the browser
    // Back button from Stripe, which carries no param). Do NOT navigate - that
    // caused the home page to jump to Payment on every startup. Just quietly
    // discard the stale unpaid pending order so it doesn't linger as a fake
    // order; the user stays on home with their cart intact and can re-checkout.
    if (!stripe) {
      handledRef.current = true;
      removeOrder(pending.id);
      return;
    }

    // From here we are committed to handling this return exactly once.
    handledRef.current = true;

    if (stripe === 'cancel') {
      // Abandoned: discard the unpaid pending order (so nothing looks like a
      // real order) and return to Payment. Cart is left as-is.
      clearUrl();
      removeOrder(pending.id);
      backToPayment();
      return;
    }

    if (stripe === 'success' && sessionId) {
      (async () => {
        let confirmedPaid = false;
        try {
          const session = await fetchStripeSession(sessionId);
          confirmedPaid = session.paymentStatus === 'paid';
          if (confirmedPaid) markPaid(pending.id);
        } catch {
          // Confirmation failed -> treat as unpaid below.
        } finally {
          clearUrl();
          if (confirmedPaid) {
            // The ONLY "order successful" path: payment confirmed, so NOW empty
            // the cart (it was kept through the redirect) and open tracking.
            clear();
            navigateWhenReady(() =>
              navigation.navigate('OrderTracking', { orderId: pending.id })
            );
          } else {
            // Success redirect but not actually paid: discard the pending order
            // and go back to Payment. Cart untouched.
            removeOrder(pending.id);
            backToPayment();
          }
        }
      })();
      return;
    }

    // Unknown stripe value: discard pending and return to Payment to be safe.
    clearUrl();
    removeOrder(pending.id);
    backToPayment();
  }, [orders, navigation, markPaid, removeOrder, clear]);

  return null;
}
