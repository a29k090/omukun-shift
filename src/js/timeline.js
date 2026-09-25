// Manager Workspace - Month View & Day Timeline Modes
import { getDaysInMonth, formatDateKey, getJapaneseDayOfWeek, parseTimeMinutes } from './dates.js';
import { createBottomSheet, closeBottomSheet, showToast } from './ui.js';
import { openShiftCreationModal, runAutoScheduler } from './scheduler.js';
import { renderLaborCostPanel } from './costs.js';
import { exportSchedulePNG } from './export.js';
import { calculateDayShortages, calculateManagerSummary, formatCurrency } from './utils.js';

export function renderManagerWorkspaceView(state) {
  const isMonthView = state.managerViewMode === 'month';
  const summary = calculateManagerSummary(state);

  return `
    <div style="display:flex; flex-direction:column; gap:var(--space-5);">
      <!-- Manager Top KPI Summary Bar (Developer Control Layer) -->
      <div class="summary-bar">
        <div class="summary-card">
          <span class="summary-card-label">スタッフ提出数</span>
          <span class="summary-card-value">${summary.submittedStaffCount} <small style="font-size:0.8rem; font-weight:600;">/ ${summary.totalStaffCount}名</small></span>
          <span class="summary-card-sub">${summary.submittedStaffCount === summary.totalStaffCount ? '全員提出完了' : '未提出者あり'}</span>
        </div>

        <div class="summary-card ${summary.unresolvedDaysCount > 0 ? 'alert' : 'success'}">
          <span class="summary-card-label">人員不足（要調整）</span>
          <span class="summary-card-value" style="color:${summary.unresolvedDaysCount > 0 ? 'var(--color-danger)' : 'var(--color-success)'}">
            ${summary.unresolvedDaysCount} <small style="font-size:0.8rem; font-weight:600;">日</small>
          </span>
          <span class="summary-card-sub">${summary.unresolvedDaysCount > 0 ? `合計 ${summary.totalShortageDeficit}枠 の不足あり` : '全日程の必要人員クリア'}</span>
        </div>

        <div class="summary-card">
          <span class="summary-card-label">総勤務時間 / 概算人件費</span>
          <span class="summary-card-value">${summary.totalScheduledHours.toFixed(1)} <small style="font-size:0.8rem; font-weight:600;">h</small></span>
          <span class="summary-card-sub">${formatCurrency(summary.totalEstimatedCost)}</span>
        </div>

        <div class="summary-card ${summary.limitWarningCount > 0 ? 'alert' : ''}">
          <span class="summary-card-label">制約アラート</span>
          <span class="summary-card-value">${summary.limitWarningCount} <small style="font-size:0.8rem; font-weight:600;">件</small></span>
          <span class="summary-card-sub">${summary.limitWarningCount > 0 ? '月間上限/下限の調整が必要' : '労働時間制約クリア'}</span>
        </div>
      </div>

      <!-- Manager Workspace Control Bar -->
      <div style="display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:var(--space-3); background:#ffffff; padding:var(--space-3) var(--space-4); border-radius:var(--radius-lg); border:1px solid var(--color-border);">
        <div style="display:flex; align-items:center; gap:var(--space-3);">
          <div class="segmented-control">
            <button id="mgr-mode-timeline-btn" class="segmented-btn ${!isMonthView ? 'active' : ''}">1日タイムライン</button>
            <button id="mgr-mode-month-btn" class="segmented-btn ${isMonthView ? 'active' : ''}">月間全体図</button>
          </div>

          <div style="display:flex; align-items:center; gap:var(--space-2);">
            <label for="mgr-date-picker" style="font-size:0.8rem; font-weight:700; color:var(--color-text-secondary);">対象日:</label>
            <input type="date" id="mgr-date-picker" class="form-input" value="${state.selectedDate}" style="padding:4px 10px; font-weight:700; font-size:0.85rem;" />
          </div>
        </div>

        <div style="display:flex; align-items:center; gap:var(--space-2);">
          <button id="ai-generate-btn" class="btn btn-accent btn-sm">✨ AIで仮シフトを自動生成</button>
          <button id="export-png-btn" class="btn btn-secondary btn-sm">📷 PNG画像出力</button>
        </div>
      </div>

      <!-- Main View Content -->
      ${isMonthView ? renderManagerMonthView(state) : renderManagerDayTimelineView(state)}

      <!-- Manager-Only Labor Cost & Constraint Panel -->
      ${renderLaborCostPanel(state)}
    </div>
  `;
}

