// Staff Availability Calendar Component and Interactions
import { getDaysInMonth, formatDateKey, getJapaneseDayOfWeek } from './dates.js';
import { createBottomSheet, closeBottomSheet, showToast } from './ui.js';

export function renderStaffAvailabilityView(state) {
  const currentMember = state.members.find(m => m.id === state.currentMemberId) || state.members[0];
  const [yearStr, monthStr] = state.currentMonthKey.split('-');
  const year = parseInt(yearStr, 10);
  const monthIndex = parseInt(monthStr, 10) - 1;
  const daysInMonth = getDaysInMonth(year, monthIndex);

  // Calculate statistics
  const memberAvailMap = new Map();
  state.availability
    .filter(a => a.member_id === currentMember.id)
    .forEach(a => memberAvailMap.set(a.date, a));

  let enteredDays = 0;
  let unsetDays = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = formatDateKey(year, monthIndex, day);
    const entry = memberAvailMap.get(dateKey);
    if (entry && entry.state && entry.state !== 'unset') {
      enteredDays++;
    } else {
      unsetDays++;
    }
  }

  // Generate calendar days HTML
  let calendarDaysHTML = '';
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = formatDateKey(year, monthIndex, day);
    const dayOfWeek = getJapaneseDayOfWeek(year, monthIndex, day);
    const isWeekend = dayOfWeek === '土' || dayOfWeek === '日';
    const entry = memberAvailMap.get(dateKey) || { state: 'unset' };
    const stateBadge = getStateBadge(entry);

    calendarDaysHTML += `
      <div class="calendar-day ${state.selectedDate === dateKey ? 'selected' : ''}" data-date="${dateKey}">
        <div style="display:flex; justify-between; align-items:center;">
          <span class="calendar-day-num ${isWeekend ? 'weekend' : ''}">${day} <small style="font-size:0.65rem; color:var(--color-text-muted)">(${dayOfWeek})</small></span>
          ${entry.notes ? '<span title="備考あり" style="font-size:0.65rem;">💬</span>' : ''}
        </div>
        <div class="calendar-day-status ${stateBadge.class}">
          ${stateBadge.label}
        </div>
      </div>
    `;
  }

  // Preset reference list
  const presetListHTML = state.presets.map(p => `
    <div style="background:var(--color-surface-elevated); padding:8px 12px; border-radius:var(--radius-md); font-size:0.8rem; border:1px solid var(--color-border-subtle);">
      <strong>${p.name}</strong>: ${p.start_time} - ${p.end_time} (休憩 ${p.break_minutes}分)
    </div>
  `).join('');

  return `
    <div style="display:flex; flex-direction:column; gap:var(--space-4);">
      <!-- Staff Profile & Summary Banner -->
      <div class="glass-panel" style="padding:var(--space-4); border-radius:var(--radius-lg); display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:var(--space-3);">
        <div>
          <div style="display:flex; align-items:center; gap:var(--space-2);">
            <select id="staff-select-dropdown" class="form-select" style="font-weight:700;">
              ${state.members.map(m => `<option value="${m.id}" ${m.id === currentMember.id ? 'selected' : ''}>${m.name} (${m.role === 'admin' ? '管理者' : 'スタッフ'})</option>`).join('')}
            </select>
            <span style="font-size:0.85rem; color:var(--color-text-secondary);">の希望シフト</span>
          </div>
          <div style="font-size:0.8rem; color:var(--color-text-muted); margin-top:4px;">
            提出期限: ${state.period ? state.period.deadline.replace('T', ' ') : '2026/09/25 23:59'}
          </div>
        </div>

        <div style="display:flex; gap:var(--space-4); text-align:center;">
          <div>
            <div style="font-size:1.2rem; font-weight:800; color:var(--color-success);">${enteredDays}日</div>
            <div style="font-size:0.7rem; color:var(--color-text-muted);">入力済み</div>
          </div>
          <div>
            <div style="font-size:1.2rem; font-weight:800; color:${unsetDays > 0 ? 'var(--color-warning)' : 'var(--color-text-muted)'};">${unsetDays}日</div>
            <div style="font-size:0.7rem; color:var(--color-text-muted);">未入力 / 未定</div>
          </div>
        </div>
      </div>

      <!-- Calendar Container -->
      <div class="calendar-container">
        <div class="calendar-header">
          <h2 style="font-size:1.1rem; font-weight:700;">${year}年${monthIndex + 1}月 シフトカレンダー</h2>
          <button id="bulk-edit-btn" class="btn btn-secondary btn-sm">一括入力</button>
        </div>

        <div class="calendar-grid">
          <div class="calendar-weekday">日</div>
          <div class="calendar-weekday">月</div>
          <div class="calendar-weekday">火</div>
          <div class="calendar-weekday">水</div>
          <div class="calendar-weekday">木</div>
          <div class="calendar-weekday">金</div>
          <div class="calendar-weekday weekend">土</div>
          ${calendarDaysHTML}
        </div>
      </div>

      <!-- Shift Presets Reference -->
      <div class="glass-panel" style="padding:var(--space-4); border-radius:var(--radius-lg);">
        <h3 style="font-size:0.9rem; font-weight:700; margin-bottom:var(--space-2); color:var(--color-text-secondary);">シフトプリセット参照</h3>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:var(--space-2);">
          ${presetListHTML}
        </div>
      </div>
    </div>
  `;
}

