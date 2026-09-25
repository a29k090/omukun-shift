// Labor Cost Panel & Monthly Hours Calculation module
import { calculateDurationHours } from './dates.js';
import { formatCurrency } from './utils.js';

export function renderLaborCostPanel(state) {
  if (state.role !== 'admin') return '';

  let totalMonthlyHours = 0;
  let totalEstimatedCost = 0;

  const staffSummaries = state.members.map(member => {
    const memberAssignments = state.assignments.filter(a => a.member_id === member.id);
    let memberHours = 0;

    memberAssignments.forEach(asg => {
      memberHours += calculateDurationHours(asg.start_time, asg.end_time, asg.break_minutes || 0);
    });

    totalMonthlyHours += memberHours;
    const memberCost = memberHours * (member.hourly_rate || 1100);
    totalEstimatedCost += memberCost;

    // Constraint warnings
    let warningBadge = '';
    if (member.max_monthly_hours && memberHours > member.max_monthly_hours) {
      warningBadge = `<span style="color:var(--color-danger); font-size:0.75rem; font-weight:700;">⚠️ 上限超過 (${memberHours.toFixed(1)} / ${member.max_monthly_hours}h)</span>`;
    } else if (member.min_monthly_hours && memberHours < member.min_monthly_hours) {
      warningBadge = `<span style="color:var(--color-warning); font-size:0.75rem;">⚠️ 最低時間未達 (${memberHours.toFixed(1)} / ${member.min_monthly_hours}h)</span>`;
    }

    return `
      <div style="display:flex; justify-between; align-items:center; padding:6px 0; border-bottom:1px solid var(--color-border-subtle); font-size:0.8rem;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="staff-dot" style="background:${member.color}"></span>
          <strong>${member.name}</strong>
        </div>
        <div style="display:flex; align-items:center; gap:12px;">
          ${warningBadge}
          <span style="font-weight:700;">${memberHours.toFixed(1)}h</span>
          <span style="color:var(--color-text-secondary); width:80px; text-align:right;">${formatCurrency(memberCost)}</span>
        </div>
      </div>
    `;
  }).join('');

  return `
    <details class="glass-panel" style="border-radius:var(--radius-lg); padding:var(--space-3) var(--space-4);" open>
      <summary style="font-weight:700; cursor:pointer; font-size:0.95rem; display:flex; justify-between; align-items:center; outline:none;">
        <span>📊 労働時間・概算人件費サマリー (管理者限定)</span>
        <span style="font-size:1.05rem; font-weight:800; color:var(--color-brand-orange);">${formatCurrency(totalEstimatedCost)} <small style="font-size:0.75rem; color:var(--color-text-secondary);">(${totalMonthlyHours.toFixed(1)}h)</small></span>
      </summary>

      <div style="margin-top:var(--space-3); display:flex; flex-direction:column;">
        ${staffSummaries}
      </div>
    </details>
  `;
}
