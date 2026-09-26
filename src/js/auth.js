// Authentication, Login Screen, Onboarding & User Session
import { getIconSVG } from './icons.js';
import { createBottomSheet, closeBottomSheet, showToast } from './ui.js';
import { generateUUID } from './utils.js';

export function renderAuthView(state) {
  return `
    <div class="auth-container">
      <div class="auth-header">
        <img src="/src/assets/brand/omukun-logo.svg" alt="omukun" style="height:36px;" />
        <h1 class="auth-title">omukun Shift ログイン</h1>
        <p style="font-size:0.8rem; color:var(--color-text-secondary);">店舗のシフト管理・希望提出システム</p>
      </div>

      <form id="login-form" class="form-group" style="gap:var(--space-4);">
        <div class="form-group">
          <label class="form-label">メールアドレス</label>
          <input type="email" id="login-email" class="form-input" placeholder="name@example.com" value="yamada@omukun.jp" required />
        </div>

        <div class="form-group">
          <label class="form-label">パスワード</label>
          <input type="password" id="login-password" class="form-input" value="••••••••" required />
        </div>

        <button type="submit" class="btn btn-primary btn-lg" style="width:100%;">
          ${getIconSVG('user', { size: 16 })} ログイン
        </button>
      </form>

      <div style="text-align:center;">
        <button id="forgot-pw-btn" class="btn btn-secondary btn-sm" style="border:none; color:var(--color-text-muted);">
          パスワードを忘れた方
        </button>
      </div>

      <div style="border-top:1px solid var(--color-border); padding-top:var(--space-4); display:flex; flex-direction:column; gap:var(--space-2); text-align:center;">
        <p style="font-size:0.75rem; color:var(--color-text-muted); font-weight:700;">初めて利用する方</p>
        <div style="display:flex; gap:var(--space-2);">
          <button id="signup-manager-btn" class="btn btn-secondary" style="flex:1;">
            ${getIconSVG('store', { size: 14 })} 管理者として始める
          </button>
          <button id="join-store-btn" class="btn btn-secondary" style="flex:1;">
            ${getIconSVG('invite', { size: 14 })} 店舗に参加する
          </button>
        </div>
      </div>

      <!-- Demo Shortcut Switcher -->
      <div style="background:var(--color-surface-subtle); padding:var(--space-3); border-radius:var(--radius-xs); border:1px solid var(--color-border); text-align:center;">
        <p style="font-size:0.725rem; font-weight:700; color:var(--color-text-muted); margin-bottom:var(--space-2);">【デモモード体験】</p>
        <div style="display:flex; justify-content:center; gap:var(--space-2);">
          <button id="demo-login-admin" class="btn btn-secondary btn-sm">管理者（山田）</button>
          <button id="demo-login-staff" class="btn btn-secondary btn-sm">スタッフ（佐藤）</button>
        </div>
      </div>
    </div>
  `;
}

export function setupAuthEvents(stateManager) {
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const member = stateManager.state.members.find(m => m.email === email) || stateManager.state.members[0];
      stateManager.setCurrentMember(member.id);
      stateManager.setRole(member.role);
      stateManager.setCurrentView('workspace');
      showToast(`${member.name} 様としてログインしました`);
    });
  }

  const forgotBtn = document.getElementById('forgot-pw-btn');
  if (forgotBtn) {
    forgotBtn.addEventListener('click', () => {
      openPasswordResetModal();
    });
  }

  const signupMgrBtn = document.getElementById('signup-manager-btn');
  if (signupMgrBtn) {
    signupMgrBtn.addEventListener('click', () => {
      openManagerSignupModal(stateManager);
    });
  }

  const joinStoreBtn = document.getElementById('join-store-btn');
  if (joinStoreBtn) {
    joinStoreBtn.addEventListener('click', () => {
      openStaffJoinModal(stateManager);
    });
  }

  const demoAdminBtn = document.getElementById('demo-login-admin');
  if (demoAdminBtn) {
    demoAdminBtn.addEventListener('click', () => {
      stateManager.setRole('admin');
      stateManager.setCurrentView('workspace');
      showToast('管理者モードでログインしました');
    });
  }

  const demoStaffBtn = document.getElementById('demo-login-staff');
  if (demoStaffBtn) {
    demoStaffBtn.addEventListener('click', () => {
      stateManager.setRole('staff');
      stateManager.setCurrentView('workspace');
      showToast('スタッフモードでログインしました');
    });
  }
}

function openPasswordResetModal() {
  const contentHTML = `
    <div class="form-group" style="gap:var(--space-4);">
      <h3 style="font-size:1rem; font-weight:800; border-bottom:1px solid var(--color-border); padding-bottom:var(--space-2);">パスワードの再設定</h3>
      <p style="font-size:0.8rem; color:var(--color-text-secondary);">ご登録のメールアドレス宛に再設定リンクを送信します。</p>
      <div class="form-group">
        <label class="form-label">メールアドレス</label>
        <input type="email" id="reset-email" class="form-input" placeholder="name@example.com" required />
      </div>
      <div style="display:flex; justify-content:flex-end; gap:var(--space-2);">
        <button class="btn btn-secondary close-sheet-btn">キャンセル</button>
        <button id="send-reset-btn" class="btn btn-primary">再設定メールを送信</button>
      </div>
    </div>
  `;

  createBottomSheet({
    title: '',
    contentHTML,
    onOpen: (body) => {
      body.querySelector('#send-reset-btn').addEventListener('click', () => {
        closeBottomSheet();
        showToast('パスワード再設定メールを送信しました');
      });
    }
  });
}

