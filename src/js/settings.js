// Complete Manager Settings System Module
import { getIconSVG } from './icons.js';
import { renderInvitationsSection, setupInvitationsEvents } from './invitations.js';
import { createBottomSheet, closeBottomSheet, showToast } from './ui.js';
import { copyToClipboard, formatCurrency, generateUUID } from './utils.js';

export function renderManagerSettingsView(state) {
  const currentCategory = state.settingsCategory || 'store';

  const categories = [
    { id: 'store', label: '店舗', icon: 'store' },
    { id: 'staffing', label: '人員設定', icon: 'staff' },
    { id: 'presets', label: 'シフト設定', icon: 'clock' },
    { id: 'staff', label: 'スタッフ', icon: 'user' },
    { id: 'rules', label: '勤務条件', icon: 'calendar' },
    { id: 'pay', label: '給与', icon: 'money' },
    { id: 'invites', label: '招待', icon: 'invite' },
    { id: 'account', label: 'アカウント', icon: 'settings' }
  ];

  const navHTML = categories.map(cat => `
    <button class="settings-nav-item ${currentCategory === cat.id ? 'active' : ''}" data-cat-id="${cat.id}">
      ${getIconSVG(cat.icon, { size: 16 })}
      <span>${cat.label}</span>
    </button>
  `).join('');

  let contentHTML = '';
  switch (currentCategory) {
    case 'store':
      contentHTML = renderStoreSettings(state);
      break;
    case 'staffing':
      contentHTML = renderStaffingSettings(state);
      break;
    case 'presets':
      contentHTML = renderPresetSettings(state);
      break;
    case 'staff':
      contentHTML = renderStaffListSettings(state);
      break;
    case 'rules':
      contentHTML = renderWorkRulesSettings(state);
      break;
    case 'pay':
      contentHTML = renderPaySettings(state);
      break;
    case 'invites':
      contentHTML = renderInvitationsSection(state);
      break;
    case 'account':
      contentHTML = renderAccountSettings(state);
      break;
    default:
      contentHTML = renderStoreSettings(state);
  }

  return `
    <div style="display:flex; flex-direction:column; gap:var(--space-4);">
      <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid var(--color-border); padding-bottom:var(--space-3);">
        <div>
          <h1 style="font-size:1.5rem; font-weight:900; letter-spacing:-0.02em;">管理者設定</h1>
          <p style="font-size:0.8rem; color:var(--color-text-secondary);">店舗の各種運用条件およびマスター設定を行います。</p>
        </div>
        <button id="close-settings-btn" class="btn btn-secondary">
          ${getIconSVG('close', { size: 14 })} ワークスペースに戻る
        </button>
      </div>

      <div class="settings-layout">
        <nav class="settings-nav">
          ${navHTML}
        </nav>
        <div class="settings-content">
          ${contentHTML}
        </div>
      </div>
    </div>
  `;
}

// 1. Store Settings (店舗)
function renderStoreSettings(state) {
  const store = state.store || { name: 'omukun 渋谷店', store_code: 'OMK-7F2K9', default_open_time: '09:00', default_close_time: '21:30', timezone: 'Asia/Tokyo' };

  return `
    <div style="display:flex; flex-direction:column; gap:var(--space-5);">
      <div>
        <h2 style="font-size:1.1rem; font-weight:800; border-bottom:1px solid var(--color-border); padding-bottom:var(--space-2);">店舗設定</h2>
      </div>

      <form id="store-settings-form" class="form-group" style="gap:var(--space-4); max-width:560px;">
        <div class="form-group">
          <label class="form-label">店舗名</label>
          <input type="text" id="store-name-input" class="form-input" value="${store.name || ''}" required />
        </div>

        <div style="display:flex; gap:var(--space-3);">
          <div class="form-group" style="flex:1;">
            <label class="form-label">開店時間</label>
            <input type="time" id="store-open-input" class="form-input" value="${store.default_open_time || '09:00'}" required />
          </div>
          <div class="form-group" style="flex:1;">
            <label class="form-label">閉店時間</label>
            <input type="time" id="store-close-input" class="form-input" value="${store.default_close_time || '21:30'}" required />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">タイムゾーン</label>
          <input type="text" id="store-tz-input" class="form-input" value="${store.timezone || 'Asia/Tokyo'}" readonly style="background:var(--color-surface-subtle);" />
        </div>

        <div style="background:var(--color-surface-subtle); border:1px solid var(--color-border); padding:var(--space-4); border-radius:var(--radius-xs); display:flex; align-items:center; justify-content:space-between;">
          <div>
            <div style="font-size:0.75rem; font-weight:800; color:var(--color-text-muted);">店舗コード</div>
            <div style="font-size:1.2rem; font-weight:900; letter-spacing:0.05em; margin-top:2px;">${store.store_code}</div>
          </div>
          <div style="display:flex; gap:var(--space-2);">
            <button type="button" id="copy-code-btn" class="btn btn-secondary btn-sm">
              ${getIconSVG('copy', { size: 12 })} コピー
            </button>
            <button type="button" id="regen-code-btn" class="btn btn-danger btn-sm">
              再発行
            </button>
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; margin-top:var(--space-2);">
          <button type="submit" class="btn btn-primary">設定を保存</button>
        </div>
      </form>
    </div>
  `;
}

