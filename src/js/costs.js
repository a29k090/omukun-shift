// Labor Cost & Staff Constraint Panel ("スタッフ別勤務状況")
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

    // Constraint status description
    let constraintText = '';
    if (member.max_monthly_hours && memberHours > member.max_monthly_hours) {
      const over = (memberHours - member.max_monthly_hours).toFixed(1);
      constraintText = `<span style="color:var(--color-danger); font-size:0.725rem; font-weight:700;">上限より${over}h超過</span>`;
    } else if (member.min_monthly_hours && memberHours < member.min_monthly_hours) {
      const needed = (member.min_monthly_hours - memberHours).toFixed(1);
      constraintText = `<span style="color:var(--color-text-muted); font-size:0.725rem;">最低${member.min_monthly_hours}hまであと${needed}h</span>`;
    }

    return `
      <div class="settings-row">
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="timeline-staff-dot" style="background:${member.color}"></span>
          <strong style="font-weight:700; font-size:0.825rem;">${member.name}</strong>
          <span style="font-size:0.725rem; color:var(--color-text-muted);">時給 ${formatCurrency(member.hourly_rate || 1100)}</span>
        </div>
        <div style="display:flex; align-items:center; gap:16px;">
          ${constraintText}
          <span style="font-weight:800; font-size:0.825rem; min-width:48px; text-align:right;">${memberHours.toFixed(1)}h</span>
          <span style="color:var(--color-text-secondary); min-width:70px; text-align:right; font-weight:600; font-size:0.825rem;">${formatCurrency(memberCost)}</span>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="settings-group">
      <div class="settings-row" style="background:var(--color-surface-subtle); border-bottom:1px solid var(--color-border);">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-weight:800; font-size:0.85rem;">スタッフ別勤務状況</span>
        </div>
        <div style="display:flex; align-items:center; gap:12px;">
          <span style="font-size:0.85rem; font-weight:800; color:var(--color-text);">${formatCurrency(totalEstimatedCost)}</span>
          <span style="font-size:0.75rem; font-weight:700; color:var(--color-text-secondary);">(${totalMonthlyHours.toFixed(1)}h)</span>
        </div>
      </div>
      ${staffSummaries}
    </div>
  `;
}
