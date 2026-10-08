import React, { useEffect } from 'react';
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
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>;

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationsScreen({ navigation }: Props) {
  const { role, notificationsFor, markRead } = useApp();
  const audience = role === 'owner' ? 'owner' : 'customer';
  const notes = notificationsFor(audience);

  // Opening the screen clears the unread badge for this audience.
  useEffect(() => {
    markRead(audience);
  }, [audience, markRead]);

  if (notes.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTitle}>No notifications</Text>
          <Text style={styles.emptyText}>
            {role === 'owner'
              ? "You'll be alerted here when a customer places an order."
              : "We'll let you know here when your order status changes."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={notes}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => {
              // Owner lands on the owner board; customer opens the order.
              if (role === 'owner') {
                navigation.navigate('Owner');
              } else {
                navigation.navigate('OrderTracking', { orderId: item.orderId });
              }
            }}
          >
            <View style={styles.cardHead}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardTime}>{timeAgo(item.createdAt)}</Text>
            </View>
            <Text style={styles.cardBody}>{item.body}</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16 },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 10 },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 },
  cardTime: { fontSize: 12, color: colors.muted, marginLeft: 8 },
  cardBody: { fontSize: 14, color: colors.muted, lineHeight: 19 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 15, color: colors.muted, marginTop: 8, textAlign: 'center', lineHeight: 21 },
});
