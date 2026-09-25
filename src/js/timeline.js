// Manager Workspace - Month View & Day Timeline Modes with Direct Manipulation
import { getDaysInMonth, formatDateKey, getJapaneseDayOfWeek, parseTimeMinutes } from './dates.js';
import { createBottomSheet, closeBottomSheet, showToast } from './ui.js';
import { openShiftCreationModal, runAutoScheduler } from './scheduler.js';
import { renderLaborCostPanel } from './costs.js';
import { exportSchedulePNG } from './export.js';
import { calculateDayShortages, calculateManagerSummary, formatCurrency, renderMiniShortageBar, generateUUID } from './utils.js';

let selectedShiftId = null;

function minutesToTimeString(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function renderManagerWorkspaceView(state) {
  const isMonthView = state.managerViewMode === 'month';
  const summary = calculateManagerSummary(state);
  const [yearStr, monthStr] = state.currentMonthKey.split('-');

  return `
    <div style="display:flex; flex-direction:column; gap:var(--space-4);">
      <!-- Compact Professional Toolbar Strip -->
      <div class="workspace-header-strip">
        <div class="header-strip-meta">
          <div class="header-strip-item">
            <span class="header-strip-label">対象月</span>
            <span class="header-strip-value">${yearStr}年${parseInt(monthStr, 10)}月</span>
          </div>
          <div class="header-strip-divider"></div>
          <div class="header-strip-item">
            <span class="header-strip-label">提出</span>
            <span class="header-strip-value">${summary.submittedStaffCount} / ${summary.totalStaffCount}名</span>
          </div>
          <div class="header-strip-divider"></div>
          <div class="header-strip-item">
            <span class="header-strip-label">人員不足</span>
            <span class="header-strip-value ${summary.unresolvedDaysCount > 0 ? 'highlight-danger' : 'highlight-success'}">
              ${summary.unresolvedDaysCount > 0 ? `${summary.unresolvedDaysCount}日` : '0日'}
            </span>
          </div>
          <div class="header-strip-divider"></div>
          <div class="header-strip-item">
            <span class="header-strip-label">勤務</span>
            <span class="header-strip-value">${summary.totalScheduledHours.toFixed(1)}h</span>
          </div>
          <div class="header-strip-divider"></div>
          <div class="header-strip-item">
            <span class="header-strip-label">人件費</span>
            <span class="header-strip-value">${formatCurrency(summary.totalEstimatedCost)}</span>
          </div>
        </div>

        <div style="display:flex; flex-wrap:wrap; align-items:center; gap:var(--space-2);">
          <div class="segmented-control">
            <button id="mgr-mode-month-btn" class="segmented-btn ${isMonthView ? 'active' : ''}">月間</button>
            <button id="mgr-mode-timeline-btn" class="segmented-btn ${!isMonthView ? 'active' : ''}">1日</button>
          </div>

          <input type="date" id="mgr-date-picker" class="form-input" value="${state.selectedDate}" style="padding:2px 6px; font-weight:700; font-size:0.75rem;" />

          <button id="ai-generate-btn" class="btn btn-primary btn-sm">仮シフトを作成</button>
          <button id="export-png-btn" class="btn btn-secondary btn-sm">画像を書き出す</button>
        </div>
      </div>

      <!-- Main Workspace Working Surface -->
      ${isMonthView ? renderManagerMonthView(state) : renderManagerDayTimelineView(state)}

      <!-- Staff Labor Status View -->
      ${renderLaborCostPanel(state)}
    </div>
  `;
}

// Manager Month View Component
function renderManagerMonthView(state) {
  const [yearStr, monthStr] = state.currentMonthKey.split('-');
  const year = parseInt(yearStr, 10);
  const monthIndex = parseInt(monthStr, 10) - 1;
  const daysInMonth = getDaysInMonth(year, monthIndex);

  let monthGridHTML = '';
  let mobileDateListHTML = '';

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = formatDateKey(year, monthIndex, day);
    const dayOfWeek = getJapaneseDayOfWeek(year, monthIndex, day);
    const isWeekend = dayOfWeek === '土' || dayOfWeek === '日';

    const dayAssignments = state.assignments.filter(a => a.date === dateKey);
    const isSelected = state.selectedDate === dateKey;
    const dayShortage = calculateDayShortages(dateKey, state);

    // Shortage timeline mini bar
    const shortageBarHTML = dayShortage.hasShortage
      ? renderMiniShortageBar(dayShortage.shortageItems)
      : '';

    // Shortage slot strips inside cell
    const shortageSlotsHTML = dayShortage.hasShortage ? `
      <div class="cell-shortage-box">
        ${dayShortage.shortageItems.map(item => `
          <div class="shortage-slot-strip">
            <span>不足 ${item.timeStart}–${item.timeEnd}</span>
            <span>-${item.deficit}名</span>
          </div>
        `).join('')}
      </div>
    ` : '';

    // Desktop/iPad Calendar Cell
    monthGridHTML += `
      <div class="calendar-cell ${isSelected ? 'selected' : ''} ${dayShortage.hasShortage ? 'has-shortage' : ''}" data-mgr-date="${dateKey}">
        <div class="calendar-cell-top">
          <span class="calendar-cell-num ${isWeekend ? 'weekend' : ''}">
            ${day}<small class="calendar-cell-dayofweek">(${dayOfWeek})</small>
          </span>
          <span style="font-size:0.65rem; font-weight:700; color:${dayAssignments.length > 0 ? 'var(--color-text-secondary)' : 'var(--color-text-muted)'};">
            配置 ${dayAssignments.length}名
          </span>
        </div>

        ${shortageBarHTML}
        ${shortageSlotsHTML}

        <div style="display:flex; flex-direction:column; gap:2px; margin-top:auto;">
          ${dayAssignments.slice(0, 2).map(a => {
            const member = state.members.find(m => m.id === a.member_id);
            return `
              <div style="display:flex; align-items:center; gap:4px; font-size:0.625rem; font-weight:600; background:var(--color-surface-subtle); padding:1px 3px; border-radius:1px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                <span class="timeline-staff-dot" style="background:${member ? member.color : '#000'};"></span>
                <span>${member ? member.name.split(' ')[0] : 'スタッフ'}</span>
                <span style="color:var(--color-text-muted); font-weight:500;">${a.start_time.split(':')[0]}-${a.end_time.split(':')[0]}</span>
              </div>
            `;
          }).join('')}
          ${dayAssignments.length > 2 ? `<div style="font-size:0.6rem; font-weight:600; color:var(--color-text-muted);">+他${dayAssignments.length - 2}名</div>` : ''}
        </div>
      </div>
    `;

    // Mobile (iPhone) Operational Date List Item
    mobileDateListHTML += `
      <div class="settings-row ${dayShortage.hasShortage ? 'has-shortage' : ''}" data-mgr-date="${dateKey}" style="cursor:pointer; padding:10px 12px;">
        <div style="display:flex; flex-direction:column; gap:2px;">
          <div style="display:flex; align-items:center; gap:var(--space-2);">
            <strong style="font-size:0.875rem;">${year}年${monthIndex + 1}月${day}日（${dayOfWeek}）</strong>
            <span style="font-size:0.75rem; color:var(--color-text-muted);">配置 ${dayAssignments.length}名</span>
          </div>
          ${dayShortage.hasShortage ? `
            <div style="font-size:0.725rem; font-weight:700; color:var(--color-danger);">
              ${dayShortage.shortageItems.map(item => `${item.timeStart}–${item.timeEnd} ${item.deficit}名不足`).join(' / ')}
            </div>
          ` : `
            <div style="font-size:0.725rem; font-weight:600; color:var(--color-success);">適正配置</div>
          `}
        </div>
        <span style="font-size:0.75rem; color:var(--color-text-muted);">＞</span>
      </div>
    `;
  }

  return `
    <div class="calendar-surface">
      <div class="calendar-surface-header">
        <span style="font-weight:800; font-size:0.9rem;">${year}年${monthIndex + 1}月 月間シフト</span>
        <span style="font-size:0.725rem; color:var(--color-text-muted);">日付を選ぶと1日タイムラインへ移動します</span>
      </div>

      <div class="calendar-grid-table">
        <div class="calendar-weekday-cell weekend">日</div>
        <div class="calendar-weekday-cell">月</div>
        <div class="calendar-weekday-cell">火</div>
        <div class="calendar-weekday-cell">水</div>
        <div class="calendar-weekday-cell">木</div>
        <div class="calendar-weekday-cell">金</div>
        <div class="calendar-weekday-cell weekend">土</div>
        ${monthGridHTML}
      </div>

      <div class="mobile-op-list" style="display:none;">
        ${mobileDateListHTML}
      </div>
    </div>
  `;
}

