import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useOrders } from '../state/CartContext';
import { formatPrice, PICKUP_ADDRESS } from '../data/products';
import { STATUS_FLOW, STATUS_META, PAYMENT_META, shortOrderId } from '../data/orders';
import { formatLongDate } from '../data/pickup';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderTracking'>;

export default function OrderTrackingScreen({ route, navigation }: Props) {
  const { orderId } = route.params;
  const { getOrder } = useOrders();
  const order = getOrder(orderId);

  if (!order) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Order not found</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Orders')}
          >
            <Text style={styles.primaryButtonText}>Go to orders</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const pickupDate = new Date(order.pickup.dateISO);
  const currentIndex = STATUS_FLOW.indexOf(order.status);
  const payMeta = PAYMENT_META[order.paymentMethod];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.banner}>
          <Text style={styles.bannerLabel}>Order #{shortOrderId(order.id)}</Text>
          <Text style={styles.bannerStatus}>{STATUS_META[order.status].label}</Text>
          <Text style={styles.bannerDesc}>{STATUS_META[order.status].description}</Text>
        </View>

        <Text style={styles.sectionTitle}>Tracking</Text>
        <View style={styles.card}>
          {STATUS_FLOW.map((status, idx) => {
            const reached = idx <= currentIndex;
            const isLast = idx === STATUS_FLOW.length - 1;
            return (
              <View key={status} style={styles.stepRow}>
                <View style={styles.stepIndicator}>
                  <View
                    style={[styles.dot, reached ? styles.dotActive : styles.dotIdle]}
                  >
                    {reached && <Text style={styles.dotCheck}>✓</Text>}
                  </View>
                  {!isLast && (
                    <View
                      style={[
                        styles.connector,
                        idx < currentIndex ? styles.connectorActive : styles.connectorIdle,
                      ]}
                    />
                  )}
                </View>
                <View style={styles.stepText}>
                  <Text
                    style={[styles.stepLabel, reached && styles.stepLabelActive]}
                  >
                    {STATUS_META[status].label}
                  </Text>
                  <Text style={styles.stepDesc}>{STATUS_META[status].description}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Pickup details</Text>
        <View style={styles.card}>
          <Row label="When" value={`${formatLongDate(pickupDate)} · ${order.pickup.label}`} />
          <View style={styles.divider} />
          <Row label="Where" value={PICKUP_ADDRESS} />
          <View style={styles.divider} />
          <Row label="Name" value={order.customer.name} />
          <View style={styles.divider} />
          <Row label="Phone" value={order.customer.phone} />
          <View style={styles.divider} />
          <Row
            label="Payment"
            value={`${payMeta.icon} ${payMeta.label} · ${
              order.paymentStatus === 'paid' ? 'Paid' : 'Pay at pickup'
            }`}
          />
        </View>

        <Text style={styles.sectionTitle}>Items</Text>
        <View style={styles.card}>
          {order.lines.map((line) => (
            <View key={line.product.id} style={styles.itemRow}>
              <Text style={styles.itemName}>
                {line.quantity} × {line.product.name}
              </Text>
              <Text style={styles.itemValue}>
                {formatPrice(line.product.price * line.quantity)}
              </Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.itemRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatPrice(order.total)}</Text>
          </View>
        </View>

        <Text style={styles.footNote}>
          You'll get a notification here when the shop marks your order ready.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20 },
  banner: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 18,
    marginBottom: 8,
  },
  bannerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bannerStatus: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 4 },
  bannerDesc: { fontSize: 14, color: colors.text, marginTop: 4 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 16 },
  stepRow: { flexDirection: 'row' },
  stepIndicator: { alignItems: 'center', width: 32 },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotActive: { backgroundColor: colors.success },
  dotIdle: { backgroundColor: colors.border },
  dotCheck: { color: '#fff', fontSize: 13, fontWeight: '800' },
  connector: { width: 2, flex: 1, marginVertical: 2 },
  connectorActive: { backgroundColor: colors.success },
  connectorIdle: { backgroundColor: colors.border },
  stepText: { flex: 1, paddingBottom: 18, paddingLeft: 8 },
  stepLabel: { fontSize: 15, fontWeight: '700', color: colors.muted },
  stepLabelActive: { color: colors.text },
  stepDesc: { fontSize: 13, color: colors.muted, marginTop: 2 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  detailLabel: { fontSize: 14, color: colors.muted, fontWeight: '600' },
  detailValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 },
  itemName: { fontSize: 15, color: colors.text },
  itemValue: { fontSize: 15, fontWeight: '600', color: colors.text },
  totalLabel: { fontSize: 16, fontWeight: '700', color: colors.text },
  totalValue: { fontSize: 16, fontWeight: '800', color: colors.primary },
  footNote: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 19,
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  primaryButton: {
    marginTop: 20,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