// 2. Staffing Requirements (人員設定)
function renderStaffingSettings(state) {
  const rules = state.staffingRules || { default_required_count: 2, time_range_overrides: [], weekday_overrides: [], specific_date_overrides: [] };

  const timeRows = (rules.time_range_overrides || []).map(r => `
    <div class="settings-row">
      <div>
        <strong>${r.time_start} – ${r.time_end}</strong>
        <span style="font-weight:800; color:var(--color-text); margin-left:12px;">${r.required_count}名</span>
      </div>
      <button class="btn btn-secondary btn-sm delete-rule-btn" data-type="time_range" data-id="${r.id}">削除</button>
    </div>
  `).join('');

  const weekdayNames = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
  const weekdayRows = (rules.weekday_overrides || []).map(r => `
    <div class="settings-row">
      <div>
        <strong>${weekdayNames[r.day_of_week] || '特定曜日'} (${r.time_start || '終日'}–${r.time_end || ''})</strong>
        <span style="font-weight:800; color:var(--color-text); margin-left:12px;">${r.required_count}名</span>
      </div>
      <button class="btn btn-secondary btn-sm delete-rule-btn" data-type="weekday" data-id="${r.id}">削除</button>
    </div>
  `).join('');

  const specificRows = (rules.specific_date_overrides || []).map(r => `
    <div class="settings-row">
      <div>
        <strong>${r.date} (${r.time_start || '全時間'}–${r.time_end || ''})</strong>
        <span style="font-weight:800; color:var(--color-text); margin-left:12px;">${r.required_count}名</span>
      </div>
      <button class="btn btn-secondary btn-sm delete-rule-btn" data-type="specific_date" data-id="${r.id}">削除</button>
    </div>
  `).join('');

  return `
    <div style="display:flex; flex-direction:column; gap:var(--space-5);">
      <div>
        <h2 style="font-size:1.1rem; font-weight:800; border-bottom:1px solid var(--color-border); padding-bottom:var(--space-2);">人員設定（必要人数ルール）</h2>
        <p style="font-size:0.8rem; color:var(--color-text-secondary); margin-top:4px;">
          店舗運営に必要な最低人員数を設定します。優先順位: <strong>特定日付 &gt; 曜日 &gt; 時間帯/店舗基本</strong>
        </p>
      </div>

      <div class="settings-group">
        <div class="settings-row" style="background:var(--color-surface-subtle); border-bottom:1px solid var(--color-border);">
          <strong style="font-size:0.85rem;">基本の必要人数</strong>
        </div>
        <div class="settings-row">
          <span>店舗の標準必要人数</span>
          <div style="display:flex; align-items:center; gap:var(--space-2);">
            <input type="number" id="default-req-input" class="form-input" style="width:70px; text-align:center;" value="${rules.default_required_count || 2}" min="1" max="20" />
            <span style="font-weight:700;">名</span>
            <button id="save-default-req-btn" class="btn btn-primary btn-sm">保存</button>
          </div>
        </div>
      </div>

      <div class="settings-group">
        <div class="settings-row" style="background:var(--color-surface-subtle); border-bottom:1px solid var(--color-border);">
          <strong style="font-size:0.85rem;">時間帯ごとの設定 (${(rules.time_range_overrides || []).length}件)</strong>
          <button id="add-time-override-btn" class="btn btn-secondary btn-sm">${getIconSVG('add', { size: 12 })} 追加</button>
        </div>
        ${timeRows || `<div class="settings-row" style="color:var(--color-text-muted);">設定なし (基本人数が適用されます)</div>`}
      </div>

      <div class="settings-group">
        <div class="settings-row" style="background:var(--color-surface-subtle); border-bottom:1px solid var(--color-border);">
          <strong style="font-size:0.85rem;">曜日ごとの設定 (${(rules.weekday_overrides || []).length}件)</strong>
          <button id="add-weekday-override-btn" class="btn btn-secondary btn-sm">${getIconSVG('add', { size: 12 })} 追加</button>
        </div>
        ${weekdayRows || `<div class="settings-row" style="color:var(--color-text-muted);">設定なし</div>`}
      </div>

      <div class="settings-group">
        <div class="settings-row" style="background:var(--color-surface-subtle); border-bottom:1px solid var(--color-border);">
          <strong style="font-size:0.85rem;">日付ごとの特定設定 (${(rules.specific_date_overrides || []).length}件)</strong>
          <button id="add-specific-date-override-btn" class="btn btn-secondary btn-sm">${getIconSVG('add', { size: 12 })} 追加</button>
        </div>
        ${specificRows || `<div class="settings-row" style="color:var(--color-text-muted);">設定なし</div>`}
      </div>
    </div>
  `;
}

