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
import { useOrders } from '../state/CartContext';
import { formatPrice } from '../data/products';
import { STATUS_META, shortOrderId } from '../data/orders';
import { formatLongDate } from '../data/pickup';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Orders'>;

const STATUS_COLORS: Record<string, string> = {
  placed: colors.primary,
  preparing: '#2563EB',
  ready: colors.success,
  completed: colors.muted,
};

export default function OrdersScreen({ navigation }: Props) {
  const { orders } = useOrders();

  if (orders.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>Your orders</Text>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptyText}>
            Orders you place will show up here with live pickup status.
          </Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => navigation.navigate('Shop')}
          >
            <Text style={styles.shopButtonText}>Browse batter</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Your orders</Text>
      </View>
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const pickupDate = new Date(item.pickup.dateISO);
          const meta = STATUS_META[item.status];
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                navigation.navigate('OrderTracking', { orderId: item.id })
              }
            >
              <View style={styles.cardTop}>
                <Text style={styles.orderId}>Order #{shortOrderId(item.id)}</Text>
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: STATUS_COLORS[item.status] },
                  ]}
                >
                  <Text style={styles.badgeText}>{meta.label}</Text>
                </View>
              </View>
              <Text style={styles.pickupLine}>
                Pickup {formatLongDate(pickupDate)} · {item.pickup.label}
              </Text>
              <View style={styles.cardBottom}>
                <Text style={styles.itemsLine}>
                  {item.lines.reduce((n, l) => n + l.quantity, 0)} item(s)
                </Text>
                <Text style={styles.totalLine}>{formatPrice(item.total)}</Text>
              </View>
              <Text style={styles.trackLink}>Track order ›</Text>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  list: { padding: 16 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderId: { fontSize: 16, fontWeight: '800', color: colors.text },
  badge: { borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  pickupLine: { fontSize: 14, color: colors.muted, marginTop: 8 },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  itemsLine: { fontSize: 14, color: colors.text },
  totalLine: { fontSize: 16, fontWeight: '800', color: colors.text },
  trackLink: { fontSize: 14, color: colors.primary, fontWeight: '700', marginTop: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 15, color: colors.muted, marginTop: 8, textAlign: 'center' },
  shopButton: {
    marginTop: 20,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  shopButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
