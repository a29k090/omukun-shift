// Staff Availability Calendar Component and Clean Input Interactions
import { getDaysInMonth, formatDateKey, getJapaneseDayOfWeek } from './dates.js';
import { createBottomSheet, closeBottomSheet, showToast } from './ui.js';

// Local UI state for multi-date selection in Staff mode
let multiSelectActive = false;
const selectedDatesSet = new Set();

export function renderStaffAvailabilityView(state) {
  const currentMember = state.members.find(m => m.id === state.currentMemberId) || state.members[0];
  const [yearStr, monthStr] = state.currentMonthKey.split('-');
  const year = parseInt(yearStr, 10);
  const monthIndex = parseInt(monthStr, 10) - 1;
  const month = monthIndex + 1;
  const daysInMonth = getDaysInMonth(year, monthIndex);

  // Map member's availability entries
  const memberAvailMap = new Map();
  state.availability
    .filter(a => a.member_id === currentMember.id)
    .forEach(a => memberAvailMap.set(a.date, a));

  let enteredDays = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = formatDateKey(year, monthIndex, day);
    const entry = memberAvailMap.get(dateKey);
    if (entry && entry.state && entry.state !== 'unset') {
      enteredDays++;
    }
  }

  // Formatting deadline
  let deadlineFormatted = '9月25日 23:59';
  if (state.period && state.period.deadline) {
    const dlStr = state.period.deadline.replace('T', ' ');
    const parts = dlStr.split(' ');
    const dateParts = parts[0].split('-');
    if (dateParts.length === 3) {
      deadlineFormatted = `${parseInt(dateParts[1], 10)}月${parseInt(dateParts[2], 10)}日 ${parts[1] ? parts[1].substring(0, 5) : '23:59'}`;
    }
  }

  // Generate calendar cells
  let calendarDaysHTML = '';
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = formatDateKey(year, monthIndex, day);
    const dayOfWeek = getJapaneseDayOfWeek(year, monthIndex, day);
    const isWeekend = dayOfWeek === '土' || dayOfWeek === '日';
    const entry = memberAvailMap.get(dateKey) || { state: 'unset' };
    const tag = getAvailTextHTML(entry);
    const isSelected = multiSelectActive ? selectedDatesSet.has(dateKey) : state.selectedDate === dateKey;

    calendarDaysHTML += `
      <div class="calendar-cell ${isSelected ? 'selected' : ''}" data-date="${dateKey}">
        <div class="calendar-cell-top">
          <span class="calendar-cell-num ${isWeekend ? 'weekend' : ''}">
            ${day}<small class="calendar-cell-dayofweek">(${dayOfWeek})</small>
          </span>
          ${entry.notes ? '<span title="備考あり" style="font-size:0.65rem; color:var(--color-text-muted);">💬</span>' : ''}
        </div>
        <div style="margin-top:auto; width:100%; text-align:center;">
          ${tag}
        </div>
      </div>
    `;
  }

  // Multi-select toolbar if active and dates selected
  const multiselectBarHTML = (multiSelectActive && selectedDatesSet.size > 0) ? `
    <div class="multiselect-bar">
      <span style="font-weight:800; font-size:0.85rem;">${selectedDatesSet.size}日 選択中</span>
      <div style="display:flex; gap:var(--space-2);">
        <button class="btn btn-secondary btn-sm bulk-apply-btn" data-bulk-state="full">終日</button>
        <button class="btn btn-secondary btn-sm bulk-apply-btn" data-bulk-state="range">時間指定</button>
        <button class="btn btn-secondary btn-sm bulk-apply-btn" data-bulk-state="unavailable">出勤不可</button>
        <button class="btn btn-secondary btn-sm bulk-apply-btn" data-bulk-state="unset">未定</button>
      </div>
    </div>
  ` : '';

  return `
    <div style="display:flex; flex-direction:column; gap:var(--space-4);">
      <!-- Clean Typography Header -->
      <div style="display:flex; flex-wrap:wrap; align-items:baseline; justify-content:space-between; gap:var(--space-3); border-bottom:1px solid var(--color-border); padding-bottom:var(--space-3);">
        <div>
          <h1 style="font-size:1.5rem; font-weight:900; letter-spacing:-0.02em; color:var(--color-text);">${month}月の希望シフト</h1>
        </div>

        <div style="display:flex; align-items:center; gap:var(--space-3); font-size:0.825rem; color:var(--color-text-secondary);">
          <span>提出期限 <strong style="color:var(--color-text); font-weight:800;">${deadlineFormatted}</strong></span>
          <span style="color:var(--color-border);">|</span>
          <span>進捗 <strong style="color:var(--color-text); font-weight:800;">${enteredDays} / ${daysInMonth}日入力済み</strong></span>
        </div>
      </div>

      <!-- Main Calendar Grid Table -->
      <div class="calendar-surface">
        <div class="calendar-surface-header">
          <span style="font-weight:800; font-size:0.9rem;">${year}年${month}月 カレンダー</span>
          <button id="multi-select-toggle-btn" class="btn ${multiSelectActive ? 'btn-active' : 'btn-secondary'} btn-sm">
            ${multiSelectActive ? '✕ 選択終了' : '☑ 複数選択'}
          </button>
        </div>

        <div class="calendar-grid-table">
          <div class="calendar-weekday-cell weekend">日</div>
          <div class="calendar-weekday-cell">月</div>
          <div class="calendar-weekday-cell">火</div>
          <div class="calendar-weekday-cell">水</div>
          <div class="calendar-weekday-cell">木</div>
          <div class="calendar-weekday-cell">金</div>
          <div class="calendar-weekday-cell weekend">土</div>
          ${calendarDaysHTML}
        </div>
      </div>

      ${multiselectBarHTML}
    </div>
  `;
}

