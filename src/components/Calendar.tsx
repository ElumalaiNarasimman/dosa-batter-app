import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  isBefore,
  isSameDay,
  monthLabel,
  startOfDay,
} from '../data/pickup';
import { colors } from '../theme';

interface CalendarProps {
  // Earliest selectable date. Anything before this is disabled.
  minDate: Date;
  // Currently selected date, or null if none chosen yet.
  selected: Date | null;
  onSelect: (date: Date) => void;
}

const WEEKDAY_HEADERS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

// Index (0=Mon ... 6=Sun) of a date's weekday, so the grid starts on Monday.
function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export default function Calendar({ minDate, selected, onSelect }: CalendarProps) {
  const initial = startOfDay(selected ?? minDate);
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const cells = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const leading = mondayIndex(firstOfMonth);

    const result: (Date | null)[] = [];
    for (let i = 0; i < leading; i++) result.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      result.push(new Date(viewYear, viewMonth, d));
    }
    while (result.length % 7 !== 0) result.push(null);
    return result;
  }, [viewYear, viewMonth]);

  // Don't let the user page to months entirely before the minimum date.
  const canGoPrev = useMemo(() => {
    const firstVisible = new Date(viewYear, viewMonth, 1);
    const minFirst = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    return firstVisible.getTime() > minFirst.getTime();
  }, [viewYear, viewMonth, minDate]);

  const goPrev = () => {
    if (!canGoPrev) return;
    const d = new Date(viewYear, viewMonth - 1, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const goNext = () => {
    const d = new Date(viewYear, viewMonth + 1, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={goPrev}
          disabled={!canGoPrev}
          style={[styles.navButton, !canGoPrev && styles.navDisabled]}
        >
          <Text style={[styles.navText, !canGoPrev && styles.navTextDisabled]}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{monthLabel(viewYear, viewMonth)}</Text>
        <TouchableOpacity onPress={goNext} style={styles.navButton}>
          <Text style={styles.navText}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAY_HEADERS.map((w) => (
          <View key={w} style={styles.cell}>
            <Text style={styles.weekHeader}>{w}</Text>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((date, idx) => {
          if (!date) {
            return <View key={`empty-${idx}`} style={styles.cell} />;
          }
          const disabled = isBefore(date, minDate);
          const isSelected = selected ? isSameDay(date, selected) : false;

          return (
            <View key={date.toISOString()} style={styles.cell}>
              <TouchableOpacity
                disabled={disabled}
                onPress={() => onSelect(startOfDay(date))}
                style={[
                  styles.day,
                  isSelected && styles.daySelected,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    disabled && styles.dayTextDisabled,
                    isSelected && styles.dayTextSelected,
                  ]}
                >
                  {date.getDate()}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  navDisabled: { opacity: 0.4 },
  navText: { fontSize: 22, fontWeight: '700', color: colors.primary, lineHeight: 24 },
  navTextDisabled: { color: colors.muted },
  monthLabel: { fontSize: 16, fontWeight: '700', color: colors.text },
  weekRow: { flexDirection: 'row' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekHeader: { fontSize: 12, fontWeight: '700', color: colors.muted },
  day: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySelected: { backgroundColor: colors.primary },
  dayText: { fontSize: 15, color: colors.text },
  dayTextDisabled: { color: '#D6D3D1' },
  dayTextSelected: { color: '#fff', fontWeight: '800' },
});