// Manager Month View Component with Explicit Shortage Previews
function renderManagerMonthView(state) {
  const [yearStr, monthStr] = state.currentMonthKey.split('-');
  const year = parseInt(yearStr, 10);
  const monthIndex = parseInt(monthStr, 10) - 1;
  const daysInMonth = getDaysInMonth(year, monthIndex);

  let monthGridHTML = '';
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = formatDateKey(year, monthIndex, day);
    const dayOfWeek = getJapaneseDayOfWeek(year, monthIndex, day);
    const isWeekend = dayOfWeek === '土' || dayOfWeek === '日';

    const dayAssignments = state.assignments.filter(a => a.date === dateKey);
    const isSelected = state.selectedDate === dateKey;
    const dayShortage = calculateDayShortages(dateKey, state);

    // iPad / Desktop multi-slot shortage list
    const richShortageHTML = dayShortage.hasShortage ? `
      <div class="shortage-badge-rich">
        ${dayShortage.shortageItems.map(item => `
          <div class="shortage-slot-item">⚠️ ${item.timeStart}–${item.timeEnd} ${item.deficit}名不足</div>
        `).join('')}
      </div>
    ` : '';

    // iPhone compact shortage badge
    const compactShortageHTML = dayShortage.hasShortage ? `
      <div class="shortage-badge-compact">⚠️ ${dayShortage.summaryText}</div>
    ` : '';

    monthGridHTML += `
      <div class="calendar-day ${isSelected ? 'selected' : ''} ${dayShortage.hasShortage ? 'has-shortage' : ''}" data-mgr-date="${dateKey}">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span class="calendar-day-num ${isWeekend ? 'weekend' : ''}">${day} <small style="font-size:0.65rem; color:var(--color-text-muted)">(${dayOfWeek})</small></span>
          <span style="font-size:0.7rem; font-weight:700; color:${dayAssignments.length > 0 ? 'var(--color-text)' : 'var(--color-text-muted)'};">${dayAssignments.length}名配置</span>
        </div>

        ${compactShortageHTML}
        ${richShortageHTML}

        <div style="font-size:0.7rem; display:flex; flex-direction:column; gap:2px; margin-top:6px;">
          ${dayAssignments.slice(0, 3).map(a => {
            const member = state.members.find(m => m.id === a.member_id);
            return `
              <div style="background:${member ? member.color : '#555'}; color:#ffffff; padding:1px 5px; border-radius:3px; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:0.675rem;">
                ${member ? member.name.split(' ')[0] : 'スタッフ'} (${a.start_time.split(':')[0]}-${a.end_time.split(':')[0]})
              </div>
            `;
          }).join('')}
          ${dayAssignments.length > 3 ? `<div style="font-size:0.65rem; font-weight:600; color:var(--color-text-muted);">+他 ${dayAssignments.length - 3}名</div>` : ''}
        </div>
      </div>
    `;
  }

  return `
    <div class="calendar-container">
      <div class="calendar-header">
        <div>
          <h2 style="font-size:1.15rem; font-weight:800;">${year}年${monthIndex + 1}月 全体月間シフト & 不足検知</h2>
          <p style="font-size:0.8rem; color:var(--color-text-secondary); margin-top:2px;">セルをタップすると対象日の詳細タイムライン編集に移動します</p>
        </div>
      </div>
      <div class="calendar-grid">
        <div class="calendar-weekday">日</div>
        <div class="calendar-weekday">月</div>
        <div class="calendar-weekday">火</div>
        <div class="calendar-weekday">水</div>
        <div class="calendar-weekday">木</div>
        <div class="calendar-weekday">金</div>
        <div class="calendar-weekday weekend">土</div>
        ${monthGridHTML}
      </div>
    </div>
  `;
}

