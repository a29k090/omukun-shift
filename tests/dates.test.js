import { describe, it, expect } from 'vitest';
import { calculateDurationHours, parseTimeMinutes, formatMinutesToTime, getDaysInMonth } from '../src/js/dates.js';

describe('Date & Time Calculation Helpers', () => {
  it('correctly calculates working hours subtracting break minutes', () => {
    // 09:30 to 18:30 is 9 hours. 60 min break = 8 hours working duration
    const duration = calculateDurationHours('09:30', '18:30', 60);
    expect(duration).toBe(8.0);
  });

  it('correctly parses time string to total minutes', () => {
    expect(parseTimeMinutes('09:30')).toBe(570);
    expect(parseTimeMinutes('18:00')).toBe(1080);
  });

  it('correctly formats minutes to time string', () => {
    expect(formatMinutesToTime(570)).toBe('09:30');
    expect(formatMinutesToTime(1080)).toBe('18:00');
  });

  it('handles leap year days in February correctly', () => {
    expect(getDaysInMonth(2024, 1)).toBe(29); // 2024 is leap year
    expect(getDaysInMonth(2025, 1)).toBe(28); // 2025 is non-leap year
  });
});
