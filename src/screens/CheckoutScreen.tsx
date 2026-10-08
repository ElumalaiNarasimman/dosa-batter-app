import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { formatPrice, PICKUP_ADDRESS } from '../data/products';
import { useCart } from '../state/CartContext';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme';
import DatePickerField from '../components/DatePickerField';
import TimeSlotPicker from '../components/TimeSlotPicker';
import { formatLongDate, minPickupDate, TimeSlot } from '../data/pickup';

type Props = NativeStackScreenProps<RootStackParamList, 'Checkout'>;

export default function CheckoutScreen({ navigation }: Props) {
  const { lines, total } = useCart();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  // Pickup scheduling state.
  const minDate = useMemo(() => minPickupDate(), []);
  const [pickupDate, setPickupDate] = useState<Date | null>(null);
  const [pickupSlot, setPickupSlot] = useState<TimeSlot | null>(null);

  const handleSelectDate = (date: Date) => {
    setPickupDate(date);
    // Slots differ by weekday/weekend, so clear a stale selection.
    setPickupSlot(null);
  };

  const canPlace =
    !!name.trim() &&
    !!phone.trim() &&
    !!pickupDate &&
    !!pickupSlot &&
    lines.length > 0;

  const handleContinue = () => {
    if (!canPlace || !pickupDate || !pickupSlot) return;
    // Carry the draft into the payment step; the order is created after payment.
    navigation.navigate('Payment', {
      draft: {
        customer: { name: name.trim(), phone: phone.trim() },
        pickup: {
          dateISO: pickupDate.toISOString(),
          startMinutes: pickupSlot.startMinutes,
          endMinutes: pickupSlot.endMinutes,
          label: pickupSlot.label,
        },
      },
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.sectionTitle}>Order summary</Text>
          <View style={styles.card}>
            {lines.map((line) => (
              <View key={line.product.id} style={styles.summaryRow}>
                <Text style={styles.summaryName}>
                  {line.quantity} × {line.product.name}
                </Text>
                <Text style={styles.summaryValue}>
                  {formatPrice(line.product.price * line.quantity)}
                </Text>
              </View>
            ))}
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryTotalLabel}>Total</Text>
              <Text style={styles.summaryTotalValue}>{formatPrice(total)}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Pickup location</Text>
          <View style={styles.card}>
            <Text style={styles.addressText}>{PICKUP_ADDRESS}</Text>
          </View>

          <Text style={styles.sectionTitle}>Pickup date</Text>
          <Text style={styles.hint}>
            Earliest pickup is {formatLongDate(minDate)} (2 days after ordering).
          </Text>
          <DatePickerField
            minDate={minDate}
            selected={pickupDate}
            onSelect={handleSelectDate}
          />

          <Text style={styles.sectionTitle}>Pickup time</Text>
          <Text style={styles.hint}>
            Weekdays 18:00-21:30 · Weekends 09:00-13:00 and 17:00-21:30
          </Text>
          <TimeSlotPicker
            date={pickupDate}
            selectedStartMinutes={pickupSlot?.startMinutes ?? null}
            onSelect={setPickupSlot}
          />

          {pickupDate && pickupSlot && (
            <View style={styles.selectedPickup}>
              <Text style={styles.selectedPickupLabel}>Selected pickup</Text>
              <Text style={styles.selectedPickupValue}>
                {formatLongDate(pickupDate)} · {pickupSlot.label}
              </Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>Your details</Text>
          <TextInput
            style={styles.input}
            placeholder="Full name"
            placeholderTextColor={colors.muted}
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.input}
            placeholder="Phone number"
            placeholderTextColor={colors.muted}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.placeButton, !canPlace && styles.placeButtonDisabled]}
            onPress={handleContinue}
            disabled={!canPlace}
          >
            <Text style={styles.placeButtonText}>
              Continue to payment · {formatPrice(total)}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { padding: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
    marginTop: 10,
  },
  hint: { fontSize: 13, color: colors.muted, marginBottom: 10 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  addressText: { fontSize: 15, color: colors.text, fontWeight: '600' },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  summaryName: { fontSize: 15, color: colors.text },
  summaryValue: { fontSize: 15, fontWeight: '600', color: colors.text },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
  summaryTotalLabel: { fontSize: 17, fontWeight: '700', color: colors.text },
  summaryTotalValue: { fontSize: 17, fontWeight: '800', color: colors.primary },
  selectedPickup: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  selectedPickupLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectedPickupValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.text,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  placeButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  placeButtonDisabled: { backgroundColor: '#D6D3D1' },
  placeButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
