// Shift Creation, Contextual Staff Selector, and Smart Heuristic Scheduler ("AIで仮シフトを作成")
import { createBottomSheet, closeBottomSheet, showToast } from './ui.js';
import { generateUUID } from './utils.js';
import { calculateDurationHours } from './dates.js';

export function openShiftCreationModal(stateManager, defaultMemberId, date) {
  const state = stateManager.state;

  const staffListHTML = state.members.map(m => {
    const avail = state.availability.find(a => a.member_id === m.id && a.date === date);

    let availLabel = '未入力';
    let isAvailable = true;
    let badgeClass = 'state-unset';

    if (avail) {
      if (avail.state === 'full') {
        availLabel = '終日OK';
        badgeClass = 'state-full';
      } else if (avail.state === 'until') {
        availLabel = `${avail.start_time || '○'}時まで`;
        badgeClass = 'state-until';
      } else if (avail.state === 'from') {
        availLabel = `${avail.start_time || '○'}時から`;
        badgeClass = 'state-from';
      } else if (avail.state === 'range') {
        availLabel = `${avail.start_time || '○'}〜${avail.end_time || '○'}`;
        badgeClass = 'state-range';
      } else if (avail.state === 'unavailable') {
        availLabel = '出勤不可';
        isAvailable = false;
        badgeClass = 'state-unavailable';
      }
    }

    const isSelected = m.id === defaultMemberId;

    return `
      <div class="staff-select-item ${!isAvailable ? 'disabled' : ''} ${isSelected ? 'selected' : ''}" data-staff-id="${m.id}" data-available="${isAvailable}">
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="staff-dot" style="background:${m.color};"></span>
          <div>
            <div style="font-weight:700;">${m.name}</div>
            <div style="font-size:0.75rem; color:var(--color-text-muted);">${m.role === 'admin' ? '管理者' : 'スタッフ'}</div>
          </div>
        </div>
        <span class="calendar-day-status ${badgeClass}">${availLabel}</span>
      </div>
    `;
  }).join('');

  const contentHTML = `
    <form id="create-shift-form" class="form-group">
      <div style="font-size:0.85rem; color:var(--color-text-secondary); margin-bottom:8px;">対象日: <strong>${date}</strong></div>

      <div class="form-group">
        <label class="form-label">スタッフ選択 (希望シフト表示)</label>
        <div style="display:flex; flex-direction:column; gap:8px; max-height:200px; overflow-y:auto; padding-right:4px;">
          ${staffListHTML}
        </div>
        <input type="hidden" id="selected-staff-id" value="${defaultMemberId || (state.members[0] ? state.members[0].id : '')}" />
      </div>

      <div class="form-group">
        <label class="form-label">シフトプリセットから選択 (任意)</label>
        <select id="preset-selector" class="form-select">
          <option value="">カスタム時間指定</option>
          ${state.presets.map(p => `<option value="${p.id}">${p.name} (${p.start_time}-${p.end_time})</option>`).join('')}
        </select>
      </div>

      <div style="display:flex; gap:8px;">
        <div class="form-group" style="flex:1;">
          <label class="form-label">開始時間</label>
          <input type="time" id="shift-start-time" class="form-input" value="09:30" step="900" required />
        </div>
        <div class="form-group" style="flex:1;">
          <label class="form-label">終了時間</label>
          <input type="time" id="shift-end-time" class="form-input" value="18:30" step="900" required />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">休憩時間（分）</label>
        <input type="number" id="shift-break-min" class="form-input" value="60" step="15" min="0" />
      </div>

      <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
        <button type="button" class="btn btn-secondary close-sheet-btn">キャンセル</button>
        <button type="submit" class="btn btn-primary">シフト作成</button>
      </div>
    </form>
  `;

  createBottomSheet({
    title: '新規シフト配置作成',
    contentHTML,
    onOpen: (body) => {
      const hiddenStaffInput = body.querySelector('#selected-staff-id');
      const staffItems = body.querySelectorAll('.staff-select-item');

      staffItems.forEach(item => {
        item.addEventListener('click', () => {
          const isAvail = item.getAttribute('data-available') === 'true';
          if (!isAvail) {
            showToast('⚠️ 該当スタッフは出勤不可希望を提出しています');
          }
          staffItems.forEach(i => i.style.borderColor = 'var(--color-border-subtle)');
          item.style.borderColor = 'var(--color-text)';
          hiddenStaffInput.value = item.getAttribute('data-staff-id');
        });
      });

      const presetSelect = body.querySelector('#preset-selector');
      presetSelect.addEventListener('change', () => {
        const presetId = presetSelect.value;
        const preset = state.presets.find(p => p.id === presetId);
        if (preset) {
          body.querySelector('#shift-start-time').value = preset.start_time;
          body.querySelector('#shift-end-time').value = preset.end_time;
          body.querySelector('#shift-break-min').value = preset.break_minutes;
        }
      });

      const form = body.querySelector('#create-shift-form');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const memberId = hiddenStaffInput.value;
        if (!memberId) {
          showToast('スタッフを選択してください');
          return;
        }

        const startTime = body.querySelector('#shift-start-time').value;
        const endTime = body.querySelector('#shift-end-time').value;
        const breakMin = parseInt(body.querySelector('#shift-break-min').value, 10) || 0;

        await stateManager.saveAssignment({
          id: `asg-${generateUUID()}`,
          period_id: state.period ? state.period.id : 'period-2026-10',
          date,
          member_id: memberId,
          start_time: startTime,
          end_time: endTime,
          break_minutes: breakMin,
          preset_id: presetSelect.value || null,
          is_locked: false,
          source: 'manual'
        });

        closeBottomSheet();
        showToast('新しいシフトを作成しました');
      });
    }
  });
}

