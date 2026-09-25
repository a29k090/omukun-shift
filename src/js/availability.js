// Staff Availability Calendar Component and Refactored Interactions
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
  const daysInMonth = getDaysInMonth(year, monthIndex);

  // Map member's availability entries
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

  // Formatting deadline
  const deadlineFormatted = state.period
    ? state.period.deadline.replace('T', ' ').substring(0, 16)
    : '2026/09/25 23:59';

  // Generate calendar cells
  let calendarDaysHTML = '';
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = formatDateKey(year, monthIndex, day);
    const dayOfWeek = getJapaneseDayOfWeek(year, monthIndex, day);
    const isWeekend = dayOfWeek === '土' || dayOfWeek === '日';
    const entry = memberAvailMap.get(dateKey) || { state: 'unset' };
    const tag = getAvailTagHTML(entry);
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

  // Multi-select toolbar if active
  const multiselectBarHTML = (multiSelectActive && selectedDatesSet.size > 0) ? `
    <div class="multiselect-bar">
      <span style="font-weight:700; font-size:0.8rem;">${selectedDatesSet.size}日 選択中</span>
      <div style="display:flex; gap:var(--space-2);">
        <button class="btn btn-secondary btn-sm bulk-apply-btn" data-bulk-state="full">終日</button>
        <button class="btn btn-secondary btn-sm bulk-apply-btn" data-bulk-state="unavailable">出勤不可</button>
        <button class="btn btn-secondary btn-sm bulk-apply-btn" data-bulk-state="unset">クリア</button>
      </div>
    </div>
  ` : '';

  return `
    <div style="display:flex; flex-direction:column; gap:var(--space-4);">
      <!-- Compact Editorial Metadata Header Strip -->
      <div class="workspace-header-strip">
        <div class="header-strip-meta">
          <div class="header-strip-item">
            <span class="header-strip-label">対象月</span>
            <span class="header-strip-value">${year}年${monthIndex + 1}月 希望シフト</span>
          </div>
          <div class="header-strip-divider"></div>
          <div class="header-strip-item">
            <span class="header-strip-label">提出期限</span>
            <span class="header-strip-value">${deadlineFormatted}</span>
          </div>
          <div class="header-strip-divider"></div>
          <div class="header-strip-item">
            <span class="header-strip-label">入力状況</span>
            <span class="header-strip-value ${unsetDays > 0 ? 'highlight-danger' : 'highlight-success'}">
              ${enteredDays} / ${daysInMonth}日 入力済み
            </span>
          </div>
        </div>

        <div style="display:flex; align-items:center; gap:var(--space-2);">
          <button id="multi-select-toggle-btn" class="btn ${multiSelectActive ? 'btn-active' : 'btn-secondary'} btn-sm">
            ${multiSelectActive ? '✕ 選択終了' : '☑ 複数選択'}
          </button>
        </div>
      </div>

      <!-- Main Calendar Grid Table -->
      <div class="calendar-surface">
        <div class="calendar-surface-header">
          <span style="font-weight:800; font-size:0.95rem;">${year}年${monthIndex + 1}月 カレンダー</span>
          <span style="font-size:0.75rem; color:var(--color-text-muted);">
            ${multiSelectActive ? '日付をタップして複数選択してください' : '日付をタップして勤務可能時間を設定'}
          </span>
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

function getAvailTagHTML(entry) {
  switch (entry.state) {
    case 'full':
      return `<div class="avail-tag avail-tag-full">終日OK</div>`;
    case 'until':
      return `<div class="avail-tag avail-tag-until">〜${entry.start_time || '18:00'}</div>`;
    case 'from':
      return `<div class="avail-tag avail-tag-from">${entry.start_time || '12:00'}〜</div>`;
    case 'range':
      return `<div class="avail-tag avail-tag-range">${entry.start_time || '09:30'}–${entry.end_time || '18:30'}</div>`;
    case 'unavailable':
      return `<div class="avail-tag avail-tag-unavailable">× 不可</div>`;
    case 'unset':
    default:
      return `<div class="avail-tag avail-tag-unset">未入力</div>`;
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
        start_time: null,
        end_time: null,
        notes: ''
      }));

      await stateManager.saveBulkAvailability(entries);
      showToast(`${entries.length}日分の希望を一括保存しました`);
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
    { value: 'full', label: '終日OK', desc: '開所全時間帯勤務可能' },
    { value: 'range', label: '時間指定', desc: '勤務可能な時間帯を指定' },
    { value: 'unavailable', label: '出勤不可', desc: 'この日はシフトに入れません' },
    { value: 'unset', label: '未設定（リセット）', desc: '未入力状態に戻します' }
  ];

  const radioRowsHTML = radioOptions.map(opt => `
    <div class="radio-select-row ${existing.state === opt.value ? 'selected' : ''}" data-val="${opt.value}">
      <div>
        <div style="font-size:0.85rem; font-weight:700;">${opt.label}</div>
        <div style="font-size:0.7rem; color:var(--color-text-muted);">${opt.desc}</div>
      </div>
      <div class="radio-indicator"></div>
    </div>
  `).join('');

  const isTimeRequired = existing.state === 'range' || existing.state === 'until' || existing.state === 'from';

  const contentHTML = `
    <form id="day-avail-form" class="form-group" style="gap:var(--space-3);">
      <div style="font-size:1rem; font-weight:800; border-bottom:1px solid var(--color-border); padding-bottom:var(--space-2);">
        ${parseInt(m, 10)}月${parseInt(d, 10)}日 (${dayOfWeek}) の勤務希望
      </div>

      <div class="radio-select-group" id="avail-radio-group">
        ${radioRowsHTML}
      </div>
      <input type="hidden" id="avail-state-input" value="${existing.state}" />

      <div id="time-range-box" style="display:${isTimeRequired ? 'flex' : 'none'}; gap:var(--space-2); align-items:center; background:var(--color-surface-subtle); padding:var(--space-3); border-radius:var(--radius-sm);">
        <div class="form-group" style="flex:1;">
          <label class="form-label">開始時間</label>
          <input type="time" id="avail-start-time" class="form-input" value="${existing.start_time || '09:30'}" step="900" />
        </div>
        <span style="font-weight:700; color:var(--color-text-muted); margin-top:16px;">→</span>
        <div class="form-group" style="flex:1;">
          <label class="form-label">終了時間</label>
          <input type="time" id="avail-end-time" class="form-input" value="${existing.end_time || '18:30'}" step="900" />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">備考・コメント（任意）</label>
        <input type="text" id="avail-notes" class="form-input" placeholder="例: 18時以降のみ可能" value="${existing.notes || ''}" />
      </div>

      <div style="display:flex; justify-content:flex-end; gap:var(--space-2); margin-top:var(--space-2);">
        <button type="button" class="btn btn-secondary close-sheet-btn">キャンセル</button>
        <button type="submit" class="btn btn-primary">完了・保存</button>
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
