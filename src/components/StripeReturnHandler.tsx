import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../state/CartContext';
import { fetchStripeSession } from '../data/stripeApi';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// On web, Stripe redirects back to the app with ?stripe=success&orderId=...&
// session_id=.... This component detects that on load, confirms the session was
// actually paid via the backend, marks the order paid, and opens its tracking
// page. Renders nothing.
export default function StripeReturnHandler() {
  const navigation = useNavigation<Nav>();
  const { markPaid, removeOrder, orders } = useApp();

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const stripe = params.get('stripe');
    const sessionId = params.get('session_id');
    if (!stripe) return;

    const clearUrl = () => {
      window.history.replaceState({}, '', window.location.pathname);
    };

    // The pending Stripe order is the most recent one awaiting payment.
    // (orders is newest-first.)
    const pending = orders.find(
      (o) => o.paymentMethod === 'stripe' && o.paymentStatus === 'pending'
    );

    if (stripe === 'cancel') {
      // Payment abandoned: discard the pending order so no unpaid order lingers,
      // then clean the URL. (The cart was already emptied on web before the
      // redirect; the user can re-add items or just see no stray order.)
      if (pending) removeOrder(pending.id);
      clearUrl();
      return;
    }

    if (stripe === 'success' && sessionId) {
      (async () => {
        let confirmedPaid = false;
        try {
          const session = await fetchStripeSession(sessionId);
          confirmedPaid = session.paymentStatus === 'paid';
          if (confirmedPaid && pending) {
            markPaid(pending.id);
          }
        } catch {
          // If confirmation fails, treat as unpaid below.
        } finally {
          clearUrl();
          if (confirmedPaid && pending) {
            navigation.navigate('OrderTracking', { orderId: pending.id });
          } else if (pending) {
            // Not actually paid: discard the pending order so it doesn't linger.
            removeOrder(pending.id);
          }
        }
      })();
    }
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