// Client-side Heuristic Auto Scheduler
export function runAutoScheduler(stateManager) {
  const state = stateManager.state;
  const currentMonthKey = state.currentMonthKey;
  const period = state.period;

  if (!period) return;

  const contentHTML = `
    <div class="form-group">
      <p style="font-size:0.85rem; color:var(--color-text-secondary);">
        提出された希望シフト・必要人員体制・労働時間上限・プリセットを考慮し、最適な仮シフト案を自動生成します。
      </p>

      <div class="form-group" style="margin-top:12px;">
        <label class="form-label">
          <input type="checkbox" id="opt-ignore-unset" checked /> 未入力スタッフを自動生成から除外する
        </label>
      </div>

      <div class="form-group">
        <label class="form-label">
          <input type="checkbox" id="opt-keep-existing" checked /> 既存の作成済みシフトを保持する
        </label>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
        <button type="button" class="btn btn-secondary close-sheet-btn">キャンセル</button>
        <button type="button" id="start-auto-schedule-btn" class="btn btn-accent">仮案を自動生成</button>
      </div>
    </div>
  `;

  createBottomSheet({
    title: '✨ AI自動シフト生成',
    contentHTML,
    onOpen: (body) => {
      body.querySelector('#start-auto-schedule-btn').addEventListener('click', async () => {
        const ignoreUnset = body.querySelector('#opt-ignore-unset').checked;
        const keepExisting = body.querySelector('#opt-keep-existing').checked;

        closeBottomSheet();
        showToast('仮シフトを自動生成中…');

        const newAssignments = keepExisting ? [...state.assignments] : [];

        // Track member scheduled hours
        const memberHoursMap = new Map();
        state.members.forEach(m => {
          let hrs = 0;
          newAssignments.filter(a => a.member_id === m.id).forEach(a => {
            hrs += calculateDurationHours(a.start_time, a.end_time, a.break_minutes || 0);
          });
          memberHoursMap.set(m.id, hrs);
        });

        const datesInMonth = [];
        const [y, m] = currentMonthKey.split('-').map(Number);
        const days = new Date(y, m, 0).getDate();
        for (let d = 1; d <= days; d++) {
          const dKey = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          datesInMonth.push(dKey);
        }

        let addedCount = 0;
        const presets = state.presets.length > 0 ? state.presets : [{ id: 'preset-A', start_time: '09:30', end_time: '18:30', break_minutes: 60 }];

        for (const dateKey of datesInMonth) {
          const existingOnDate = newAssignments.filter(a => a.date === dateKey);
          if (existingOnDate.length >= 2) continue; // Already met minimal staffing

          // Sort staff by total scheduled hours ascending to ensure fair distribution
          const sortedMembers = [...state.members].sort((a, b) => {
            return (memberHoursMap.get(a.id) || 0) - (memberHoursMap.get(b.id) || 0);
          });

          for (const member of sortedMembers) {
            const avail = state.availability.find(a => a.member_id === member.id && a.date === dateKey);

            // Hard Constraints
            if (!avail && ignoreUnset) continue;
            if (avail && avail.state === 'unavailable') continue;
            if (newAssignments.some(a => a.member_id === member.id && a.date === dateKey)) continue;

            // Hour limit constraint check
            const currentHours = memberHoursMap.get(member.id) || 0;
            const shiftHours = 8; // approx shift length
            if (member.max_monthly_hours && (currentHours + shiftHours) > member.max_monthly_hours) {
              continue;
            }

            // Pick appropriate preset
            const chosenPreset = presets[addedCount % presets.length];

            newAssignments.push({
              id: `asg-auto-${generateUUID()}`,
              period_id: period.id,
              date: dateKey,
              member_id: member.id,
              start_time: chosenPreset.start_time,
              end_time: chosenPreset.end_time,
              break_minutes: chosenPreset.break_minutes,
              preset_id: chosenPreset.id,
              is_locked: false,
              source: 'auto'
            });

            memberHoursMap.set(member.id, currentHours + shiftHours);
            addedCount++;

            if (newAssignments.filter(a => a.date === dateKey).length >= 2) break;
          }
        }

        await stateManager.replaceAssignments(newAssignments);
        showToast(`✨ 仮シフト案を作成しました (+${addedCount}件)`);
      });
    }
  });
}
