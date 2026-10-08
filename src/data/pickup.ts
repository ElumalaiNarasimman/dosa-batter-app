// Pickup scheduling rules.
//
// Date rule:   the earliest selectable pickup date is the order date + 2 days.
// Time rule:   weekdays (Mon-Fri) 18:00-21:30
//              weekends (Sat-Sun) 09:00-13:00 and 17:00-21:30
//
// Slots are offered in 30-minute increments. The last start time is 30 minutes
// before the window closes so the pickup fits inside the window.

export const LEAD_DAYS = 2;
export const SLOT_MINUTES = 30;

export interface TimeWindow {
  startMinutes: number; // minutes from midnight, inclusive
  endMinutes: number; // minutes from midnight, exclusive end of last slot start
}

function hm(hours: number, minutes: number): number {
  return hours * 60 + minutes;
}

// Monday is 1 ... Sunday is 0 (JS Date.getDay convention: Sun=0, Sat=6).
function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function windowsForDate(date: Date): TimeWindow[] {
  if (isWeekend(date)) {
    return [
      { startMinutes: hm(9, 0), endMinutes: hm(13, 0) },
      { startMinutes: hm(17, 0), endMinutes: hm(21, 30) },
    ];
  }
  return [{ startMinutes: hm(18, 0), endMinutes: hm(21, 30) }];
}

export function formatMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export interface TimeSlot {
  startMinutes: number;
  endMinutes: number;
  label: string; // e.g. "18:00 - 18:30"
}

// Generate selectable 30-minute slots for a given date based on its windows.
// A slot's start must be at least SLOT_MINUTES before the window end so the
// full slot fits (e.g. a 21:30 close yields a final 21:00-21:30 slot).
export function slotsForDate(date: Date): TimeSlot[] {
  const slots: TimeSlot[] = [];
  for (const w of windowsForDate(date)) {
    for (
      let start = w.startMinutes;
      start + SLOT_MINUTES <= w.endMinutes;
      start += SLOT_MINUTES
    ) {
      const end = start + SLOT_MINUTES;
      slots.push({
        startMinutes: start,
        endMinutes: end,
        label: `${formatMinutes(start)} - ${formatMinutes(end)}`,
      });
    }
  }
  return slots;
}

// Strip the time component so date comparisons are day-accurate.
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// Earliest date a customer may pick up, given when they order.
export function minPickupDate(orderDate: Date = new Date()): Date {
  return startOfDay(addDays(orderDate, LEAD_DAYS));
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isBefore(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() < startOfDay(b).getTime();
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function formatLongDate(date: Date): string {
  return `${WEEKDAY_NAMES[date.getDay()]}, ${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

export function monthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month]} ${year}`;
}
