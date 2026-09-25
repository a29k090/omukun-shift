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
      warningBadge = `<span style="background:var(--color-danger-bg); color:var(--color-danger-text); border:1px solid var(--color-danger-border); padding:2px 6px; border-radius:4px; font-size:0.725rem; font-weight:700;">⚠️ 上限超過 (${memberHours.toFixed(1)} / ${member.max_monthly_hours}h)</span>`;
    } else if (member.min_monthly_hours && memberHours < member.min_monthly_hours) {
      warningBadge = `<span style="background:var(--color-warning-bg); color:var(--color-warning); border:1px solid var(--color-warning-border); padding:2px 6px; border-radius:4px; font-size:0.725rem; font-weight:700;">⚠️ 最低未達 (${memberHours.toFixed(1)} / ${member.min_monthly_hours}h)</span>`;
    }

    return `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--color-border-subtle); font-size:0.85rem;">
        <div style="display:flex; align-items:center; gap:10px;">
          <span class="staff-dot" style="background:${member.color}"></span>
          <strong style="font-weight:700;">${member.name}</strong>
          <span style="font-size:0.725rem; color:var(--color-text-muted);">時給: ${formatCurrency(member.hourly_rate || 1100)}</span>
        </div>
        <div style="display:flex; align-items:center; gap:16px;">
          ${warningBadge}
          <span style="font-weight:800; font-size:0.9rem;">${memberHours.toFixed(1)}h</span>
          <span style="color:var(--color-text-secondary); width:90px; text-align:right; font-weight:600;">${formatCurrency(memberCost)}</span>
        </div>
      </div>
    `;
  }).join('');

  return `
    <details class="inspector-panel" open>
      <summary style="font-weight:800; cursor:pointer; font-size:0.95rem; display:flex; justify-content:space-between; align-items:center; user-select:none;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span>🛠️ 労働時間・概算人件費インスペクター</span>
          <span style="font-size:0.75rem; color:var(--color-text-muted); font-weight:600;">(管理者モード限定)</span>
        </div>
        <div style="display:flex; align-items:center; gap:12px;">
          <span style="font-size:1.1rem; font-weight:800; color:var(--color-accent-black);">${formatCurrency(totalEstimatedCost)}</span>
          <span style="font-size:0.8rem; font-weight:700; color:var(--color-text-secondary);">(${totalMonthlyHours.toFixed(1)}時間)</span>
        </div>
      </summary>

      <div style="margin-top:var(--space-4); display:flex; flex-direction:column;">
        ${staffSummaries}
      </div>
    </details>
  `;
}