// 3. Shift Presets (シフト設定)
function renderPresetSettings(state) {
  const presets = state.presets || [];

  const presetRowsHTML = presets.map(p => `
    <div class="settings-row">
      <div style="display:flex; align-items:center; gap:var(--space-3);">
        <strong style="font-size:0.875rem;">${p.name}</strong>
        <span style="font-size:0.8rem; font-weight:700; color:var(--color-text-secondary);">${p.start_time} – ${p.end_time}</span>
        <span style="font-size:0.75rem; color:var(--color-text-muted);">休憩 ${p.break_minutes || 60}分</span>
      </div>
      <div style="display:flex; align-items:center; gap:var(--space-2);">
        <button class="btn btn-secondary btn-sm edit-preset-btn" data-id="${p.id}">編集</button>
        <button class="btn btn-danger btn-sm delete-preset-btn" data-id="${p.id}">削除</button>
      </div>
    </div>
  `).join('');

  return `
    <div style="display:flex; flex-direction:column; gap:var(--space-5);">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h2 style="font-size:1.1rem; font-weight:800; border-bottom:1px solid var(--color-border); padding-bottom:var(--space-2);">シフト時間プリセット</h2>
          <p style="font-size:0.8rem; color:var(--color-text-secondary); margin-top:4px;">シフト配置でワンタップ指定できる時間枠テンプレートです。</p>
        </div>
        <button id="add-preset-btn" class="btn btn-primary">
          ${getIconSVG('add', { size: 14 })} プリセットを追加
        </button>
      </div>

      <div class="settings-group">
        ${presetRowsHTML || `<div class="settings-row" style="color:var(--color-text-muted);">プリセットがありません</div>`}
      </div>
    </div>
  `;
}

