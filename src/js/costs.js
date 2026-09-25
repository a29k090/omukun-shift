// Labor Cost & Staff Constraint Inspector Panel
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
      warningBadge = `<span style="background:var(--color-danger-bg); color:var(--color-danger-text); border:1px solid var(--color-danger-border); padding:1px 5px; border-radius:2px; font-size:0.7rem; font-weight:700;">⚠️ 上限超過 (${memberHours.toFixed(1)} / ${member.max_monthly_hours}h)</span>`;
    } else if (member.min_monthly_hours && memberHours < member.min_monthly_hours) {
      warningBadge = `<span style="background:var(--color-warning-bg); color:var(--color-warning); border:1px solid var(--color-warning-border); padding:1px 5px; border-radius:2px; font-size:0.7rem; font-weight:700;">⚠️ 最低未達 (${memberHours.toFixed(1)} / ${member.min_monthly_hours}h)</span>`;
    }

    return `
      <div class="settings-row">
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="timeline-staff-dot" style="background:${member.color}"></span>
          <strong style="font-weight:700; font-size:0.825rem;">${member.name}</strong>
          <span style="font-size:0.725rem; color:var(--color-text-muted);">時給 ${formatCurrency(member.hourly_rate || 1100)}</span>
        </div>
        <div style="display:flex; align-items:center; gap:12px;">
          ${warningBadge}
          <span style="font-weight:800; font-size:0.825rem;">${memberHours.toFixed(1)}h</span>
          <span style="color:var(--color-text-secondary); width:80px; text-align:right; font-weight:600; font-size:0.825rem;">${formatCurrency(memberCost)}</span>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="settings-group">
      <div class="settings-row" style="background:var(--color-surface-subtle); border-bottom:1px solid var(--color-border);">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-weight:800; font-size:0.85rem;">労働時間・人件費インスペクター</span>
          <span style="font-size:0.725rem; color:var(--color-text-muted); font-weight:600;">(月間合計)</span>
        </div>
        <div style="display:flex; align-items:center; gap:12px;">
          <span style="font-size:0.85rem; font-weight:800; color:var(--color-accent-black);">${formatCurrency(totalEstimatedCost)}</span>
          <span style="font-size:0.75rem; font-weight:700; color:var(--color-text-secondary);">(${totalMonthlyHours.toFixed(1)}時間)</span>
        </div>
      </div>
      ${staffSummaries}
    </div>
  `;
}