// Manager Day Mode Working Surface
function renderManagerDayTimelineView(state) {
  const selectedDate = state.selectedDate;
  const storeOpenMinutes = parseTimeMinutes(state.store ? state.store.default_open_time : '09:00');
  const storeCloseMinutes = parseTimeMinutes(state.store ? state.store.default_close_time : '21:30');
  const totalTimelineMinutes = storeCloseMinutes - storeOpenMinutes;

  const dayShortage = calculateDayShortages(selectedDate, state);

  // Hour column headers (09, 10, ... 21)
  const hourCols = [];
  for (let m = storeOpenMinutes; m <= storeCloseMinutes; m += 60) {
    hourCols.push(Math.floor(m / 60));
  }

  const hourHeadersHTML = hourCols.map(h => `<div class="timeline-hour-head">${h}:00</div>`).join('');

  // Coverage Strip calculations (required vs assigned for each hour interval)
  const coverageCellsHTML = hourCols.map(h => {
    const slotStartM = h * 60;
    const slotEndM = slotStartM + 60;

    const matchingRule = (state.staffingRules || []).find(r => {
      const rStart = parseTimeMinutes(r.time_start);
      const rEnd = parseTimeMinutes(r.time_end);
      return slotStartM >= rStart && slotStartM < rEnd;
    }) || { required_count: 2 };

    const reqCount = matchingRule.required_count;

    const asgsOnDate = state.assignments.filter(a => a.date === selectedDate);
    let assignedCount = 0;
    for (const asg of asgsOnDate) {
      const aStart = parseTimeMinutes(asg.start_time);
      const aEnd = parseTimeMinutes(asg.end_time);
      if (aStart < slotEndM && aEnd > slotStartM) {
        assignedCount++;
      }
    }

    const isShort = assignedCount < reqCount;
    return `
      <div class="coverage-cell ${isShort ? 'shortage' : ''}" title="${h}:00 必要:${reqCount}名 / 配置:${assignedCount}名">
        ${assignedCount}/${reqCount}
      </div>
    `;
  }).join('');

  // Staff Timeline Rows
  const staffRowsHTML = state.members.map(member => {
    const avail = state.availability.find(a => a.member_id === member.id && a.date === selectedDate);
    const asgs = state.assignments.filter(a => a.member_id === member.id && a.date === selectedDate);

    let totalMonthlyHours = 0;
    state.assignments.filter(a => a.member_id === member.id).forEach(a => {
      const dur = (parseTimeMinutes(a.end_time) - parseTimeMinutes(a.start_time) - (a.break_minutes || 0)) / 60;
      totalMonthlyHours += Math.max(0, dur);
    });

    // Translucent availability layer
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
        <div class="avail-block-layer" style="left:${leftPct}%; width:${widthPct}%; color:${member.color};"></div>
      `;
    }

    // Solid assignment shift blocks
    const shiftBlocksHTML = asgs.map(asg => {
      const startM = parseTimeMinutes(asg.start_time);
      const endM = parseTimeMinutes(asg.end_time);
      const leftPct = Math.max(0, ((startM - storeOpenMinutes) / totalTimelineMinutes) * 100);
      const widthPct = Math.min(100 - leftPct, ((endM - startM) / totalTimelineMinutes) * 100);

      let breakHTML = '';
      if (asg.break_minutes > 0) {
        const breakPct = (asg.break_minutes / Math.max(1, endM - startM)) * 100;
        breakHTML = `<div class="break-strip" style="left:30%; width:${breakPct}%;" title="休憩 ${asg.break_minutes}分"></div>`;
      }

      const isSelected = selectedShiftId === asg.id;

      return `
        <div class="shift-block-layer ${isSelected ? 'selected-shift' : ''}" data-asg-id="${asg.id}" style="left:${leftPct}%; width:${widthPct}%; background:${member.color};">
          <div class="shift-resize-handle left" data-resize="left" data-asg-id="${asg.id}"></div>
          <span style="position:relative; z-index:2; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; pointer-events:none;">${asg.start_time}–${asg.end_time}</span>
          ${breakHTML}
          <div class="shift-resize-handle right" data-resize="right" data-asg-id="${asg.id}"></div>
        </div>
      `;
    }).join('');

    const gridColsHTML = hourCols.map(() => `<div class="grid-line-col"></div>`).join('');

    return `
      <div class="timeline-staff-row" data-member-id="${member.id}">
        <div class="timeline-staff-cell">
          <span class="timeline-staff-dot" style="background:${member.color};"></span>
          <span>${member.name}</span>
          <span class="timeline-staff-hours">${totalMonthlyHours.toFixed(1)}h</span>
        </div>
        <div class="timeline-track-cell" data-track-member="${member.id}">
          <div class="timeline-grid-lines">${gridColsHTML}</div>
          ${availBlockHTML}
          ${shiftBlocksHTML}
        </div>
      </div>
    `;
  }).join('');

  // Selected shift inspector HTML
  let inspectorHTML = '';
  if (selectedShiftId) {
    const asg = state.assignments.find(a => a.id === selectedShiftId);
    if (asg) {
      const member = state.members.find(m => m.id === asg.member_id);
      const avail = state.availability.find(a => a.member_id === asg.member_id && a.date === asg.date);
      let availDesc = '未定';
      if (avail) {
        if (avail.state === 'full') availDesc = '終日';
        else if (avail.state === 'range') availDesc = `時間指定 (${avail.start_time || ''}–${avail.end_time || ''})`;
        else if (avail.state === 'unavailable') availDesc = '出勤不可';
      }

      let totalM = 0;
      state.assignments.filter(a => a.member_id === asg.member_id).forEach(a => {
        totalM += (parseTimeMinutes(a.end_time) - parseTimeMinutes(a.start_time) - (a.break_minutes || 0)) / 60;
      });

      inspectorHTML = `
        <div class="context-inspector">
          <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid var(--color-border); padding-bottom:6px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="timeline-staff-dot" style="background:${member ? member.color : '#000'};"></span>
              <strong style="font-size:0.875rem;">${member ? member.name : 'スタッフ'}</strong>
              <span style="font-size:0.75rem; color:var(--color-text-muted);">${asg.date}</span>
            </div>
            <button id="close-inspector-btn" class="btn btn-secondary btn-sm">✕</button>
          </div>

          <div style="display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:var(--space-2); font-size:0.8rem;">
            <div>勤務: <strong>${asg.start_time} → ${asg.end_time}</strong> (休憩 ${asg.break_minutes || 0}分)</div>
            <div>希望: <strong>${availDesc}</strong></div>
            <div>月間: <strong>${totalM.toFixed(1)} / ${(member && member.max_monthly_hours) ? member.max_monthly_hours : 100}h</strong></div>

            <div style="display:flex; gap:var(--space-2);">
              <button id="edit-inspector-shift-btn" class="btn btn-secondary btn-sm">編集</button>
              <button id="delete-inspector-shift-btn" class="btn btn-secondary btn-sm" style="color:var(--color-danger); border-color:var(--color-danger-border);">削除</button>
            </div>
          </div>
        </div>
      `;
    }
  }

  const [yStr, mStr, dStr] = selectedDate.split('-');
  const selectedDateFormatted = `${parseInt(mStr, 10)}月${parseInt(dStr, 10)}日のシフト`;

  return `
    <div class="day-workspace">
      <div class="day-workspace-toolbar">
        <div>
          <span style="font-weight:800; font-size:0.9rem;">${selectedDateFormatted}</span>
          <span style="font-size:0.725rem; color:var(--color-text-muted); margin-left:8px;">空いている時間をドラッグして追加</span>
        </div>

        ${dayShortage.hasShortage ? `
          <div style="font-size:0.725rem; font-weight:700; color:var(--color-danger); background:var(--color-danger-bg); border:1px solid var(--color-danger-border); padding:2px 8px; border-radius:var(--radius-xs);">
            人員不足: ${dayShortage.summaryText}
          </div>
        ` : `
          <div style="font-size:0.725rem; font-weight:700; color:var(--color-success); background:var(--color-success-bg); border:1px solid var(--color-success-border); padding:2px 8px; border-radius:var(--radius-xs);">
            適正配置
          </div>
        `}
      </div>

      <div class="timeline-grid-container">
        <div class="timeline-grid-table">
          <div class="coverage-strip">
            <div class="coverage-label">配置 / 必要人数</div>
            <div class="coverage-grid">${coverageCellsHTML}</div>
          </div>

          <div class="timeline-header-row">
            <div class="timeline-corner-cell">スタッフ名</div>
            <div class="timeline-hours-bar">${hourHeadersHTML}</div>
          </div>

          ${staffRowsHTML}
        </div>
      </div>

      ${inspectorHTML}
    </div>
  `;
}

// Event Listeners setup for Manager Workspace with Direct Manipulation
export function setupTimelineEvents(stateManager) {
  const monthBtn = document.getElementById('mgr-mode-month-btn');
  const timelineBtn = document.getElementById('mgr-mode-timeline-btn');
  const datePicker = document.getElementById('mgr-date-picker');

  if (monthBtn) monthBtn.addEventListener('click', () => stateManager.setManagerViewMode('month'));
  if (timelineBtn) timelineBtn.addEventListener('click', () => stateManager.setManagerViewMode('timeline'));
  if (datePicker) datePicker.addEventListener('change', (e) => stateManager.setSelectedDate(e.target.value));

  // Calendar cells in Month View
  const mgrMonthCells = document.querySelectorAll('[data-mgr-date]');
  mgrMonthCells.forEach(cell => {
    cell.addEventListener('click', () => {
      const date = cell.getAttribute('data-mgr-date');
      stateManager.setSelectedDate(date);
      stateManager.setManagerViewMode('timeline');
    });
  });

  // Time parameters
  const state = stateManager.state;
  const storeOpenMinutes = parseTimeMinutes(state.store ? state.store.default_open_time : '09:00');
  const storeCloseMinutes = parseTimeMinutes(state.store ? state.store.default_close_time : '21:30');
  const totalTimelineMinutes = storeCloseMinutes - storeOpenMinutes;

  // Track click and drag manipulation
  const tracks = document.querySelectorAll('.timeline-track-cell');
  tracks.forEach(track => {
    let isDraggingTrack = false;
    let trackStartX = 0;
    let startMins = 0;

    track.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.shift-block-layer')) return;

      const trackRect = track.getBoundingClientRect();
      const clickX = e.clientX - trackRect.left;
      const pct = Math.max(0, Math.min(1, clickX / trackRect.width));
      const rawMins = storeOpenMinutes + pct * totalTimelineMinutes;
      startMins = Math.round(rawMins / 15) * 15;
      trackStartX = e.clientX;
      isDraggingTrack = true;
    });

    track.addEventListener('pointerup', (e) => {
      if (!isDraggingTrack) return;
      isDraggingTrack = false;

      const trackRect = track.getBoundingClientRect();
      const clickX = e.clientX - trackRect.left;
      const pct = Math.max(0, Math.min(1, clickX / trackRect.width));
      const rawMins = storeOpenMinutes + pct * totalTimelineMinutes;
      const endMins = Math.round(rawMins / 15) * 15;

      const memberId = track.getAttribute('data-track-member');
      selectedShiftId = null;

      if (Math.abs(e.clientX - trackStartX) > 20 && Math.abs(endMins - startMins) >= 30) {
        const startT = minutesToTimeString(Math.min(startMins, endMins));
        const endT = minutesToTimeString(Math.max(startMins, endMins));

        stateManager.saveAssignment({
          id: `asg-${generateUUID()}`,
          period_id: state.period ? state.period.id : 'period-2026-10',
          date: state.selectedDate,
          member_id: memberId,
          start_time: startT,
          end_time: endT,
          break_minutes: 60,
          preset_id: null,
          is_locked: false,
          source: 'manual'
        });
        showToast(`シフト作成: ${startT}–${endT}`);
      } else {
        openShiftCreationModal(stateManager, memberId, stateManager.state.selectedDate);
      }
    });
  });

  // Shift block direct drag move / resize handle manipulation
  const shiftBlocks = document.querySelectorAll('.shift-block-layer');
  shiftBlocks.forEach(block => {
    const asgId = block.getAttribute('data-asg-id');
    const asg = state.assignments.find(a => a.id === asgId);
    if (!asg) return;

    let isInteracting = false;
    let mode = 'move'; // 'move', 'resize-left', 'resize-right'
    let startX = 0;
    let origStartM = parseTimeMinutes(asg.start_time);
    let origEndM = parseTimeMinutes(asg.end_time);
    let origDuration = origEndM - origStartM;

    block.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      block.setPointerCapture(e.pointerId);
      isInteracting = true;
      startX = e.clientX;

      origStartM = parseTimeMinutes(asg.start_time);
      origEndM = parseTimeMinutes(asg.end_time);
      origDuration = origEndM - origStartM;

      const resizeTarget = e.target.closest('.shift-resize-handle');
      if (resizeTarget) {
        mode = resizeTarget.getAttribute('data-resize') === 'left' ? 'resize-left' : 'resize-right';
      } else {
        mode = 'move';
        selectedShiftId = asgId;
        stateManager.notify();
      }
    });

    block.addEventListener('pointermove', (e) => {
      if (!isInteracting) return;

      const trackRect = block.parentElement.getBoundingClientRect();
      const deltaX = e.clientX - startX;
      const deltaMins = Math.round(((deltaX / trackRect.width) * totalTimelineMinutes) / 15) * 15;

      if (mode === 'move') {
        let newStartM = Math.max(storeOpenMinutes, Math.min(storeCloseMinutes - origDuration, origStartM + deltaMins));
        let newEndM = newStartM + origDuration;

        const leftPct = ((newStartM - storeOpenMinutes) / totalTimelineMinutes) * 100;
        block.style.left = `${leftPct.toFixed(2)}%`;
        const timeSpan = block.querySelector('span');
        if (timeSpan) timeSpan.textContent = `${minutesToTimeString(newStartM)}–${minutesToTimeString(newEndM)}`;
      } else if (mode === 'resize-left') {
        let newStartM = Math.max(storeOpenMinutes, Math.min(origEndM - 30, origStartM + deltaMins));
        const leftPct = ((newStartM - storeOpenMinutes) / totalTimelineMinutes) * 100;
        const widthPct = (((origEndM - newStartM) / totalTimelineMinutes) * 100);
        block.style.left = `${leftPct.toFixed(2)}%`;
        block.style.width = `${widthPct.toFixed(2)}%`;
        const timeSpan = block.querySelector('span');
        if (timeSpan) timeSpan.textContent = `${minutesToTimeString(newStartM)}–${minutesToTimeString(origEndM)}`;
      } else if (mode === 'resize-right') {
        let newEndM = Math.min(storeCloseMinutes, Math.max(origStartM + 30, origEndM + deltaMins));
        const widthPct = (((newEndM - origStartM) / totalTimelineMinutes) * 100);
        block.style.width = `${widthPct.toFixed(2)}%`;
        const timeSpan = block.querySelector('span');
        if (timeSpan) timeSpan.textContent = `${minutesToTimeString(origStartM)}–${minutesToTimeString(newEndM)}`;
      }
    });

    block.addEventListener('pointerup', async (e) => {
      if (!isInteracting) return;
      isInteracting = false;
      try { block.releasePointerCapture(e.pointerId); } catch (_) {}

      const trackRect = block.parentElement.getBoundingClientRect();
      const deltaX = e.clientX - startX;
      const deltaMins = Math.round(((deltaX / trackRect.width) * totalTimelineMinutes) / 15) * 15;

      if (deltaMins === 0) return;

      let newStartM = origStartM;
      let newEndM = origEndM;

      if (mode === 'move') {
        newStartM = Math.max(storeOpenMinutes, Math.min(storeCloseMinutes - origDuration, origStartM + deltaMins));
        newEndM = newStartM + origDuration;
      } else if (mode === 'resize-left') {
        newStartM = Math.max(storeOpenMinutes, Math.min(origEndM - 30, origStartM + deltaMins));
      } else if (mode === 'resize-right') {
        newEndM = Math.min(storeCloseMinutes, Math.max(origStartM + 30, origEndM + deltaMins));
      }

      await stateManager.saveAssignment({
        ...asg,
        start_time: minutesToTimeString(newStartM),
        end_time: minutesToTimeString(newEndM)
      });

      showToast(`シフト変更: ${minutesToTimeString(newStartM)}–${minutesToTimeString(newEndM)}`);
    });
  });

  const closeInspectorBtn = document.getElementById('close-inspector-btn');
  if (closeInspectorBtn) {
    closeInspectorBtn.addEventListener('click', () => {
      selectedShiftId = null;
      stateManager.notify();
    });
  }

  const editInspectorBtn = document.getElementById('edit-inspector-shift-btn');
  if (editInspectorBtn && selectedShiftId) {
    editInspectorBtn.addEventListener('click', () => {
      openShiftEditModal(stateManager, selectedShiftId);
    });
  }

  const deleteInspectorBtn = document.getElementById('delete-inspector-shift-btn');
  if (deleteInspectorBtn && selectedShiftId) {
    deleteInspectorBtn.addEventListener('click', async () => {
      const asgIdToDelete = selectedShiftId;
      selectedShiftId = null;
      await stateManager.deleteAssignment(asgIdToDelete);
      showToast('シフトを削除しました');
    });
  }

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
  const avail = stateManager.state.availability.find(a => a.member_id === asg.member_id && a.date === asg.date);

  let availDesc = '未定';
  if (avail) {
    if (avail.state === 'full') availDesc = '終日';
    else if (avail.state === 'range') availDesc = `時間指定 (${avail.start_time || ''}–${avail.end_time || ''})`;
    else if (avail.state === 'unavailable') availDesc = '出勤不可';
  }

  const contentHTML = `
    <div class="form-group" style="gap:var(--space-3);">
      <div style="font-size:0.95rem; font-weight:800; display:flex; align-items:center; gap:8px; border-bottom:1px solid var(--color-border); padding-bottom:var(--space-2);">
        <span class="timeline-staff-dot" style="background:${member ? member.color : '#000'};"></span>
        ${member ? member.name : 'スタッフ'} のシフト調整 (${asg.date})
      </div>

      <div style="font-size:0.75rem; color:var(--color-text-secondary); background:var(--color-surface-subtle); padding:6px 10px; border-radius:var(--radius-xs);">
        本人希望: <strong>${availDesc}</strong>
      </div>

      <div style="display:flex; gap:var(--space-2);">
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
    title: '',
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
        selectedShiftId = null;
        showToast('シフトを更新しました');
      });

      body.querySelector('#delete-shift-btn').addEventListener('click', async () => {
        await stateManager.deleteAssignment(asgId);
        closeBottomSheet();
        selectedShiftId = null;
        showToast('シフトを削除しました');
      });
    }
  });
}
