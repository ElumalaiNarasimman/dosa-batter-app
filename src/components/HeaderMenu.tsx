import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../state/CartContext';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface MenuEntry {
  key: keyof RootStackParamList;
  label: string;
  icon: string;
  badge?: number;
}

// A top-right navigation menu shared by all screens. Opens a dropdown
// anchored to the top-right with the main destinations and a role switch.
export default function HeaderMenu() {
  const navigation = useNavigation<Nav>();
  const { itemCount, role, setRole, unreadCount } = useApp();
  const [open, setOpen] = useState(false);

  const audience = role === 'owner' ? 'owner' : 'customer';
  const unread = unreadCount(audience);

  const customerEntries: MenuEntry[] = [
    { key: 'Shop', label: 'Shop', icon: '🍽️' },
    { key: 'Cart', label: 'Cart', icon: '🛒', badge: itemCount },
    { key: 'Orders', label: 'My orders', icon: '📦' },
    { key: 'Notifications', label: 'Notifications', icon: '🔔', badge: unread },
  ];

  const ownerEntries: MenuEntry[] = [
    { key: 'Owner', label: 'Incoming orders', icon: '📋' },
    { key: 'Notifications', label: 'Notifications', icon: '🔔', badge: unread },
    { key: 'Shop', label: 'Shop (preview)', icon: '🍽️' },
  ];

  const entries = role === 'owner' ? ownerEntries : customerEntries;

  const go = (key: keyof RootStackParamList) => {
    setOpen(false);
    // These destinations take no params.
    navigation.navigate(key as any);
  };

  const switchRole = () => {
    const next = role === 'owner' ? 'customer' : 'owner';
    setRole(next);
    setOpen(false);
    navigation.navigate(next === 'owner' ? 'Owner' : 'Shop');
  };

  return (
    <>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setOpen(true)}
        hitSlop={8}
      >
        <Text style={styles.triggerIcon}>☰</Text>
        {unread > 0 && <View style={styles.triggerDot} />}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetHeader}>
              {role === 'owner' ? 'Owner menu' : 'Menu'}
            </Text>
            {entries.map((entry) => (
              <TouchableOpacity
                key={entry.key}
                style={styles.item}
                onPress={() => go(entry.key)}
              >
                <Text style={styles.itemIcon}>{entry.icon}</Text>
                <Text style={styles.itemLabel}>{entry.label}</Text>
                {entry.badge ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{entry.badge}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            ))}

            <View style={styles.divider} />
            <TouchableOpacity style={styles.roleSwitch} onPress={switchRole}>
              <Text style={styles.roleSwitchText}>
                {role === 'owner'
                  ? 'Switch to customer view'
                  : 'Switch to owner view'}
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerIcon: { fontSize: 22, color: colors.text },
  triggerDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#DC2626',
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' },
  sheet: {
    position: 'absolute',
    top: 56,
    right: 12,
    width: 230,
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  sheetHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  itemIcon: { fontSize: 18, width: 28 },
  itemLabel: { fontSize: 15, color: colors.text, fontWeight: '600', flex: 1 },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 6 },
  roleSwitch: { paddingHorizontal: 16, paddingVertical: 12 },
  roleSwitchText: { fontSize: 14, color: colors.primary, fontWeight: '700' },
});