function getAvailTextHTML(entry) {
  if (!entry || !entry.state || entry.state === 'unset') {
    return `<div class="avail-text avail-text-undecided">未定</div>`;
  }
  switch (entry.state) {
    case 'full':
      return `<div class="avail-text avail-text-full">終日</div>`;
    case 'until':
      return `<div class="avail-text avail-text-until">〜${entry.start_time || '18:00'}</div>`;
    case 'from':
      return `<div class="avail-text avail-text-from">${entry.start_time || '12:00'}〜</div>`;
    case 'range':
      return `<div class="avail-text avail-text-range">${entry.start_time || '09:30'}–${entry.end_time || '18:30'}</div>`;
    case 'unavailable':
      return `<div class="avail-text avail-text-unavailable">×</div>`;
    default:
      return `<div class="avail-text avail-text-undecided">未定</div>`;
  }
}

export function setupAvailabilityEvents(stateManager) {
  // Toggle multi-select mode
  const toggleBtn = document.getElementById('multi-select-toggle-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      multiSelectActive = !multiSelectActive;
      selectedDatesSet.clear();
      stateManager.notify();
    });
  }

  // Tapping calendar day cells
  const dayCells = document.querySelectorAll('.calendar-cell');
  dayCells.forEach(cell => {
    cell.addEventListener('click', () => {
      const date = cell.getAttribute('data-date');
      stateManager.setSelectedDate(date);

      if (multiSelectActive) {
        if (selectedDatesSet.has(date)) {
          selectedDatesSet.delete(date);
        } else {
          selectedDatesSet.add(date);
        }
        stateManager.notify();
      } else {
        openDayAvailabilityEditor(stateManager, date);
      }
    });
  });

  // Bulk apply button in multi-select toolbar
  const bulkBtns = document.querySelectorAll('.bulk-apply-btn');
  bulkBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      const targetState = btn.getAttribute('data-bulk-state');
      const currentMember = stateManager.state.members.find(m => m.id === stateManager.state.currentMemberId) || stateManager.state.members[0];

      const entries = Array.from(selectedDatesSet).map(d => ({
        member_id: currentMember.id,
        date: d,
        state: targetState,
        start_time: targetState === 'range' ? '09:30' : null,
        end_time: targetState === 'range' ? '18:30' : null,
        notes: ''
      }));

      await stateManager.saveBulkAvailability(entries);
      showToast(`${entries.length}日分の希望を保存しました`);
      selectedDatesSet.clear();
      multiSelectActive = false;
      stateManager.notify();
    });
  });
}

