// Store Invitation Management & Secure Invite Link Join Flow
import { getIconSVG } from './icons.js';
import { copyToClipboard, generateUUID } from './utils.js';
import { createBottomSheet, closeBottomSheet, showToast } from './ui.js';

export function renderInvitationsSection(state) {
  const store = state.store || { name: 'omukun 渋谷店', store_code: 'OMK-7F2K9' };
  const invitations = state.invitations || [];

  const activeInvs = invitations.filter(i => i.status === 'active' && new Date(i.expires_at) > new Date());
  const inactiveInvs = invitations.filter(i => i.status !== 'active' || new Date(i.expires_at) <= new Date());

  const activeRowsHTML = activeInvs.map(inv => {
    const expDate = new Date(inv.expires_at).toLocaleDateString('ja-JP');
    const inviteUrl = `${window.location.origin}/?invite=${inv.token}`;

    return `
      <div class="settings-row" data-inv-id="${inv.id}">
        <div style="display:flex; flex-direction:column; gap:2px;">
          <div style="display:flex; align-items:center; gap:var(--space-2);">
            <strong style="font-size:0.85rem;">スタッフ招待リンク</strong>
            <span class="btn btn-sm" style="background:var(--color-success-bg); color:var(--color-success); border:none; padding:1px 6px; font-size:0.65rem;">有効</span>
          </div>
          <span style="font-size:0.75rem; color:var(--color-text-muted);">有効期限: ${expDate}まで (${inv.use_count} / ${inv.max_uses}回使用)</span>
        </div>

        <div style="display:flex; align-items:center; gap:var(--space-2);">
          <button class="btn btn-secondary btn-sm copy-invite-link-btn" data-url="${inviteUrl}">
            ${getIconSVG('copy', { size: 12 })} リンクをコピー
          </button>
          <button class="btn btn-danger btn-sm revoke-invite-btn" data-inv-id="${inv.id}">
            無効にする
          </button>
        </div>
      </div>
    `;
  }).join('');

  const inactiveRowsHTML = inactiveInvs.map(inv => {
    return `
      <div class="settings-row" style="opacity:0.6;">
        <div style="display:flex; flex-direction:column; gap:2px;">
          <div style="display:flex; align-items:center; gap:var(--space-2);">
            <strong style="font-size:0.85rem;">過去の招待 (${inv.token.substring(0, 10)}...)</strong>
            <span class="btn btn-sm" style="background:var(--color-surface-hover); color:var(--color-text-muted); border:none; padding:1px 6px; font-size:0.65rem;">
              ${inv.status === 'revoked' ? '無効済み' : '期限切れ/使用済み'}
            </span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div style="display:flex; flex-direction:column; gap:var(--space-5);">
      <div>
        <h2 style="font-size:1.1rem; font-weight:800; border-bottom:1px solid var(--color-border); padding-bottom:var(--space-2);">招待管理</h2>
        <p style="font-size:0.8rem; color:var(--color-text-secondary); margin-top:4px;">スタッフを店舗へ安全に招待するためのコード・リンクの発行管理を行います。</p>
      </div>

      <!-- Persistent Store Code Card -->
      <div style="background:var(--color-surface-subtle); border:1px solid var(--color-border); padding:var(--space-4); border-radius:var(--radius-xs); display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:var(--space-3);">
        <div>
          <div style="font-size:0.75rem; font-weight:800; color:var(--color-text-muted);">店舗コード（固定）</div>
          <div style="font-size:1.4rem; font-weight:900; letter-spacing:0.05em; margin-top:2px;">${store.store_code}</div>
        </div>
        <button id="copy-store-code-btn" class="btn btn-secondary">
          ${getIconSVG('copy', { size: 14 })} 店舗コードをコピー
        </button>
      </div>

      <!-- Invite Link Generator -->
      <div class="settings-group">
        <div class="settings-row" style="background:var(--color-surface-subtle); border-bottom:1px solid var(--color-border);">
          <strong style="font-size:0.85rem;">アクティブな招待リンク</strong>
          <button id="create-invite-btn" class="btn btn-primary btn-sm">
            ${getIconSVG('add', { size: 14 })} 招待リンクを作成
          </button>
        </div>

        ${activeRowsHTML || `<div class="settings-row" style="color:var(--color-text-muted);">現在有効な招待リンクはありません</div>`}
      </div>

      ${inactiveInvs.length > 0 ? `
        <div class="settings-group">
          <div class="settings-row" style="background:var(--color-surface-subtle); border-bottom:1px solid var(--color-border);">
            <strong style="font-size:0.85rem;">失効・過去の招待</strong>
          </div>
          ${inactiveRowsHTML}
        </div>
      ` : ''}
    </div>
  `;
}

export function setupInvitationsEvents(stateManager) {
  const copyStoreCodeBtn = document.getElementById('copy-store-code-btn');
  if (copyStoreCodeBtn) {
    copyStoreCodeBtn.addEventListener('click', () => {
      const code = stateManager.state.store ? stateManager.state.store.store_code : 'OMK-7F2K9';
      copyToClipboard(code);
      showToast(`店舗コード ${code} をコピーしました`);
    });
  }

  const createInviteBtn = document.getElementById('create-invite-btn');
  if (createInviteBtn) {
    createInviteBtn.addEventListener('click', () => {
      openCreateInviteModal(stateManager);
    });
  }

  const copyLinkBtns = document.querySelectorAll('.copy-invite-link-btn');
  copyLinkBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const url = btn.getAttribute('data-url');
      copyToClipboard(url);
      showToast('招待リンクをクリップボードにコピーしました');
    });
  });

  const revokeBtns = document.querySelectorAll('.revoke-invite-btn');
  revokeBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      const invId = btn.getAttribute('data-inv-id');
      const inv = stateManager.state.invitations.find(i => i.id === invId);
      if (inv) {
        if (confirm('この招待リンクを無効化しますか？以降はこのリンクから参加できなくなります。')) {
          await stateManager.saveInvitation({
            ...inv,
            status: 'revoked'
          });
          showToast('招待リンクを無効化しました');
        }
      }
    });
  });
}