function openManagerSignupModal(stateManager) {
  const contentHTML = `
    <form id="mgr-signup-form" class="form-group" style="gap:var(--space-3);">
      <h3 style="font-size:1rem; font-weight:800; border-bottom:1px solid var(--color-border); padding-bottom:var(--space-2);">管理者として新規登録</h3>

      <div class="form-group">
        <label class="form-label">店舗名</label>
        <input type="text" id="signup-store-name" class="form-input" placeholder="例: omukun 新宿店" required />
      </div>

      <div class="form-group">
        <label class="form-label">お名前</label>
        <input type="text" id="signup-name" class="form-input" placeholder="山田 太郎" required />
      </div>

      <div class="form-group">
        <label class="form-label">生年月日</label>
        <input type="date" id="signup-dob" class="form-input" value="1990-01-01" required />
      </div>

      <div class="form-group">
        <label class="form-label">メールアドレス</label>
        <input type="email" id="signup-email" class="form-input" placeholder="name@example.com" required />
      </div>

      <div class="form-group">
        <label class="form-label">パスワード</label>
        <input type="password" id="signup-password" class="form-input" minlength="8" required />
      </div>

      <div style="display:flex; justify-content:flex-end; gap:var(--space-2); margin-top:var(--space-2);">
        <button type="button" class="btn btn-secondary close-sheet-btn">キャンセル</button>
        <button type="submit" class="btn btn-primary">登録して店舗を作成</button>
      </div>
    </form>
  `;

  createBottomSheet({
    title: '',
    contentHTML,
    onOpen: (body) => {
      body.querySelector('#mgr-signup-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const storeName = body.querySelector('#signup-store-name').value;
        const name = body.querySelector('#signup-name').value;
        const email = body.querySelector('#signup-email').value;

        const storeCode = `OMK-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        const newMemberId = `m-${generateUUID().substring(0, 8)}`;

        await stateManager.saveStore({
          id: `store-${generateUUID().substring(0, 8)}`,
          name: storeName,
          store_code: storeCode,
          default_open_time: '09:00',
          default_close_time: '21:30',
          timezone: 'Asia/Tokyo'
        });

        await stateManager.saveMember({
          id: newMemberId,
          name,
          email,
          role: 'admin',
          color: '#ef4444',
          min_monthly_hours: 80,
          max_monthly_hours: 120,
          min_shift_hours: 4,
          pay_type: 'hourly',
          hourly_rate: 1200,
          status: 'active',
          notes: '店舗開設管理者'
        });

        closeBottomSheet();
        stateManager.setCurrentMember(newMemberId);
        stateManager.setRole('admin');
        stateManager.setCurrentView('workspace');
        showToast(`店舗 ${storeName} （コード: ${storeCode}） を開設しました`);
      });
    }
  });
}

function openStaffJoinModal(stateManager) {
  const contentHTML = `
    <form id="staff-join-form" class="form-group" style="gap:var(--space-3);">
      <h3 style="font-size:1rem; font-weight:800; border-bottom:1px solid var(--color-border); padding-bottom:var(--space-2);">店舗コードで参加</h3>

      <div class="form-group">
        <label class="form-label">店舗コード</label>
        <input type="text" id="join-store-code" class="form-input" placeholder="例: OMK-7F2K9" required />
      </div>

      <div class="form-group">
        <label class="form-label">お名前</label>
        <input type="text" id="join-name" class="form-input" placeholder="佐藤 花子" required />
      </div>

      <div class="form-group">
        <label class="form-label">生年月日</label>
        <input type="date" id="join-dob" class="form-input" value="2000-01-01" required />
      </div>

      <div class="form-group">
        <label class="form-label">メールアドレス</label>
        <input type="email" id="join-email" class="form-input" placeholder="name@example.com" required />
      </div>

      <div class="form-group">
        <label class="form-label">パスワード</label>
        <input type="password" id="join-password" class="form-input" minlength="8" required />
      </div>

      <div style="display:flex; justify-content:flex-end; gap:var(--space-2); margin-top:var(--space-2);">
        <button type="button" class="btn btn-secondary close-sheet-btn">キャンセル</button>
        <button type="submit" class="btn btn-primary">店舗に参加</button>
      </div>
    </form>
  `;

  createBottomSheet({
    title: '',
    contentHTML,
    onOpen: (body) => {
      body.querySelector('#staff-join-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = body.querySelector('#join-store-code').value.trim().toUpperCase();
        const name = body.querySelector('#join-name').value;
        const email = body.querySelector('#join-email').value;

        const currentStore = stateManager.state.store;
        if (code !== currentStore.store_code && code !== 'OMK-7F2K9') {
          showToast('店舗コードが無効です。管理者にご確認ください。');
          return;
        }

        const newMemberId = `m-${generateUUID().substring(0, 8)}`;
        await stateManager.saveMember({
          id: newMemberId,
          name,
          email,
          role: 'staff',
          color: '#3b82f6',
          min_monthly_hours: 40,
          max_monthly_hours: 80,
          min_shift_hours: 3,
          pay_type: 'hourly',
          hourly_rate: 1100,
          status: 'active',
          notes: ''
        });

        closeBottomSheet();
        stateManager.setCurrentMember(newMemberId);
        stateManager.setRole('staff');
        stateManager.setCurrentView('workspace');
        showToast(`${currentStore ? currentStore.name : '店舗'} に参加しました`);
      });
    }
  });
}
