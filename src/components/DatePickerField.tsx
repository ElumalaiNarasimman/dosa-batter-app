import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import Calendar from './Calendar';
import { formatLongDate } from '../data/pickup';
import { colors } from '../theme';

interface DatePickerFieldProps {
  minDate: Date;
  selected: Date | null;
  onSelect: (date: Date) => void;
  placeholder?: string;
}

// A compact field that shows the chosen date and opens the full calendar
// in a popup modal when tapped.
export default function DatePickerField({
  minDate,
  selected,
  onSelect,
  placeholder = 'Select a pickup date',
}: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (date: Date) => {
    onSelect(date);
    setOpen(false);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.field}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <View style={styles.fieldLeft}>
          <Text style={styles.calendarIcon}>📅</Text>
          <Text style={[styles.fieldText, !selected && styles.fieldPlaceholder]}>
            {selected ? formatLongDate(selected) : placeholder}
          </Text>
        </View>
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          {/* Stop propagation so taps inside the card don't close the modal. */}
          <Pressable style={styles.card} onPress={() => {}}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Choose pickup date</Text>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={8}>
                <Text style={styles.close}>✕</Text>
              </TouchableOpacity>
            </View>
            <Calendar minDate={minDate} selected={selected} onSelect={handleSelect} />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  fieldLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  calendarIcon: { fontSize: 16, marginRight: 10 },
  fieldText: { fontSize: 15, color: colors.text, fontWeight: '600' },
  fieldPlaceholder: { color: colors.muted, fontWeight: '400' },
  chevron: { fontSize: 14, color: colors.muted, marginLeft: 8 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  close: { fontSize: 18, color: colors.muted, fontWeight: '700' },
});