// 4. Staff Management (スタッフ)
function renderStaffListSettings(state) {
  const members = state.members || [];

  const memberRows = members.map(m => {
    const isHourly = m.pay_type !== 'monthly';
    const payText = isHourly ? `時給 ${formatCurrency(m.hourly_rate || 1100)}` : `月給 ${formatCurrency(m.monthly_salary || 200000)}`;

    return `
      <div class="settings-row" data-member-id="${m.id}">
        <div style="display:flex; align-items:center; gap:var(--space-3);">
          <span class="timeline-staff-dot" style="background:${m.color}; width:10px; height:10px;"></span>
          <strong style="font-size:0.875rem;">${m.name}</strong>
          <span class="btn btn-sm" style="background:var(--color-surface-hover); border:none; padding:1px 6px; font-size:0.65rem; font-weight:700;">${m.role === 'admin' ? '管理者' : 'スタッフ'}</span>
          <span style="font-size:0.75rem; color:var(--color-text-muted);">${payText}</span>
        </div>

        <div style="display:flex; align-items:center; gap:var(--space-3);">
          <span style="font-size:0.75rem; color:var(--color-text-secondary); font-weight:600;">月間 ${m.min_monthly_hours || 40}h ～ ${m.max_monthly_hours || 100}h</span>
          <button class="btn btn-secondary btn-sm edit-staff-btn" data-id="${m.id}">詳細編集</button>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div style="display:flex; flex-direction:column; gap:var(--space-5);">
      <div>
        <h2 style="font-size:1.1rem; font-weight:800; border-bottom:1px solid var(--color-border); padding-bottom:var(--space-2);">スタッフ管理</h2>
        <p style="font-size:0.8rem; color:var(--color-text-secondary); margin-top:4px;">所属スタッフの基本情報、勤務条件、個人カラーを設定します。</p>
      </div>

      <div class="settings-group">
        ${memberRows}
      </div>
    </div>
  `;
}

// 5. Work Rules & Month Overrides (勤務条件)
function renderWorkRulesSettings(state) {
  const members = state.members || [];
  const monthRules = state.staffMonthRules || [];

  const ruleRows = members.map(m => {
    const override = monthRules.find(r => r.member_id === m.id);
    const minH = override ? override.min_monthly_hours : m.min_monthly_hours;
    const maxH = override ? override.max_monthly_hours : m.max_monthly_hours;

    return `
      <div class="settings-row" data-member-id="${m.id}">
        <div style="display:flex; align-items:center; gap:var(--space-3);">
          <span class="timeline-staff-dot" style="background:${m.color};"></span>
          <strong style="font-size:0.85rem;">${m.name}</strong>
          ${override ? `<span class="btn btn-sm" style="background:var(--color-warning-bg); color:var(--color-warning); border:none; padding:1px 6px; font-size:0.65rem; font-weight:800;">月別個別設定あり</span>` : ''}
        </div>

        <div style="display:flex; align-items:center; gap:var(--space-3);">
          <span style="font-size:0.75rem; color:var(--color-text-secondary);">通常上限: ${m.max_monthly_hours || 100}h</span>
          <button class="btn btn-secondary btn-sm edit-month-override-btn" data-id="${m.id}">
            ${state.currentMonthKey} の上限変更
          </button>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div style="display:flex; flex-direction:column; gap:var(--space-5);">
      <div>
        <h2 style="font-size:1.1rem; font-weight:800; border-bottom:1px solid var(--color-border); padding-bottom:var(--space-2);">勤務条件・月別特例ルール</h2>
        <p style="font-size:0.8rem; color:var(--color-text-secondary); margin-top:4px;">対象月 (${state.currentMonthKey}) の個別上限・下限を設定できます。</p>
      </div>

      <div class="settings-group">
        ${ruleRows}
      </div>
    </div>
  `;
}

// 6. Pay Settings (給与)
function renderPaySettings(state) {
  const members = state.members || [];

  const payRows = members.map(m => {
    const isHourly = m.pay_type !== 'monthly';

    return `
      <div class="settings-row" data-member-id="${m.id}">
        <div style="display:flex; align-items:center; gap:var(--space-3);">
          <span class="timeline-staff-dot" style="background:${m.color};"></span>
          <strong style="font-size:0.85rem;">${m.name}</strong>
        </div>

        <div style="display:flex; align-items:center; gap:var(--space-3);">
          <select class="form-select pay-type-select" data-id="${m.id}" style="padding:2px 6px; font-size:0.75rem;">
            <option value="hourly" ${isHourly ? 'selected' : ''}>時給制</option>
            <option value="monthly" ${!isHourly ? 'selected' : ''}>月給制</option>
          </select>

          <input type="number" class="form-input pay-amount-input" data-id="${m.id}" style="width:110px; text-align:right;" value="${isHourly ? (m.hourly_rate || 1100) : (m.monthly_salary || 200000)}" step="50" />
          <span style="font-size:0.75rem; font-weight:700;">円</span>

          <button class="btn btn-primary btn-sm save-pay-btn" data-id="${m.id}">保存</button>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div style="display:flex; flex-direction:column; gap:var(--space-5);">
      <div>
        <h2 style="font-size:1.1rem; font-weight:800; border-bottom:1px solid var(--color-border); padding-bottom:var(--space-2);">給与・人件費設定</h2>
        <p style="font-size:0.8rem; color:var(--color-text-secondary); margin-top:4px;">スタッフの時給・月給を設定します（管理者のみ閲覧可能）。</p>
      </div>

      <div class="settings-group">
        ${payRows}
      </div>
    </div>
  `;
}

// 7. Account Settings (アカウント)
function renderAccountSettings(state) {
  const user = state.currentUser || { name: '山田 太郎', email: 'yamada@omukun.jp', role: 'admin' };

  return `
    <div style="display:flex; flex-direction:column; gap:var(--space-5);">
      <div>
        <h2 style="font-size:1.1rem; font-weight:800; border-bottom:1px solid var(--color-border); padding-bottom:var(--space-2);">アカウント設定</h2>
      </div>

      <form id="account-form" class="form-group" style="gap:var(--space-4); max-width:500px;">
        <div class="form-group">
          <label class="form-label">表示名</label>
          <input type="text" id="acc-name-input" class="form-input" value="${user.name || ''}" required />
        </div>

        <div class="form-group">
          <label class="form-label">メールアドレス</label>
          <input type="email" id="acc-email-input" class="form-input" value="${user.email || ''}" required />
        </div>

        <div class="form-group">
          <label class="form-label">現在の権限</label>
          <input type="text" class="form-input" value="${user.role === 'admin' ? '店舗管理者 (Admin)' : 'スタッフ (Staff)'}" readonly style="background:var(--color-surface-subtle);" />
        </div>

        <div style="display:flex; justify-content:space-between; margin-top:var(--space-2);">
          <button type="button" id="acc-logout-btn" class="btn btn-danger">
            ${getIconSVG('logout', { size: 14 })} ログアウト
          </button>
          <button type="submit" class="btn btn-primary">変更を保存</button>
        </div>
      </form>
    </div>
  `;
}

export function setupSettingsEvents(stateManager) {
  const closeBtn = document.getElementById('close-settings-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      stateManager.setCurrentView('workspace');
    });
  }

  const navItems = document.querySelectorAll('.settings-nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const catId = item.getAttribute('data-cat-id');
      stateManager.setSettingsCategory(catId);
    });
  });

  // Store settings form
  const storeForm = document.getElementById('store-settings-form');
  if (storeForm) {
    storeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('store-name-input').value;
      const openT = document.getElementById('store-open-input').value;
      const closeT = document.getElementById('store-close-input').value;

      await stateManager.saveStore({
        name,
        default_open_time: openT,
        default_close_time: closeT
      });
      showToast('店舗設定を更新しました');
    });

    const copyBtn = document.getElementById('copy-code-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const code = stateManager.state.store ? stateManager.state.store.store_code : 'OMK-7F2K9';
        copyToClipboard(code);
        showToast(`店舗コード ${code} をコピーしました`);
      });
    }

    const regenBtn = document.getElementById('regen-code-btn');
    if (regenBtn) {
      regenBtn.addEventListener('click', async () => {
        if (confirm('店舗コードを再発行しますか？以前のコードは無効になります。')) {
          const newCode = `OMK-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
          await stateManager.saveStore({ store_code: newCode });
          showToast(`新しい店舗コード ${newCode} を発行しました`);
        }
      });
    }
  }

  // Staffing settings event listeners
  const saveDefaultReqBtn = document.getElementById('save-default-req-btn');
  if (saveDefaultReqBtn) {
    saveDefaultReqBtn.addEventListener('click', async () => {
      const count = parseInt(document.getElementById('default-req-input').value, 10) || 2;
      const current = stateManager.state.staffingRules || {};
      await stateManager.saveStaffingRules({
        ...current,
        default_required_count: count
      });
      showToast(`基本必要人数を ${count}名 に変更しました`);
    });
  }

  const addTimeOverrideBtn = document.getElementById('add-time-override-btn');
  if (addTimeOverrideBtn) {
    addTimeOverrideBtn.addEventListener('click', () => {
      openTimeOverrideModal(stateManager);
    });
  }

  const addWeekdayOverrideBtn = document.getElementById('add-weekday-override-btn');
  if (addWeekdayOverrideBtn) {
    addWeekdayOverrideBtn.addEventListener('click', () => {
      openWeekdayOverrideModal(stateManager);
    });
  }

  const addSpecificOverrideBtn = document.getElementById('add-specific-date-override-btn');
  if (addSpecificOverrideBtn) {
    addSpecificOverrideBtn.addEventListener('click', () => {
      openSpecificDateOverrideModal(stateManager, stateManager.state.selectedDate);
    });
  }

  const deleteRuleBtns = document.querySelectorAll('.delete-rule-btn');
  deleteRuleBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      const type = btn.getAttribute('data-type');
      const id = btn.getAttribute('data-id');
      const rules = stateManager.state.staffingRules || {};

      if (type === 'time_range') {
        rules.time_range_overrides = rules.time_range_overrides.filter(r => r.id !== id);
      } else if (type === 'weekday') {
        rules.weekday_overrides = rules.weekday_overrides.filter(r => r.id !== id);
      } else if (type === 'specific_date') {
        rules.specific_date_overrides = rules.specific_date_overrides.filter(r => r.id !== id);
      }

      await stateManager.saveStaffingRules(rules);
      showToast('人員設定ルールを削除しました');
    });
  });

  // Presets listeners
  const addPresetBtn = document.getElementById('add-preset-btn');
  if (addPresetBtn) {
    addPresetBtn.addEventListener('click', () => {
      openPresetModal(stateManager, null);
    });
  }

  const editPresetBtns = document.querySelectorAll('.edit-preset-btn');
  editPresetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      openPresetModal(stateManager, id);
    });
  });

  const deletePresetBtns = document.querySelectorAll('.delete-preset-btn');
  deletePresetBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (confirm('このシフトプリセットを削除しますか？')) {
        const presets = stateManager.state.presets.filter(p => p.id !== id);
        await stateManager.savePresets(presets);
        showToast('プリセットを削除しました');
      }
    });
  });

  // Staff details modal
  const editStaffBtns = document.querySelectorAll('.edit-staff-btn');
  editStaffBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      openStaffDetailModal(stateManager, id);
    });
  });

  // Work rule overrides modal
  const editOverrideBtns = document.querySelectorAll('.edit-month-override-btn');
  editOverrideBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      openMonthOverrideModal(stateManager, id);
    });
  });

  // Pay settings save
  const savePayBtns = document.querySelectorAll('.save-pay-btn');
  savePayBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const member = stateManager.state.members.find(m => m.id === id);
      const row = btn.closest('.settings-row');
      const payType = row.querySelector('.pay-type-select').value;
      const amount = parseFloat(row.querySelector('.pay-amount-input').value) || 0;

      await stateManager.saveMember({
        ...member,
        pay_type: payType,
        hourly_rate: payType === 'hourly' ? amount : member.hourly_rate,
        monthly_salary: payType === 'monthly' ? amount : member.monthly_salary
      });

      showToast(`${member.name} の給与設定を保存しました`);
    });
  });

  // Invitations section handlers
  if (stateManager.state.settingsCategory === 'invites') {
    setupInvitationsEvents(stateManager);
  }

  // Account form
  const accForm = document.getElementById('account-form');
  if (accForm) {
    accForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('acc-name-input').value;
      const email = document.getElementById('acc-email-input').value;
      const currentMember = stateManager.state.members.find(m => m.id === stateManager.state.currentMemberId);
      if (currentMember) {
        await stateManager.saveMember({ ...currentMember, name, email });
        showToast('アカウント情報を更新しました');
      }
    });

    const logoutBtn = document.getElementById('acc-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        stateManager.setCurrentView('auth');
        showToast('ログアウトしました');
      });
    }
  }
}

// Modal helper dialogs for settings
function openTimeOverrideModal(stateManager) {
  const contentHTML = `
    <form id="time-override-form" class="form-group" style="gap:var(--space-3);">
      <h3 style="font-size:1rem; font-weight:800; border-bottom:1px solid var(--color-border); padding-bottom:var(--space-2);">時間帯別・必要人数の追加</h3>

      <div style="display:flex; gap:var(--space-2);">
        <div class="form-group" style="flex:1;">
          <label class="form-label">開始時間</label>
          <input type="time" id="tr-start" class="form-input" value="11:00" step="900" required />
        </div>
        <div class="form-group" style="flex:1;">
          <label class="form-label">終了時間</label>
          <input type="time" id="tr-end" class="form-input" value="14:00" step="900" required />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">必要人数</label>
        <input type="number" id="tr-count" class="form-input" value="3" min="1" max="20" required />
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
      body.querySelector('#time-override-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const start = body.querySelector('#tr-start').value;
        const end = body.querySelector('#tr-end').value;
        const count = parseInt(body.querySelector('#tr-count').value, 10);

        const current = stateManager.state.staffingRules || { time_range_overrides: [] };
        const updated = [...(current.time_range_overrides || []), {
          id: `tr-${generateUUID().substring(0, 6)}`,
          time_start: start,
          time_end: end,
          required_count: count
        }];

        await stateManager.saveStaffingRules({
          ...current,
          time_range_overrides: updated
        });

        closeBottomSheet();
        showToast('時間帯別の必要人数設定を追加しました');
      });
    }
  });
}

