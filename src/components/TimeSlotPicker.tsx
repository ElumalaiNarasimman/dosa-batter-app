import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { slotsForDate, TimeSlot } from '../data/pickup';
import { colors } from '../theme';

interface TimeSlotPickerProps {
  // The date whose slots we show. Null means no date picked yet.
  date: Date | null;
  // Selected slot start (minutes from midnight), or null.
  selectedStartMinutes: number | null;
  onSelect: (slot: TimeSlot) => void;
}

export default function TimeSlotPicker({
  date,
  selectedStartMinutes,
  onSelect,
}: TimeSlotPickerProps) {
  const slots = useMemo(() => (date ? slotsForDate(date) : []), [date]);

  if (!date) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>
          Pick a date first to see available pickup times.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {slots.map((slot) => {
        const isSelected = slot.startMinutes === selectedStartMinutes;
        return (
          <TouchableOpacity
            key={slot.startMinutes}
            style={[styles.chip, isSelected && styles.chipSelected]}
            onPress={() => onSelect(slot)}
          >
            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
              {slot.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginRight: 8,
    marginBottom: 8,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.text },
  chipTextSelected: { color: '#fff' },
  placeholder: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  placeholderText: { fontSize: 14, color: colors.muted },
});
