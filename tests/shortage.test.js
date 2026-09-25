import { describe, it, expect } from 'vitest';
import { calculateDayShortages, calculateManagerSummary } from '../src/js/utils.js';

describe('calculateDayShortages', () => {
  it('detects shortage when assignments are fewer than required count', () => {
    const mockState = {
      staffingRules: [
        { id: 'r1', time_start: '09:00', time_end: '12:00', required_count: 2 },
        { id: 'r2', time_start: '12:00', time_end: '18:00', required_count: 3 }
      ],
      assignments: [
        { date: '2026-10-01', start_time: '09:00', end_time: '18:00' } // 1 staff assigned all day
      ]
    };

    const result = calculateDayShortages('2026-10-01', mockState);
    expect(result.hasShortage).toBe(true);
    expect(result.totalDeficit).toBe(3); // 1 short in r1 + 2 short in r2 = 3 total deficit
    expect(result.shortageItems).toHaveLength(2);
    expect(result.shortageItems[0].deficit).toBe(1);
    expect(result.shortageItems[1].deficit).toBe(2);
  });

  it('reports no shortage when required count is met', () => {
    const mockState = {
      staffingRules: [
        { id: 'r1', time_start: '09:00', time_end: '12:00', required_count: 1 }
      ],
      assignments: [
        { date: '2026-10-01', start_time: '09:00', end_time: '12:00' }
      ]
    };

    const result = calculateDayShortages('2026-10-01', mockState);
    expect(result.hasShortage).toBe(false);
    expect(result.totalDeficit).toBe(0);
  });
});

describe('calculateManagerSummary', () => {
  it('calculates correct summary metrics', () => {
    const mockState = {
      currentMonthKey: '2026-10',
      members: [
        { id: 'm1', role: 'admin', hourly_rate: 1200 },
        { id: 'm2', role: 'staff', hourly_rate: 1000 }
      ],
      availability: [
        { member_id: 'm2', date: '2026-10-01', state: 'full' }
      ],
      assignments: [
        { member_id: 'm2', date: '2026-10-01', start_time: '09:00', end_time: '17:00', break_minutes: 60 } // 7 hours
      ],
      staffingRules: []
    };

    const summary = calculateManagerSummary(mockState);
    expect(summary.submittedStaffCount).toBe(1);
    expect(summary.totalStaffCount).toBe(1);
    expect(summary.totalScheduledHours).toBe(7);
    expect(summary.totalEstimatedCost).toBe(7000);
  });
});
