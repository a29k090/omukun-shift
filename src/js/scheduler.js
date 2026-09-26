// Shift Creation, Contextual Staff Selector, and Smart Scheduler ("仮シフトを作成")
import { createBottomSheet, closeBottomSheet, showToast } from './ui.js';
import { generateUUID } from './utils.js';
import { calculateDurationHours } from './dates.js';

export function openShiftCreationModal(stateManager, defaultMemberId, date) {
  const state = stateManager.state;

  const staffListHTML = state.members.map(m => {
    const avail = state.availability.find(a => a.member_id === m.id && a.date === date);

    let availLabel = '未入力';
    let isAvailable = true;

    if (avail) {
      if (avail.state === 'full') {
        availLabel = '終日';
      } else if (avail.state === 'until') {
        availLabel = `〜${avail.start_time || '18:00'}`;
      } else if (avail.state === 'from') {
        availLabel = `${avail.start_time || '12:00'}〜`;
      } else if (avail.state === 'range') {
        availLabel = `${avail.start_time || '09:30'}–${avail.end_time || '18:30'}`;
      } else if (avail.state === 'unavailable') {
        availLabel = '出勤不可';
        isAvailable = false;
      }
    }

    const isSelected = m.id === defaultMemberId;

    return `
      <div class="radio-select-row ${isSelected ? 'selected' : ''}" data-staff-id="${m.id}" data-available="${isAvailable}">
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="timeline-staff-dot" style="background:${m.color};"></span>
          <span style="font-weight:700; font-size:0.85rem;">${m.name}</span>
        </div>
        <span style="font-size:0.75rem; color:${isAvailable ? 'var(--color-text-secondary)' : 'var(--color-danger)'};">${availLabel}</span>
      </div>
    `;
  }).join('');

  const contentHTML = `
    <form id="create-shift-form" class="form-group" style="gap:var(--space-3);">
      <div style="font-size:0.95rem; font-weight:800; border-bottom:1px solid var(--color-border); padding-bottom:var(--space-2);">
        シフト配置 (${date})
      </div>

      <div class="form-group">
        <label class="form-label">スタッフ選択</label>
        <div class="radio-select-group" style="max-height:180px; overflow-y:auto;">
          ${staffListHTML}
        </div>
        <input type="hidden" id="selected-staff-id" value="${defaultMemberId || (state.members[0] ? state.members[0].id : '')}" />
      </div>

      <div class="form-group">
        <label class="form-label">時間プリセット</label>
        <select id="preset-selector" class="form-select">
          <option value="">指定なし</option>
          ${state.presets.map(p => `<option value="${p.id}">${p.name} (${p.start_time}–${p.end_time})</option>`).join('')}
        </select>
      </div>

      <div style="display:flex; gap:var(--space-2);">
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

      <div style="display:flex; justify-content:flex-end; gap:var(--space-2); margin-top:var(--space-2);">
        <button type="button" class="btn btn-secondary close-sheet-btn">キャンセル</button>
        <button type="submit" class="btn btn-primary">配置する</button>
      </div>
    </form>
  `;

  createBottomSheet({
    title: '',
    contentHTML,
    onOpen: (body) => {
      const hiddenStaffInput = body.querySelector('#selected-staff-id');
      const staffRows = body.querySelectorAll('.radio-select-row');

      staffRows.forEach(row => {
        row.addEventListener('click', () => {
          staffRows.forEach(r => r.classList.remove('selected'));
          row.classList.add('selected');
          hiddenStaffInput.value = row.getAttribute('data-staff-id');
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
        showToast('シフトを作成しました');
      });
    }
  });
}

// Client-side Scheduler ("仮シフトを作成")
export function runAutoScheduler(stateManager) {
  const state = stateManager.state;
  const currentMonthKey = state.currentMonthKey;
  const period = state.period;

  if (!period) return;

  const contentHTML = `
    <div class="form-group" style="gap:var(--space-3);">
      <div style="font-size:0.95rem; font-weight:800; border-bottom:1px solid var(--color-border); padding-bottom:var(--space-2);">
        仮シフトの作成
      </div>

      <p style="font-size:0.825rem; color:var(--color-text-secondary); line-height:1.5;">
        希望シフト・時間帯別の必要人数・月間勤務上限をもとに、仮シフトを自動作成します。
      </p>

      <div style="background:var(--color-surface-subtle); padding:var(--space-3); border-radius:var(--radius-xs); display:flex; flex-direction:column; gap:var(--space-2);">
        <label style="font-size:0.825rem; font-weight:700; color:var(--color-text); cursor:pointer;">
          <input type="checkbox" id="opt-ignore-unset" checked /> 未入力スタッフを除外する
        </label>
        <label style="font-size:0.825rem; font-weight:700; color:var(--color-text); cursor:pointer;">
          <input type="checkbox" id="opt-keep-existing" checked /> 既存の作成済みシフトを保持する
        </label>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:var(--space-2); margin-top:var(--space-2);">
        <button type="button" class="btn btn-secondary close-sheet-btn">キャンセル</button>
        <button type="button" id="start-auto-schedule-btn" class="btn btn-primary">仮シフトを作成</button>
      </div>
    </div>
  `;

  createBottomSheet({
    title: '',
    contentHTML,
    onOpen: (body) => {
      body.querySelector('#start-auto-schedule-btn').addEventListener('click', async () => {
        const ignoreUnset = body.querySelector('#opt-ignore-unset').checked;
        const keepExisting = body.querySelector('#opt-keep-existing').checked;

        closeBottomSheet();
        showToast('仮シフトを作成中…');

        const newAssignments = keepExisting ? [...state.assignments] : [];

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
          // Do NOT overwrite confirmed dates
          if (state.confirmedDays && state.confirmedDays[dateKey]) continue;

          const existingOnDate = newAssignments.filter(a => a.date === dateKey);
          if (existingOnDate.length >= 2) continue;

          const sortedMembers = [...state.members].sort((a, b) => {
            return (memberHoursMap.get(a.id) || 0) - (memberHoursMap.get(b.id) || 0);
          });

          for (const member of sortedMembers) {
            const avail = state.availability.find(a => a.member_id === member.id && a.date === dateKey);

            if (!avail && ignoreUnset) continue;
            if (avail && avail.state === 'unavailable') continue;
            if (newAssignments.some(a => a.member_id === member.id && a.date === dateKey)) continue;

            const currentHours = memberHoursMap.get(member.id) || 0;
            const shiftHours = 8;
            if (member.max_monthly_hours && (currentHours + shiftHours) > member.max_monthly_hours) {
              continue;
            }

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
        showToast(`仮シフトを作成しました (+${addedCount}件)`);
      });
    }
  });
}
