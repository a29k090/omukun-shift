// Manager Monthly Request Workflow & Continuous Submission Monitoring
import { getIconSVG } from './icons.js';
import { createBottomSheet, closeBottomSheet, showToast } from './ui.js';
import { generateUUID } from './utils.js';

export function renderSubmissionStatusPanel(state) {
  const period = state.period;
  const members = (state.members || []).filter(m => m.role === 'staff' && m.status === 'active');
  const submissions = state.submissions || [];
  const filter = state.submissionFilter || 'all';

  // Compute status for each staff member
  const staffStatusList = members.map(m => {
    const sub = submissions.find(s => s.member_id === m.id);
    const mAvail = state.availability.filter(a => a.member_id === m.id && a.state && a.state !== 'unset');
    const enteredDays = mAvail.length;

    let subStatus = sub ? sub.status : 'not_started';
    if (subStatus === 'not_started' && enteredDays > 0) {
      subStatus = 'in_progress';
    }

    let statusLabel = '未入力';
    let statusClass = 'status-badge-not-started';

    if (subStatus === 'in_progress') {
      statusLabel = '入力中';
      statusClass = 'status-badge-in-progress';
    } else if (subStatus === 'submitted') {
      statusLabel = '提出済み';
      statusClass = 'status-badge-submitted';
    }

    const lastUpdated = sub && sub.last_edited_at ? new Date(sub.last_edited_at).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '未更新';

    return {
      member: m,
      subStatus,
      statusLabel,
      statusClass,
      enteredDays,
      lastUpdated
    };
  });

  // Priority order: 未入力 -> 入力中 -> 提出済み
  const priorityOrder = { 'not_started': 0, 'in_progress': 1, 'submitted': 2 };
  staffStatusList.sort((a, b) => (priorityOrder[a.subStatus] - priorityOrder[b.subStatus]));

  // Filter
  const filteredList = staffStatusList.filter(item => {
    if (filter === 'all') return true;
    return item.subStatus === filter;
  });

  const rowsHTML = filteredList.map(item => `
    <div class="settings-row" data-member-id="${item.member.id}">
      <div style="display:flex; align-items:center; gap:var(--space-3);">
        <span class="timeline-staff-dot" style="background:${item.member.color};"></span>
        <strong style="font-size:0.875rem;">${item.member.name}</strong>
        <span class="btn btn-sm ${item.statusClass}" style="border:none; padding:1px 6px; font-size:0.65rem; font-weight:800;">${item.statusLabel}</span>
      </div>

      <div style="display:flex; align-items:center; gap:var(--space-3);">
        <span style="font-size:0.75rem; font-weight:700; color:var(--color-text-secondary);">${item.enteredDays}日 入力済み</span>
        <span style="font-size:0.725rem; color:var(--color-text-muted);">最終更新: ${item.lastUpdated}</span>
        <button class="btn btn-secondary btn-sm inspect-partial-btn" data-member-id="${item.member.id}">
          ${getIconSVG('eye', { size: 12 })} 閲覧・代理入力
        </button>
      </div>
    </div>
  `).join('');

  return `
    <div class="settings-group">
      <div class="settings-row" style="background:var(--color-surface-subtle); border-bottom:1px solid var(--color-border); flex-wrap:wrap; gap:var(--space-2);">
        <div style="display:flex; align-items:center; gap:var(--space-2);">
          <strong style="font-size:0.875rem;">希望シフト提出状況 (${members.length}名中)</strong>
        </div>

        <div class="segmented-control" id="submission-filter-control">
          <button class="segmented-btn ${filter === 'all' ? 'active' : ''}" data-filter="all">すべて</button>
          <button class="segmented-btn ${filter === 'not_started' ? 'active' : ''}" data-filter="not_started">未入力</button>
          <button class="segmented-btn ${filter === 'in_progress' ? 'active' : ''}" data-filter="in_progress">入力中</button>
          <button class="segmented-btn ${filter === 'submitted' ? 'active' : ''}" data-filter="submitted">提出済み</button>
        </div>
      </div>

      ${rowsHTML || `<div class="settings-row" style="color:var(--color-text-muted);">該当するスタッフはいません</div>`}
    </div>
  `;
}