function openWeekdayOverrideModal(stateManager) {
  const contentHTML = `
    <form id="weekday-override-form" class="form-group" style="gap:var(--space-3);">
      <h3 style="font-size:1rem; font-weight:800; border-bottom:1px solid var(--color-border); padding-bottom:var(--space-2);">曜日別・必要人数の追加</h3>

      <div class="form-group">
        <label class="form-label">対象曜日</label>
        <select id="wd-day" class="form-select">
          <option value="6">土曜日</option>
          <option value="0">日曜日</option>
          <option value="1">月曜日</option>
          <option value="2">火曜日</option>
          <option value="3">水曜日</option>
          <option value="4">木曜日</option>
          <option value="5">金曜日</option>
        </select>
      </div>

      <div style="display:flex; gap:var(--space-2);">
        <div class="form-group" style="flex:1;">
          <label class="form-label">開始時間</label>
          <input type="time" id="wd-start" class="form-input" value="11:00" step="900" />
        </div>
        <div class="form-group" style="flex:1;">
          <label class="form-label">終了時間</label>
          <input type="time" id="wd-end" class="form-input" value="15:00" step="900" />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">必要人数</label>
        <input type="number" id="wd-count" class="form-input" value="4" min="1" max="20" required />
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
      body.querySelector('#weekday-override-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const day = parseInt(body.querySelector('#wd-day').value, 10);
        const start = body.querySelector('#wd-start').value;
        const end = body.querySelector('#wd-end').value;
        const count = parseInt(body.querySelector('#wd-count').value, 10);

        const current = stateManager.state.staffingRules || { weekday_overrides: [] };
        const updated = [...(current.weekday_overrides || []), {
          id: `wd-${generateUUID().substring(0, 6)}`,
          day_of_week: day,
          time_start: start,
          time_end: end,
          required_count: count
        }];

        await stateManager.saveStaffingRules({
          ...current,
          weekday_overrides: updated
        });

        closeBottomSheet();
        showToast('曜日別の必要人数設定を追加しました');
      });
    }
  });
}

export function openSpecificDateOverrideModal(stateManager, defaultDate) {
  const targetDate = defaultDate || stateManager.state.selectedDate;

  const contentHTML = `
    <form id="specific-date-override-form" class="form-group" style="gap:var(--space-3);">
      <h3 style="font-size:1rem; font-weight:800; border-bottom:1px solid var(--color-border); padding-bottom:var(--space-2);">この日の人員設定 (${targetDate})</h3>

      <div class="form-group">
        <label class="form-label">対象日付</label>
        <input type="date" id="sd-date" class="form-input" value="${targetDate}" required />
      </div>

      <div style="display:flex; gap:var(--space-2);">
        <div class="form-group" style="flex:1;">
          <label class="form-label">開始時間</label>
          <input type="time" id="sd-start" class="form-input" value="18:00" step="900" />
        </div>
        <div class="form-group" style="flex:1;">
          <label class="form-label">終了時間</label>
          <input type="time" id="sd-end" class="form-input" value="21:30" step="900" />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">必要人数</label>
        <input type="number" id="sd-count" class="form-input" value="4" min="1" max="20" required />
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
      body.querySelector('#specific-date-override-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const date = body.querySelector('#sd-date').value;
        const start = body.querySelector('#sd-start').value;
        const end = body.querySelector('#sd-end').value;
        const count = parseInt(body.querySelector('#sd-count').value, 10);

        const current = stateManager.state.staffingRules || { specific_date_overrides: [] };
        const updated = [...(current.specific_date_overrides || []), {
          id: `sd-${generateUUID().substring(0, 6)}`,
          date,
          time_start: start,
          time_end: end,
          required_count: count
        }];

        await stateManager.saveStaffingRules({
          ...current,
          specific_date_overrides: updated
        });

        closeBottomSheet();
        showToast(`${date} の特定人員設定を追加しました`);
      });
    }
  });
}