// Manager Day Timeline View Component
function renderManagerDayTimelineView(state) {
  const selectedDate = state.selectedDate;
  const storeOpenMinutes = parseTimeMinutes(state.store ? state.store.default_open_time : '09:00');
  const storeCloseMinutes = parseTimeMinutes(state.store ? state.store.default_close_time : '21:30');
  const totalTimelineMinutes = storeCloseMinutes - storeOpenMinutes;

  const dayShortage = calculateDayShortages(selectedDate, state);

  // Timeline Hour Headers (9, 10, 11, ... 21)
  const hours = [];
  for (let m = storeOpenMinutes; m <= storeCloseMinutes; m += 60) {
    hours.push(Math.floor(m / 60));
  }

  const hourHeadersHTML = hours.map(h => `<div class="timeline-hour-cell">${h}:00</div>`).join('');

  // Staff Timeline Rows
  const staffRowsHTML = state.members.map(member => {
    // Member's submitted availability for this date
    const avail = state.availability.find(a => a.member_id === member.id && a.date === selectedDate);
    // Member's assigned shifts for this date
    const asgs = state.assignments.filter(a => a.member_id === member.id && a.date === selectedDate);

    // Render translucent availability block
    let availBlockHTML = '';
    if (avail && avail.state !== 'unavailable' && avail.state !== 'unset') {
      let startM = storeOpenMinutes;
      let endM = storeCloseMinutes;

      if (avail.state === 'until' && avail.start_time) endM = parseTimeMinutes(avail.start_time);
      if (avail.state === 'from' && avail.start_time) startM = parseTimeMinutes(avail.start_time);
      if (avail.state === 'range' && avail.start_time && avail.end_time) {
        startM = parseTimeMinutes(avail.start_time);
        endM = parseTimeMinutes(avail.end_time);
      }

      const leftPct = Math.max(0, ((startM - storeOpenMinutes) / totalTimelineMinutes) * 100);
      const widthPct = Math.min(100 - leftPct, ((endM - startM) / totalTimelineMinutes) * 100);

      availBlockHTML = `
        <div class="avail-block" style="left:${leftPct}%; width:${widthPct}%; color:${member.color};" title="希望: ${avail.state}"></div>
      `;
    }

    // Render solid shift assignment blocks
    const shiftBlocksHTML = asgs.map(asg => {
      const startM = parseTimeMinutes(asg.start_time);
      const endM = parseTimeMinutes(asg.end_time);
      const leftPct = Math.max(0, ((startM - storeOpenMinutes) / totalTimelineMinutes) * 100);
      const widthPct = Math.min(100 - leftPct, ((endM - startM) / totalTimelineMinutes) * 100);

      let breakHTML = '';
      if (asg.break_minutes > 0) {
        const breakPct = (asg.break_minutes / (endM - startM)) * 100;
        breakHTML = `<div class="break-overlay" style="left:30%; width:${breakPct}%;" title="休憩 ${asg.break_minutes}分"></div>`;
      }

      return `
        <div class="shift-block" data-asg-id="${asg.id}" style="left:${leftPct}%; width:${widthPct}%; background:${member.color};">
          <div class="shift-resize-handle left" data-resize="left" data-asg-id="${asg.id}"></div>
          <span style="position:relative; z-index:2; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${asg.start_time}-${asg.end_time}</span>
          ${breakHTML}
          <div class="shift-resize-handle right" data-resize="right" data-asg-id="${asg.id}"></div>
        </div>
      `;
    }).join('');

    return `
      <div class="timeline-row" data-member-id="${member.id}">
        <div class="timeline-staff-label">
          <span class="staff-dot" style="background:${member.color};"></span>
          <span>${member.name}</span>
        </div>
        <div class="timeline-track" data-track-member="${member.id}">
          ${availBlockHTML}
          ${shiftBlocksHTML}
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="timeline-workspace">
      <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:var(--space-2); margin-bottom:var(--space-2);">
        <div>
          <h2 style="font-size:1.1rem; font-weight:800;">${selectedDate} タイムライン配置 & 調整</h2>
          <p style="font-size:0.8rem; color:var(--color-text-secondary); margin-top:2px;">空きトラックをタップして新規配置、シフトタップで編集・削除</p>
        </div>

        ${dayShortage.hasShortage ? `
          <div style="background:var(--color-danger-bg); border:1px solid var(--color-danger-border); color:var(--color-danger-text); padding:4px 12px; border-radius:var(--radius-md); font-size:0.8rem; font-weight:700;">
            ⚠️ 本日の人員不足: ${dayShortage.summaryText}
          </div>
        ` : `
          <div style="background:var(--color-success-bg); border:1px solid var(--color-success-border); color:var(--color-success); padding:4px 12px; border-radius:var(--radius-md); font-size:0.8rem; font-weight:700;">
            ✅ 本日の必要人員は充足しています
          </div>
        `}
      </div>

      <div style="overflow-x:auto;">
        <div style="min-width:860px;">
          <div class="timeline-header-hours">
            ${hourHeadersHTML}
          </div>
          ${staffRowsHTML}
        </div>
      </div>
    </div>
  `;
}

// Event Listeners setup for Manager Workspace
export function setupTimelineEvents(stateManager) {
  const monthBtn = document.getElementById('mgr-mode-month-btn');
  const timelineBtn = document.getElementById('mgr-mode-timeline-btn');
  const datePicker = document.getElementById('mgr-date-picker');

  if (monthBtn) monthBtn.addEventListener('click', () => stateManager.setManagerViewMode('month'));
  if (timelineBtn) timelineBtn.addEventListener('click', () => stateManager.setManagerViewMode('timeline'));
  if (datePicker) datePicker.addEventListener('change', (e) => stateManager.setSelectedDate(e.target.value));

  // Tapping calendar day in Month View switches to Day Timeline mode for that date
  const mgrMonthCells = document.querySelectorAll('[data-mgr-date]');
  mgrMonthCells.forEach(cell => {
    cell.addEventListener('click', () => {
      const date = cell.getAttribute('data-mgr-date');
      stateManager.setSelectedDate(date);
      stateManager.setManagerViewMode('timeline');
    });
  });

  // Tapping empty timeline track creates a new shift assignment
  const tracks = document.querySelectorAll('.timeline-track');
  tracks.forEach(track => {
    track.addEventListener('click', (e) => {
      if (e.target.classList.contains('shift-block') || e.target.classList.contains('shift-resize-handle')) {
        return;
      }
      const memberId = track.getAttribute('data-track-member');
      openShiftCreationModal(stateManager, memberId, stateManager.state.selectedDate);
    });
  });

  // Tapping an existing shift block opens shift edit / delete sheet
  const shiftBlocks = document.querySelectorAll('.shift-block');
  shiftBlocks.forEach(block => {
    block.addEventListener('click', (e) => {
      e.stopPropagation();
      const asgId = block.getAttribute('data-asg-id');
      openShiftEditModal(stateManager, asgId);
    });
  });

  // AI Shift Generator button
  const aiBtn = document.getElementById('ai-generate-btn');
  if (aiBtn) {
    aiBtn.addEventListener('click', () => {
      runAutoScheduler(stateManager);
    });
  }

  // PNG Export button
  const exportBtn = document.getElementById('export-png-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      exportSchedulePNG(stateManager.state);
    });
  }
}