function openCreateInviteModal(stateManager) {
  const contentHTML = `
    <form id="create-invite-form" class="form-group" style="gap:var(--space-3);">
      <h3 style="font-size:1rem; font-weight:800; border-bottom:1px solid var(--color-border); padding-bottom:var(--space-2);">新しい招待リンクを作成</h3>

      <div class="form-group">
        <label class="form-label">有効期限</label>
        <select id="invite-expiry" class="form-select">
          <option value="7">7日間</option>
          <option value="14">14日間</option>
          <option value="30">30日間</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">最大利用回数</label>
        <input type="number" id="invite-max-uses" class="form-input" value="10" min="1" max="100" />
      </div>

      <div style="display:flex; justify-content:flex-end; gap:var(--space-2); margin-top:var(--space-2);">
        <button type="button" class="btn btn-secondary close-sheet-btn">キャンセル</button>
        <button type="submit" class="btn btn-primary">作成する</button>
      </div>
    </form>
  `;

  createBottomSheet({
    title: '',
    contentHTML,
    onOpen: (body) => {
      body.querySelector('#create-invite-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const days = parseInt(body.querySelector('#invite-expiry').value, 10);
        const maxUses = parseInt(body.querySelector('#invite-max-uses').value, 10) || 10;

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + days);

        const token = `INV-${generateUUID().substring(0, 10).toUpperCase()}`;

        await stateManager.saveInvitation({
          id: `inv-${generateUUID().substring(0, 8)}`,
          store_id: stateManager.state.store ? stateManager.state.store.id : 'store-1',
          token,
          role: 'staff',
          expires_at: expiresAt.toISOString(),
          max_uses: maxUses,
          use_count: 0,
          status: 'active',
          created_at: new Date().toISOString()
        });

        closeBottomSheet();
        showToast('新しい招待リンクを作成しました');
      });
    }
  });
}