function openPresetModal(stateManager, presetId) {
  const existing = stateManager.state.presets.find(p => p.id === presetId) || {
    name: '', start_time: '09:30', end_time: '18:30', break_minutes: 60
  };

  const contentHTML = `
    <form id="preset-edit-form" class="form-group" style="gap:var(--space-3);">
      <h3 style="font-size:1rem; font-weight:800; border-bottom:1px solid var(--color-border); padding-bottom:var(--space-2);">${presetId ? 'プリセット編集' : '新規プリセット作成'}</h3>

      <div class="form-group">
        <label class="form-label">プリセット名</label>
        <input type="text" id="p-name" class="form-input" placeholder="例: 早番 (A)" value="${existing.name}" required />
      </div>

      <div style="display:flex; gap:var(--space-2);">
        <div class="form-group" style="flex:1;">
          <label class="form-label">開始時間</label>
          <input type="time" id="p-start" class="form-input" value="${existing.start_time}" step="900" required />
        </div>
        <div class="form-group" style="flex:1;">
          <label class="form-label">終了時間</label>
          <input type="time" id="p-end" class="form-input" value="${existing.end_time}" step="900" required />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">休憩時間（分）</label>
        <input type="number" id="p-break" class="form-input" value="${existing.break_minutes || 60}" step="15" min="0" required />
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
      body.querySelector('#preset-edit-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = body.querySelector('#p-name').value;
        const start = body.querySelector('#p-start').value;
        const end = body.querySelector('#p-end').value;
        const breakMin = parseInt(body.querySelector('#p-break').value, 10) || 60;

        const currentPresets = [...stateManager.state.presets];
        if (presetId) {
          const idx = currentPresets.findIndex(p => p.id === presetId);
          if (idx >= 0) {
            currentPresets[idx] = { ...currentPresets[idx], name, start_time: start, end_time: end, break_minutes: breakMin };
          }
        } else {
          currentPresets.push({
            id: `preset-${generateUUID().substring(0, 6)}`,
            name,
            start_time: start,
            end_time: end,
            break_minutes: breakMin,
            active: true
          });
        }

        await stateManager.savePresets(currentPresets);
        closeBottomSheet();
        showToast('シフトプリセットを保存しました');
      });
    }
  });
}

function openStaffDetailModal(stateManager, memberId) {
  const member = stateManager.state.members.find(m => m.id === memberId);
  if (!member) return;

  const contentHTML = `
    <form id="staff-detail-form" class="form-group" style="gap:var(--space-3);">
      <h3 style="font-size:1rem; font-weight:800; border-bottom:1px solid var(--color-border); padding-bottom:var(--space-2);">${member.name} の設定</h3>

      <div class="form-group">
        <label class="form-label">表示名</label>
        <input type="text" id="sd-name" class="form-input" value="${member.name}" required />
      </div>

      <div style="display:flex; gap:var(--space-2);">
        <div class="form-group" style="flex:1;">
          <label class="form-label">権限</label>
          <select id="sd-role" class="form-select">
            <option value="staff" ${member.role === 'staff' ? 'selected' : ''}>スタッフ</option>
            <option value="admin" ${member.role === 'admin' ? 'selected' : ''}>管理者</option>
          </select>
        </div>
        <div class="form-group" style="flex:1;">
          <label class="form-label">カラー</label>
          <input type="color" id="sd-color" class="form-input" value="${member.color || '#3b82f6'}" style="height:38px; padding:2px;" />
        </div>
      </div>

      <div style="display:flex; gap:var(--space-2);">
        <div class="form-group" style="flex:1;">
          <label class="form-label">月間最低勤務時間 (h)</label>
          <input type="number" id="sd-min-h" class="form-input" value="${member.min_monthly_hours || 40}" step="5" />
        </div>
        <div class="form-group" style="flex:1;">
          <label class="form-label">月間上限勤務時間 (h)</label>
          <input type="number" id="sd-max-h" class="form-input" value="${member.max_monthly_hours || 100}" step="5" />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">管理者メモ</label>
        <input type="text" id="sd-notes" class="form-input" value="${member.notes || ''}" placeholder="メモ事項" />
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
      body.querySelector('#staff-detail-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = body.querySelector('#sd-name').value;
        const role = body.querySelector('#sd-role').value;
        const color = body.querySelector('#sd-color').value;
        const minH = parseFloat(body.querySelector('#sd-min-h').value) || 0;
        const maxH = parseFloat(body.querySelector('#sd-max-h').value) || 100;
        const notes = body.querySelector('#sd-notes').value;

        await stateManager.saveMember({
          ...member,
          name,
          role,
          color,
          min_monthly_hours: minH,
          max_monthly_hours: maxH,
          notes
        });

        closeBottomSheet();
        showToast('スタッフ情報を更新しました');
      });
    }
  });
}