function openShiftEditModal(stateManager, asgId) {
  const asg = stateManager.state.assignments.find(a => a.id === asgId);
  if (!asg) return;

  const member = stateManager.state.members.find(m => m.id === asg.member_id);

  const contentHTML = `
    <div class="form-group" style="gap:var(--space-4);">
      <div style="font-weight:800; font-size:1.05rem; display:flex; align-items:center; gap:8px;">
        <span class="staff-dot" style="background:${member ? member.color : '#000'};"></span>
        ${member ? member.name : 'スタッフ'} のシフト詳細・調整
      </div>

      <div style="display:flex; gap:var(--space-3);">
        <div class="form-group" style="flex:1;">
          <label class="form-label">開始時間</label>
          <input type="time" id="edit-start-time" class="form-input" value="${asg.start_time}" step="900" />
        </div>
        <div class="form-group" style="flex:1;">
          <label class="form-label">終了時間</label>
          <input type="time" id="edit-end-time" class="form-input" value="${asg.end_time}" step="900" />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">休憩時間（分）</label>
        <input type="number" id="edit-break-min" class="form-input" value="${asg.break_minutes || 60}" step="15" min="0" />
      </div>

      <div style="display:flex; justify-content:space-between; margin-top:var(--space-2);">
        <button type="button" id="delete-shift-btn" class="btn btn-secondary" style="color:var(--color-danger); border-color:var(--color-danger-border);">削除</button>
        <div style="display:flex; gap:var(--space-2);">
          <button type="button" class="btn btn-secondary close-sheet-btn">キャンセル</button>
          <button type="button" id="save-shift-btn" class="btn btn-primary">更新保存</button>
        </div>
      </div>
    </div>
  `;

  createBottomSheet({
    title: 'シフト詳細・調整',
    contentHTML,
    onOpen: (body) => {
      body.querySelector('#save-shift-btn').addEventListener('click', async () => {
        const startTime = body.querySelector('#edit-start-time').value;
        const endTime = body.querySelector('#edit-end-time').value;
        const breakMin = parseInt(body.querySelector('#edit-break-min').value, 10) || 0;

        await stateManager.saveAssignment({
          ...asg,
          start_time: startTime,
          end_time: endTime,
          break_minutes: breakMin
        });

        closeBottomSheet();
        showToast('シフトを更新しました');
      });

      body.querySelector('#delete-shift-btn').addEventListener('click', async () => {
        await stateManager.deleteAssignment(asgId);
        closeBottomSheet();
        showToast('シフトを削除しました');
      });
    }
  });
}