export function openMonthlyRequestManagerModal(stateManager) {
  const state = stateManager.state;
  const period = state.period || {
    month_key: state.currentMonthKey,
    status: 'draft',
    deadline: `${state.currentMonthKey}-25T23:59`,
    operating_open_time: '09:00',
    operating_close_time: '21:30',
    message: `${parseInt(state.currentMonthKey.split('-')[1], 10)}月分の希望シフトです。期限までに入力をお願いします。`
  };

  const isDraft = period.status === 'draft';
  const isOpen = period.status === 'open';

  const contentHTML = `
    <form id="monthly-request-form" class="form-group" style="gap:var(--space-3);">
      <h3 style="font-size:1rem; font-weight:800; border-bottom:1px solid var(--color-border); padding-bottom:var(--space-2);">
        ${period.month_key} 希望シフト募集管理
      </h3>

      <div style="background:var(--color-surface-subtle); padding:var(--space-3); border-radius:var(--radius-xs); border:1px solid var(--color-border); font-size:0.8rem; display:flex; justify-content:space-between; align-items:center;">
        <span>現在の状態:</span>
        <strong style="font-size:0.9rem; color:${isOpen ? 'var(--color-success)' : 'var(--color-warning)'};">
          ${isDraft ? '下書き (未公開)' : isOpen ? '受付中 (公開済み)' : '締切済み'}
        </strong>
      </div>

      <div class="form-group">
        <label class="form-label">提出期限</label>
        <input type="datetime-local" id="req-deadline" class="form-input" value="${period.deadline ? period.deadline.substring(0, 16) : ''}" required />
      </div>

      <div class="form-group">
        <label class="form-label">スタッフへのメッセージ</label>
        <textarea id="req-message" class="form-input" rows="3" style="resize:vertical;">${period.message || ''}</textarea>
      </div>

      <div style="display:flex; justify-content:space-between; margin-top:var(--space-3);">
        ${isOpen ? `
          <button type="button" id="close-request-btn" class="btn btn-danger">受付を締め切る</button>
        ` : `
          <div></div>
        `}

        <div style="display:flex; gap:var(--space-2);">
          <button type="button" class="btn btn-secondary close-sheet-btn">キャンセル</button>
          <button type="submit" id="start-request-btn" class="btn btn-primary">
            ${isDraft ? '募集を開始（公開）' : '募集条件を更新'}
          </button>
        </div>
      </div>
    </form>
  `;

  createBottomSheet({
    title: '',
    contentHTML,
    onOpen: (body) => {
      body.querySelector('#monthly-request-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const deadline = body.querySelector('#req-deadline').value;
        const message = body.querySelector('#req-message').value;

        if (isDraft) {
          if (!confirm(`${period.month_key} の希望シフト募集を開始しますか？スタッフ画面に公開されます。`)) {
            return;
          }
        }

        await stateManager.savePeriod({
          id: period.id || `period-${period.month_key}`,
          month_key: period.month_key,
          status: 'open',
          deadline,
          message,
          published_at: new Date().toISOString(),
          published_by: stateManager.state.currentMemberId
        });

        closeBottomSheet();
        showToast(`${period.month_key} の希望シフト募集を開始しました`);
      });

      const closeReqBtn = body.querySelector('#close-request-btn');
      if (closeReqBtn) {
        closeReqBtn.addEventListener('click', async () => {
          if (confirm('希望シフトの受付を早期締め切りますか？スタッフは編集できなくなります。')) {
            await stateManager.savePeriod({
              ...period,
              status: 'closed',
              closed_at: new Date().toISOString(),
              closed_by: stateManager.state.currentMemberId
            });
            closeBottomSheet();
            showToast('募集を締め切りました');
          }
        });
      }
    }
  });
}
