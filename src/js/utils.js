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

/**
 * Merges adjacent shortage intervals with identical deficit counts into continuous readable ranges.
 */
function mergeShortageItems(rawItems) {
  if (!rawItems || rawItems.length === 0) return [];

  const sorted = [...rawItems].sort((a, b) => parseTimeMinutes(a.timeStart) - parseTimeMinutes(b.timeStart));
  const merged = [];

  let current = null;

  for (const item of sorted) {
    if (!current) {
      current = { ...item };
      continue;
    }

    const curEndM = parseTimeMinutes(current.timeEnd);
    const itemStartM = parseTimeMinutes(item.timeStart);

    // Merge if adjacent/continuous and same deficit count
    if (curEndM >= itemStartM && current.deficit === item.deficit) {
      current.timeEnd = item.timeEnd;
      current.required = Math.max(current.required, item.required);
      current.available = Math.min(current.available, item.available);
      current.noAvailableStaff = current.noAvailableStaff || item.noAvailableStaff;
      current.isCritical = current.isCritical || item.isCritical;
    } else {
      merged.push(current);
      current = { ...item };
    }
  }

  if (current) {
    merged.push(current);
  }

  return merged;
}

/**
 * Calculates staffing shortage for a date based on Rule Priority:
 * Specific Date Override > Weekday Override > Time Range Overrides / Store Default.
 * Merges adjacent intervals into continuous human-readable ranges.
 */
export function calculateDayShortages(dateKey, state) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dayOfWeek = dateObj.getDay();

  const rawRules = state && state.staffingRules ? state.staffingRules : [];
  let activeRules = [];

  if (Array.isArray(rawRules) && rawRules.length > 0) {
    activeRules = rawRules;
  } else if (rawRules && typeof rawRules === 'object') {
    const defaultReq = rawRules.default_required_count || 2;
    const timeRanges = rawRules.time_range_overrides || [];
    const weekdayOverrides = rawRules.weekday_overrides || [];
    const specificOverrides = rawRules.specific_date_overrides || [];

    const matchingSpecific = specificOverrides.filter(r => r.date === dateKey);
    const matchingWeekday = weekdayOverrides.filter(r => r.day_of_week === dayOfWeek);

    if (matchingSpecific.length > 0) {
      activeRules = matchingSpecific;
    } else if (matchingWeekday.length > 0) {
      activeRules = matchingWeekday;
    } else if (timeRanges.length > 0) {
      activeRules = timeRanges;
    } else {
      activeRules = [{
        id: 'default-rule',
        time_start: (state && state.store) ? state.store.default_open_time : '09:00',
        time_end: (state && state.store) ? state.store.default_close_time : '21:30',
        required_count: defaultReq
      }];
    }
  } else {
    activeRules = [{
      id: 'default-rule',
      time_start: '09:00',
      time_end: '21:30',
      required_count: 2
    }];
  }

  const activeMembers = (state && state.members ? state.members : []).filter(m => (m.role === 'staff' || !m.role) && m.status !== 'inactive');
  const totalExpectedCount = activeMembers.length;

  const dateAvails = (state && state.availability ? state.availability : []).filter(a => a.date === dateKey);
  const enteredMemberIds = new Set(dateAvails.filter(a => a.state && a.state !== 'unset').map(a => a.member_id));
  const enteredCount = enteredMemberIds.size;
  const unenteredCount = Math.max(0, totalExpectedCount - enteredCount);
  const isProvisional = unenteredCount > 0;

  const assignments = (state && state.assignments ? state.assignments : []).filter(a => a.date === dateKey);

  const rawShortageItems = [];
  let totalDeficit = 0;

  for (const rule of activeRules) {
    const rStart = parseTimeMinutes(rule.time_start || '09:00');
    const rEnd = parseTimeMinutes(rule.time_end || '21:30');

    let assignedCount = 0;
    for (const asg of assignments) {
      const asgStart = parseTimeMinutes(asg.start_time);
      const asgEnd = parseTimeMinutes(asg.end_time);

      if (asgStart < rEnd && asgEnd > rStart) {
        assignedCount++;
      }
    }

    if (assignedCount < rule.required_count) {
      const deficit = rule.required_count - assignedCount;
      totalDeficit += deficit;

      let availableCount = 0;
      for (const m of activeMembers) {
        const av = dateAvails.find(a => a.member_id === m.id);
        if (!av || av.state === 'unset') continue;

        if (av.state === 'full') availableCount++;
        else if (av.state === 'range' && av.start_time && av.end_time) {
          const avStart = parseTimeMinutes(av.start_time);
          const avEnd = parseTimeMinutes(av.end_time);
          if (avStart < rEnd && avEnd > rStart) availableCount++;
        } else if (av.state === 'from' && av.start_time) {
          if (parseTimeMinutes(av.start_time) < rEnd) availableCount++;
        } else if (av.state === 'until' && av.start_time) {
          if (parseTimeMinutes(av.start_time) > rStart) availableCount++;
        }
      }

      rawShortageItems.push({
        ruleId: rule.id,
        timeStart: rule.time_start || '09:00',
        timeEnd: rule.time_end || '21:30',
        required: rule.required_count,
        assigned: assignedCount,
        available: availableCount,
        deficit,
        noAvailableStaff: availableCount === 0 && enteredCount > 0,
        isCritical: deficit >= 2
      });
    }
  }

  // Merge adjacent shortage ranges with identical deficits
  const shortageItems = mergeShortageItems(rawShortageItems);

  const isCritical = shortageItems.some(item => item.isCritical) || totalDeficit >= 3;

  let summaryText = '';
  if (shortageItems.length === 1) {
    summaryText = `${shortageItems[0].timeStart}–${shortageItems[0].timeEnd} ${shortageItems[0].deficit}名`;
  } else if (shortageItems.length > 1) {
    summaryText = shortageItems.map(item => `${item.timeStart}–${item.timeEnd} -${item.deficit}名`).join(' / ');
  }

  return {
    hasShortage: shortageItems.length > 0,
    totalDeficit,
    shortageItems,
    isCritical,
    isProvisional,
    enteredCount,
    totalExpectedCount,
    unenteredCount,
    summaryText
  };
}

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