function getStateBadge(entry) {
  switch (entry.state) {
    case 'full':
      return { label: '終日OK', class: 'state-full' };
    case 'until':
      return { label: `${entry.start_time || '○'}時まで`, class: 'state-until' };
    case 'from':
      return { label: `${entry.start_time || '○'}時から`, class: 'state-from' };
    case 'range':
      return { label: `${entry.start_time || '○'}〜${entry.end_time || '○'}`, class: 'state-range' };
    case 'unavailable':
      return { label: '出勤不可', class: 'state-unavailable' };
    case 'unset':
    default:
      return { label: '未入力', class: 'state-unset' };
  }
}

export function setupAvailabilityEvents(stateManager) {
  const staffDropdown = document.getElementById('staff-select-dropdown');
  if (staffDropdown) {
    staffDropdown.addEventListener('change', (e) => {
      stateManager.setCurrentMember(e.target.value);
    });
  }

  // Tapping a calendar day opens Day Availability Editor sheet
  const dayCells = document.querySelectorAll('.calendar-day');
  dayCells.forEach(cell => {
    cell.addEventListener('click', () => {
      const date = cell.getAttribute('data-date');
      stateManager.setSelectedDate(date);
      openDayAvailabilityEditor(stateManager, date);
    });
  });

  const bulkEditBtn = document.getElementById('bulk-edit-btn');
  if (bulkEditBtn) {
    bulkEditBtn.addEventListener('click', () => openBulkAvailabilityEditor(stateManager));
  }
}

