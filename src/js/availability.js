// Staff Availability Calendar Component and Refactored Interactions
import { getDaysInMonth, formatDateKey, getJapaneseDayOfWeek } from './dates.js';
import { createBottomSheet, closeBottomSheet, showToast } from './ui.js';

export function renderStaffAvailabilityView(state) {
  const currentMember = state.members.find(m => m.id === state.currentMemberId) || state.members[0];
  const [yearStr, monthStr] = state.currentMonthKey.split('-');
  const year = parseInt(yearStr, 10);
  const monthIndex = parseInt(monthStr, 10) - 1;
  const daysInMonth = getDaysInMonth(year, monthIndex);

  // Calculate statistics for current member
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
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span class="calendar-day-num ${isWeekend ? 'weekend' : ''}">${day} <small style="font-size:0.7rem; font-weight:500; color:var(--color-text-muted)">(${dayOfWeek})</small></span>
          ${entry.notes ? '<span title="備考あり" style="font-size:0.75rem;">💬</span>' : ''}
        </div>
        <div class="calendar-day-status ${stateBadge.class}">
          ${stateBadge.label}
        </div>
      </div>
    `;
  }

  const deadlineFormatted = state.period
    ? state.period.deadline.replace('T', ' ').substring(0, 16)
    : '2026/09/25 23:59';

  return `
    <div style="display:flex; flex-direction:column; gap:var(--space-5);">
      <!-- Staff Status Summary Banner (Simplified & Focused) -->
      <div class="summary-bar">
        <div class="summary-card">
          <span class="summary-card-label">対象月</span>
          <span class="summary-card-value">${year}年${monthIndex + 1}月</span>
          <span class="summary-card-sub">${currentMember.name} さんの希望シフト</span>
        </div>

        <div class="summary-card ${unsetDays > 0 ? 'alert' : 'success'}">
          <span class="summary-card-label">提出状況</span>
          <span class="summary-card-value" style="color: ${unsetDays > 0 ? 'var(--color-danger)' : 'var(--color-success)'}">
            ${enteredDays} <small style="font-size:0.8rem; font-weight:600;">/ ${daysInMonth}日 入力済</small>
          </span>
          <span class="summary-card-sub">${unsetDays > 0 ? `残り ${unsetDays}日 未入力` : '全日入力完了'}</span>
        </div>

        <div class="summary-card">
          <span class="summary-card-label">提出期限</span>
          <span class="summary-card-value" style="font-size:1.15rem;">${deadlineFormatted}</span>
          <span class="summary-card-sub">期限内の変更・再提出が可能です</span>
        </div>
      </div>

      <!-- Calendar Container -->
      <div class="calendar-container">
        <div class="calendar-header">
          <div>
            <h2 style="font-size:1.2rem; font-weight:800; letter-spacing:-0.02em;">${year}年${monthIndex + 1}月 シフト希望入力</h2>
            <p style="font-size:0.8rem; color:var(--color-text-secondary); margin-top:2px;">日付をタップしてご自身の勤務希望（時間・可否）を設定してください</p>
          </div>
          <button id="bulk-edit-btn" class="btn btn-secondary btn-sm">⚡️ 一括入力</button>
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
  const currentMember = state.members.find(m => m.id === state.currentMemberId) || state.members[0];
  const existing = state.availability.find(a => a.member_id === currentMember.id && a.date === date) || {
    state: 'unset',
    start_time: '09:30',
    end_time: '18:30',
    notes: ''
  };

  const stateOptions = [
    { value: 'full', icon: '🟢', title: '終日OK', desc: '開所時間から閉所時間までいつでも可' },
    { value: 'until', icon: '⏰', title: '○時まで', desc: '指定した時間まで勤務可能' },
    { value: 'from', icon: '⏳', title: '○時から', desc: '指定した時間から勤務可能' },
    { value: 'range', icon: '🎯', title: '時間指定', desc: '開始と終了の時間を指定' },
    { value: 'unavailable', icon: '❌', title: '出勤不可', desc: 'この日はシフトに入れません' },
    { value: 'unset', icon: '⚪️', title: '未設定に戻す', desc: '入力内容をリセット' }
  ];

  const stateCardsHTML = stateOptions.map(opt => `
    <div class="state-option-card ${existing.state === opt.value ? 'selected' : ''}" data-value="${opt.value}">
      <span class="state-option-icon">${opt.icon}</span>
      <div>
        <div class="state-option-title">${opt.title}</div>
        <div class="state-option-desc">${opt.desc}</div>
      </div>
    </div>
  `).join('');

  const contentHTML = `
    <form id="day-avail-form" class="form-group" style="gap:var(--space-4);">
      <div class="form-group">
        <label class="form-label">希望の働き方を選択</label>
        <div class="state-option-grid" id="state-option-grid">
          ${stateCardsHTML}
        </div>
        <input type="hidden" id="avail-state-input" value="${existing.state}" />
      </div>

      <div id="time-range-fields" style="display:${['until', 'from', 'range'].includes(existing.state) ? 'flex' : 'none'}; gap:var(--space-3); background:var(--color-surface-subtle); padding:var(--space-3); border-radius:var(--radius-md);">
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
        <label class="form-label">備考・特記事項（任意）</label>
        <input type="text" id="avail-notes" class="form-input" placeholder="例: 18時以降のみ可能、講義のため遅れます" value="${existing.notes || ''}" />
      </div>

      <div style="display:flex; justify-content:flex-end; gap:var(--space-2); margin-top:var(--space-2);">
        <button type="button" class="btn btn-secondary close-sheet-btn">キャンセル</button>
        <button type="submit" class="btn btn-primary">保存する</button>
      </div>
    </form>
  `;

  createBottomSheet({
    title: `${date} のシフト希望入力`,
    contentHTML,
    onOpen: (body) => {
      const stateCards = body.querySelectorAll('.state-option-card');
      const stateInput = body.querySelector('#avail-state-input');
      const timeFields = body.querySelector('#time-range-fields');

      stateCards.forEach(card => {
        card.addEventListener('click', () => {
          const val = card.getAttribute('data-value');
          stateCards.forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          stateInput.value = val;

          if (['until', 'from', 'range'].includes(val)) {
            timeFields.style.display = 'flex';
          } else {
            timeFields.style.display = 'none';
          }
        });
      });

      const form = body.querySelector('#day-avail-form');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const selectedState = stateInput.value;
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
  const currentMember = state.members.find(m => m.id === state.currentMemberId) || state.members[0];
  const [yearStr, monthStr] = state.currentMonthKey.split('-');
  const daysInMonth = getDaysInMonth(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1);

  const contentHTML = `
    <form id="bulk-avail-form" class="form-group" style="gap:var(--space-4);">
      <div class="form-group">
        <label class="form-label">適用する曜日・範囲</label>
        <select id="bulk-target-type" class="form-select">
          <option value="weekdays">平日全て (月〜金)</option>
          <option value="weekends">土日祝日全て</option>
          <option value="all">今月全日 (1日〜${daysInMonth}日)</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">一括設定する希望状態</label>
        <select id="bulk-state-select" class="form-select">
          <option value="full">🟢 終日OK</option>
          <option value="unavailable">❌ 出勤不可</option>
          <option value="unset">⚪️ 未入力にリセット</option>
        </select>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:var(--space-2); margin-top:var(--space-2);">
        <button type="button" class="btn btn-secondary close-sheet-btn">キャンセル</button>
        <button type="submit" class="btn btn-primary">一括適用する</button>
      </div>
    </form>
  `;

  createBottomSheet({
    title: '希望シフト一括設定',
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
