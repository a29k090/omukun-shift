// General utility functions & Shift Analytics helpers
import { parseTimeMinutes, calculateDurationHours, getDaysInMonth, formatDateKey } from './dates.js';

export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function copyToClipboard(text) {
  if (navigator.clipboard) {
    return navigator.clipboard.writeText(text);
  }
  const textArea = document.createElement('textarea');
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand('copy');
  document.body.removeChild(textArea);
  return Promise.resolve();
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount);
}

// Default fallback staffing rules if period rules are empty
const DEFAULT_STAFFING_RULES = [
  { id: 'sr-1', time_start: '09:00', time_end: '11:00', required_count: 2 },
  { id: 'sr-2', time_start: '11:00', time_end: '15:00', required_count: 4 },
  { id: 'sr-3', time_start: '15:00', time_end: '18:00', required_count: 2 },
  { id: 'sr-4', time_start: '18:00', time_end: '21:30', required_count: 3 }
];

/**
 * Calculates staffing shortage for a specific date based on staffing rules and current shift assignments.
 */
export function calculateDayShortages(dateKey, state) {
  const rules = (state && state.staffingRules && state.staffingRules.length > 0)
    ? state.staffingRules
    : DEFAULT_STAFFING_RULES;

  const assignments = (state && state.assignments)
    ? state.assignments.filter(a => a.date === dateKey)
    : [];

  const shortageItems = [];
  let totalDeficit = 0;

  for (const rule of rules) {
    const ruleStart = parseTimeMinutes(rule.time_start);
    const ruleEnd = parseTimeMinutes(rule.time_end);

    // Count assigned staff whose shifts overlap with this rule interval
    let assignedCount = 0;
    for (const asg of assignments) {
      const asgStart = parseTimeMinutes(asg.start_time);
      const asgEnd = parseTimeMinutes(asg.end_time);

      if (asgStart < ruleEnd && asgEnd > ruleStart) {
        assignedCount++;
      }
    }

    if (assignedCount < rule.required_count) {
      const deficit = rule.required_count - assignedCount;
      totalDeficit += deficit;
      shortageItems.push({
        ruleId: rule.id,
        timeStart: rule.time_start,
        timeEnd: rule.time_end,
        required: rule.required_count,
        assigned: assignedCount,
        deficit,
        isCritical: deficit >= 2
      });
    }
  }

  const isCritical = shortageItems.some(item => item.isCritical) || totalDeficit >= 3;

  let summaryText = '';
  if (shortageItems.length === 1) {
    summaryText = `${shortageItems[0].timeStart}–${shortageItems[0].timeEnd} ${shortageItems[0].deficit}名不足`;
  } else if (shortageItems.length > 1) {
    summaryText = `${shortageItems[0].timeStart}〜 ${totalDeficit}名不足`;
  }

  return {
    hasShortage: shortageItems.length > 0,
    totalDeficit,
    shortageItems,
    isCritical,
    summaryText
  };
}

/**
 * Renders horizontal mini-timeline shortage bar representing 09:00 - 21:30.
 */
export function renderMiniShortageBar(shortageItems, storeOpenTime = '09:00', storeCloseTime = '21:30') {
  if (!shortageItems || shortageItems.length === 0) return '';
  const openM = parseTimeMinutes(storeOpenTime);
  const closeM = parseTimeMinutes(storeCloseTime);
  const totalM = Math.max(1, closeM - openM);

  const segments = shortageItems.map(item => {
    const startM = parseTimeMinutes(item.timeStart);
    const endM = parseTimeMinutes(item.timeEnd);
    const leftPct = Math.max(0, ((startM - openM) / totalM) * 100);
    const widthPct = Math.min(100 - leftPct, ((endM - startM) / totalM) * 100);
    const opacity = item.isCritical ? '1' : '0.7';
    return `<div class="shortage-mini-segment" style="left:${leftPct.toFixed(1)}%; width:${widthPct.toFixed(1)}%; opacity:${opacity};"></div>`;
  }).join('');

  return `<div class="shortage-mini-bar" title="不足時間帯">${segments}</div>`;
}

/**
 * Calculates monthly summary metrics for the manager workspace header.
 */
export function calculateManagerSummary(state) {
  const members = state.members || [];
  const assignments = state.assignments || [];
  const availability = state.availability || [];
  const monthKey = state.currentMonthKey || '2026-10';

  // 1. Submitted staff count
  const staffMembers = members.filter(m => m.role === 'staff');
  let submittedStaffCount = 0;

  staffMembers.forEach(m => {
    const hasSubmitted = availability.some(a => a.member_id === m.id && a.state && a.state !== 'unset');
    if (hasSubmitted) submittedStaffCount++;
  });

  // 2. Shortage calculation for all days in month
  const [yearStr, monthStr] = monthKey.split('-');
  const year = parseInt(yearStr, 10);
  const monthIndex = parseInt(monthStr, 10) - 1;
  const daysInMonth = getDaysInMonth(year, monthIndex);

  let totalShortageDeficit = 0;
  let unresolvedDaysCount = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = formatDateKey(year, monthIndex, day);
    const dayShortage = calculateDayShortages(dateKey, state);
    if (dayShortage.hasShortage) {
      unresolvedDaysCount++;
      totalShortageDeficit += dayShortage.totalDeficit;
    }
  }

  // 3. Labor hours and cost
  let totalScheduledHours = 0;
  let totalEstimatedCost = 0;
  let limitWarningCount = 0;

  members.forEach(member => {
    const mAsgs = assignments.filter(a => a.member_id === member.id);
    let mHours = 0;
    mAsgs.forEach(a => {
      mHours += calculateDurationHours(a.start_time, a.end_time, a.break_minutes || 0);
    });

    totalScheduledHours += mHours;
    totalEstimatedCost += mHours * (member.hourly_rate || 1100);

    if ((member.max_monthly_hours && mHours > member.max_monthly_hours) ||
        (member.min_monthly_hours && mHours < member.min_monthly_hours)) {
      limitWarningCount++;
    }
  });

  return {
    submittedStaffCount,
    totalStaffCount: staffMembers.length,
    totalShortageDeficit,
    unresolvedDaysCount,
    totalScheduledHours,
    totalEstimatedCost,
    limitWarningCount
  };
}