function openMonthOverrideModal(stateManager, memberId) {
  const member = stateManager.state.members.find(m => m.id === memberId);
  if (!member) return;

  const currentMonthKey = stateManager.state.currentMonthKey;
  const existing = (stateManager.state.staffMonthRules || []).find(r => r.member_id === memberId && r.month_key === currentMonthKey) || {
    min_monthly_hours: member.min_monthly_hours,
    max_monthly_hours: member.max_monthly_hours
  };

  const contentHTML = `
    <form id="month-override-form" class="form-group" style="gap:var(--space-3);">
      <h3 style="font-size:1rem; font-weight:800; border-bottom:1px solid var(--color-border); padding-bottom:var(--space-2);">${member.name} (${currentMonthKey}) の上限設定</h3>

      <div class="form-group">
        <label class="form-label">通常上限</label>
        <input type="text" class="form-input" value="${member.max_monthly_hours || 100} 時間" readonly style="background:var(--color-surface-subtle);" />
      </div>

      <div class="form-group">
        <label class="form-label">${currentMonthKey} の上限勤務時間 (h)</label>
        <input type="number" id="mo-max-h" class="form-input" value="${existing.max_monthly_hours || member.max_monthly_hours || 100}" step="5" required />
      </div>

      <div style="display:flex; justify-content:flex-end; gap:var(--space-2); margin-top:var(--space-2);">
        <button type="button" class="btn btn-secondary close-sheet-btn">キャンセル</button>
        <button type="submit" class="btn btn-primary">この月だけ変更</button>
      </div>
    </form>
  `;

  createBottomSheet({
    title: '',
    contentHTML,
    onOpen: (body) => {
      body.querySelector('#month-override-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const maxH = parseFloat(body.querySelector('#mo-max-h').value) || 100;

        await stateManager.saveStaffMonthRule({
          id: `smr-${memberId}-${currentMonthKey}`,
          member_id: memberId,
          month_key: currentMonthKey,
          min_monthly_hours: member.min_monthly_hours,
          max_monthly_hours: maxH
        });

        closeBottomSheet();
        showToast(`${currentMonthKey} の上限を ${maxH}h に設定しました`);
      });
    }
  });
}
