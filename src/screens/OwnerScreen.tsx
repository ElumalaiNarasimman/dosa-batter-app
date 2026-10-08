import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useApp } from '../state/CartContext';
import { formatPrice } from '../data/products';
import {
  OrderStatus,
  PAYMENT_META,
  STATUS_FLOW,
  STATUS_META,
  shortOrderId,
} from '../data/orders';
import { formatLongDate } from '../data/pickup';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Owner'>;

// The next status an owner can move an order to, or null if finished.
function nextStatus(status: OrderStatus): OrderStatus | null {
  const idx = STATUS_FLOW.indexOf(status);
  return idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
}

export default function OwnerScreen(_props: Props) {
  const { orders, setStatus } = useApp();

  if (orders.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptyText}>
            New customer orders will appear here the moment they're placed.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const pickupDate = new Date(item.pickup.dateISO);
          const next = nextStatus(item.status);
          const payMeta = PAYMENT_META[item.paymentMethod];
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.orderId}>#{shortOrderId(item.id)}</Text>
                <Text style={styles.status}>{STATUS_META[item.status].label}</Text>
              </View>
              <Text style={styles.customer}>
                {item.customer.name} · {item.customer.phone}
              </Text>
              <Text style={styles.detail}>
                Pickup {formatLongDate(pickupDate)} · {item.pickup.label}
              </Text>
              <Text style={styles.detail}>
                {item.lines
                  .map((l) => `${l.quantity}× ${l.product.name}`)
                  .join(', ')}
              </Text>
              <View style={styles.payRow}>
                <Text style={styles.detail}>
                  {payMeta.icon} {payMeta.label}
                </Text>
                <Text
                  style={[
                    styles.payTag,
                    item.paymentStatus === 'paid' ? styles.paid : styles.pending,
                  ]}
                >
                  {item.paymentStatus === 'paid' ? 'PAID' : 'PAY AT PICKUP'}
                </Text>
              </View>

              <View style={styles.footer}>
                <Text style={styles.total}>{formatPrice(item.total)}</Text>
                {next ? (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => setStatus(item.id, next)}
                  >
                    <Text style={styles.actionButtonText}>
                      Mark {STATUS_META[next].label}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.done}>Completed</Text>
                )}
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16 },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 12 },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderId: { fontSize: 16, fontWeight: '800', color: colors.text },
  status: { fontSize: 13, fontWeight: '700', color: colors.primary },
  customer: { fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 8 },
  detail: { fontSize: 14, color: colors.muted, marginTop: 4 },
  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  payTag: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  paid: { color: colors.success },
  pending: { color: '#B45309' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  total: { fontSize: 18, fontWeight: '800', color: colors.text },
  actionButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  actionButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  done: { fontSize: 14, fontWeight: '700', color: colors.muted },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 15, color: colors.muted, marginTop: 8, textAlign: 'center' },
});