export function calculateManagerSummary(state) {
  const members = state ? (state.members || []) : [];
  const assignments = state ? (state.assignments || []) : [];
  const availability = state ? (state.availability || []) : [];
  const monthKey = (state && state.currentMonthKey) ? state.currentMonthKey : '2026-10';

  const staffMembers = members.filter(m => m.role === 'staff' && m.status !== 'inactive');
  let submittedStaffCount = 0;

  staffMembers.forEach(m => {
    const hasSubmitted = availability.some(a => a.member_id === m.id && a.state && a.state !== 'unset');
    if (hasSubmitted) submittedStaffCount++;
  });

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

  let totalScheduledHours = 0;
  let totalEstimatedCost = 0;
  let limitWarningCount = 0;

  const monthRules = (state && state.staffMonthRules) ? state.staffMonthRules : [];

  members.forEach(member => {
    const mAsgs = assignments.filter(a => a.member_id === member.id);
    let mHours = 0;
    mAsgs.forEach(a => {
      mHours += calculateDurationHours(a.start_time, a.end_time, a.break_minutes || 0);
    });

    totalScheduledHours += mHours;

    const isHourly = member.pay_type !== 'monthly';
    const rate = member.hourly_rate || 1100;
    totalEstimatedCost += isHourly ? (mHours * rate) : (member.monthly_salary || 200000);

    const mOverride = monthRules.find(r => r.member_id === member.id && r.month_key === monthKey);
    const maxLimit = mOverride ? mOverride.max_monthly_hours : member.max_monthly_hours;
    const minLimit = mOverride ? mOverride.min_monthly_hours : member.min_monthly_hours;

    if ((maxLimit && mHours > maxLimit) || (minLimit && mHours < minLimit)) {
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