function openDayAvailabilityEditor(stateManager, date) {
  const state = stateManager.state;
  const currentMember = state.members.find(m => m.id === state.currentMemberId);
  const existing = state.availability.find(a => a.member_id === currentMember.id && a.date === date) || {
    state: 'unset',
    start_time: '09:30',
    end_time: '18:30',
    notes: ''
  };

  const contentHTML = `
    <form id="day-avail-form" class="form-group">
      <div class="form-group">
        <label class="form-label">希望状況</label>
        <select id="avail-state-select" class="form-select">
          <option value="unset" ${existing.state === 'unset' ? 'selected' : ''}>未入力 / 未定に戻す</option>
          <option value="full" ${existing.state === 'full' ? 'selected' : ''}>終日OK</option>
          <option value="until" ${existing.state === 'until' ? 'selected' : ''}>○時まで</option>
          <option value="from" ${existing.state === 'from' ? 'selected' : ''}>○時から</option>
          <option value="range" ${existing.state === 'range' ? 'selected' : ''}>○時〜○時 (時間指定)</option>
          <option value="unavailable" ${existing.state === 'unavailable' ? 'selected' : ''}>出勤不可</option>
        </select>
      </div>

      <div id="time-range-fields" style="display:${['until', 'from', 'range'].includes(existing.state) ? 'flex' : 'none'}; gap:var(--space-2);">
        <div class="form-group" style="flex:1;">
          <label class="form-label">開始時間</label>
          <input type="time" id="avail-start-time" class="form-input" value="${existing.start_time || '09:30'}" step="900" />
        </div>
        <div class="form-group" style="flex:1;">
          <label class="form-label">終了時間</label>
          <input type="time" id="avail-end-time" class="form-input" value="${existing.end_time || '18:30'}" step="900" />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">備考・希望コメント</label>
        <input type="text" id="avail-notes" class="form-input" placeholder="例: 18時以降のみ可能、講義のため遅れます" value="${existing.notes || ''}" />
      </div>

      <div style="display:flex; justify-content:flex-end; gap:var(--space-2); margin-top:var(--space-3);">
        <button type="button" class="btn btn-secondary close-sheet-btn">キャンセル</button>
        <button type="submit" class="btn btn-primary">保存</button>
      </div>
    </form>
  `;

  createBottomSheet({
    title: `${date} 希望シフト編集`,
    contentHTML,
    onOpen: (body) => {
      const stateSelect = body.querySelector('#avail-state-select');
      const timeFields = body.querySelector('#time-range-fields');

      stateSelect.addEventListener('change', () => {
        if (['until', 'from', 'range'].includes(stateSelect.value)) {
          timeFields.style.display = 'flex';
        } else {
          timeFields.style.display = 'none';
        }
      });

      const form = body.querySelector('#day-avail-form');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const selectedState = stateSelect.value;
        const startTime = body.querySelector('#avail-start-time').value;
        const endTime = body.querySelector('#avail-end-time').value;
        const notes = body.querySelector('#avail-notes').value;

        await stateManager.saveAvailability({
          member_id: currentMember.id,
          date,
          state: selectedState,
          start_time: selectedState === 'until' ? startTime : (selectedState === 'from' || selectedState === 'range' ? startTime : null),
          end_time: selectedState === 'until' ? startTime : (selectedState === 'range' ? endTime : null),
          notes
        });

        closeBottomSheet();
        showToast(`${date} の希望を保存しました`);
      });
    }
  });
}

function openBulkAvailabilityEditor(stateManager) {
  const state = stateManager.state;
  const currentMember = state.members.find(m => m.id === state.currentMemberId);
  const [yearStr, monthStr] = state.currentMonthKey.split('-');
  const daysInMonth = getDaysInMonth(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1);

  const contentHTML = `
    <form id="bulk-avail-form" class="form-group">
      <div class="form-group">
        <label class="form-label">適用対象日</label>
        <select id="bulk-target-type" class="form-select">
          <option value="weekdays">平日全て (月〜金)</option>
          <option value="weekends">土日祝日全て</option>
          <option value="all">今月全日 (1日〜${daysInMonth}日)</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">一括設定する希望状態</label>
        <select id="bulk-state-select" class="form-select">
          <option value="full">終日OK</option>
          <option value="unavailable">出勤不可</option>
          <option value="unset">未入力にリセット</option>
        </select>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:var(--space-2); margin-top:var(--space-3);">
        <button type="button" class="btn btn-secondary close-sheet-btn">キャンセル</button>
        <button type="submit" class="btn btn-primary">一括適用</button>
      </div>
    </form>
  `;

  createBottomSheet({
    title: '希望シフト一括入力',
    contentHTML,
    onOpen: (body) => {
      const form = body.querySelector('#bulk-avail-form');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const targetType = body.querySelector('#bulk-target-type').value;
        const bulkState = body.querySelector('#bulk-state-select').value;

        const entries = [];
        const year = parseInt(yearStr, 10);
        const monthIndex = parseInt(monthStr, 10) - 1;

        for (let day = 1; day <= daysInMonth; day++) {
          const dateKey = formatDateKey(year, monthIndex, day);
          const dayOfWeek = getJapaneseDayOfWeek(year, monthIndex, day);
          const isWeekend = dayOfWeek === '土' || dayOfWeek === '日';

          let apply = false;
          if (targetType === 'all') apply = true;
          else if (targetType === 'weekdays' && !isWeekend) apply = true;
          else if (targetType === 'weekends' && isWeekend) apply = true;

          if (apply) {
            entries.push({
              member_id: currentMember.id,
              date: dateKey,
              state: bulkState,
              start_time: null,
              end_time: null,
              notes: ''
            });
          }
        }

        await stateManager.saveBulkAvailability(entries);
        closeBottomSheet();
        showToast(`${entries.length}日分の希望を一括保存しました`);
      });
    }
  });
}