function openDayAvailabilityEditor(stateManager, date) {
  const state = stateManager.state;
  const currentMember = state.members.find(m => m.id === state.currentMemberId) || state.members[0];
  const existing = state.availability.find(a => a.member_id === currentMember.id && a.date === date) || {
    state: 'unset',
    start_time: '09:30',
    end_time: '18:30',
    notes: ''
  };

  const [y, m, d] = date.split('-');
  const dayOfWeek = getJapaneseDayOfWeek(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));

  const radioOptions = [
    { value: 'full', label: '○ 終日' },
    { value: 'range', label: '○ 時間を指定' },
    { value: 'unavailable', label: '○ 出勤できない' },
    { value: 'unset', label: '○ 未定' }
  ];

  const radioRowsHTML = radioOptions.map(opt => `
    <div class="radio-select-row ${existing.state === opt.value ? 'selected' : ''}" data-val="${opt.value}">
      <span style="font-size:0.875rem; font-weight:700;">${opt.label}</span>
      <div class="radio-indicator"></div>
    </div>
  `).join('');

  const isTimeRequired = existing.state === 'range' || existing.state === 'until' || existing.state === 'from';

  const contentHTML = `
    <form id="day-avail-form" class="form-group" style="gap:var(--space-3);">
      <div style="font-size:1.1rem; font-weight:800; border-bottom:1px solid var(--color-border); padding-bottom:var(--space-2);">
        ${parseInt(m, 10)}月${parseInt(d, 10)}日（${dayOfWeek}）
      </div>

      <div style="font-size:0.75rem; font-weight:800; color:var(--color-text-secondary); margin-top:4px;">勤務できる時間</div>

      <div class="radio-select-group" id="avail-radio-group">
        ${radioRowsHTML}
      </div>
      <input type="hidden" id="avail-state-input" value="${existing.state}" />

      <div id="time-range-box" style="display:${isTimeRequired ? 'flex' : 'none'}; gap:var(--space-2); align-items:center; background:var(--color-surface-subtle); padding:var(--space-3); border-radius:var(--radius-xs);">
        <div class="form-group" style="flex:1;">
          <label class="form-label">開始</label>
          <input type="time" id="avail-start-time" class="form-input" value="${existing.start_time || '09:30'}" step="900" />
        </div>
        <span style="font-weight:700; color:var(--color-text-muted); margin-top:16px;">→</span>
        <div class="form-group" style="flex:1;">
          <label class="form-label">終了</label>
          <input type="time" id="avail-end-time" class="form-input" value="${existing.end_time || '18:30'}" step="900" />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">備考</label>
        <input type="text" id="avail-notes" class="form-input" placeholder="例: 大学の授業後なら勤務可能" value="${existing.notes || ''}" />
      </div>

      <div style="display:flex; justify-content:flex-end; gap:var(--space-2); margin-top:var(--space-2);">
        <button type="button" class="btn btn-secondary close-sheet-btn">キャンセル</button>
        <button type="submit" class="btn btn-primary">保存</button>
      </div>
    </form>
  `;

  createBottomSheet({
    title: '',
    contentHTML,
    onOpen: (body) => {
      const radioRows = body.querySelectorAll('.radio-select-row');
      const hiddenState = body.querySelector('#avail-state-input');
      const timeBox = body.querySelector('#time-range-box');

      radioRows.forEach(row => {
        row.addEventListener('click', () => {
          const val = row.getAttribute('data-val');
          radioRows.forEach(r => r.classList.remove('selected'));
          row.classList.add('selected');
          hiddenState.value = val;

          if (val === 'range') {
            timeBox.style.display = 'flex';
          } else {
            timeBox.style.display = 'none';
          }
        });
      });

      const form = body.querySelector('#day-avail-form');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const selectedState = hiddenState.value;
        const startTime = body.querySelector('#avail-start-time').value;
        const endTime = body.querySelector('#avail-end-time').value;
        const notes = body.querySelector('#avail-notes').value;

        await stateManager.saveAvailability({
          member_id: currentMember.id,
          date,
          state: selectedState,
          start_time: selectedState === 'range' ? startTime : null,
          end_time: selectedState === 'range' ? endTime : null,
          notes
        });

        closeBottomSheet();
        showToast(`${date} の希望を保存しました`);
      });
    }
  });
}
