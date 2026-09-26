// UI helper utilities for bottom sheets, toasts, dialogs, and header events
import { copyToClipboard } from './utils.js';

export function showToast(message, duration = 2500) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 200ms ease';
    setTimeout(() => toast.remove(), 200);
  }, duration);
}

export function createBottomSheet({ title, contentHTML, onOpen }) {
  let backdrop = document.querySelector('.bottom-sheet-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'bottom-sheet-backdrop';
    backdrop.innerHTML = `<div class="bottom-sheet"><div class="sheet-handle"></div><div class="sheet-body"></div></div>`;
    document.body.appendChild(backdrop);

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeBottomSheet();
    });
  }

  const body = backdrop.querySelector('.sheet-body');
  body.innerHTML = `
    ${title ? `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 16px;"><h3 style="font-size: 1.1rem; font-weight:700;">${title}</h3><button class="btn btn-secondary btn-sm close-sheet-btn">✕</button></div>` : ''}
    ${contentHTML}
  `;

  const closeBtns = body.querySelectorAll('.close-sheet-btn');
  closeBtns.forEach(btn => btn.addEventListener('click', closeBottomSheet));

  requestAnimationFrame(() => backdrop.classList.add('open'));
  if (onOpen) onOpen(body);
}

export function closeBottomSheet() {
  const backdrop = document.querySelector('.bottom-sheet-backdrop');
  if (backdrop) {
    backdrop.classList.remove('open');
  }
}

export function setupHeaderEvents(stateManager) {
  const brandHomeLink = document.getElementById('brand-home-link');
  if (brandHomeLink) {
    brandHomeLink.addEventListener('click', (e) => {
      e.preventDefault();
      stateManager.setCurrentView('workspace');
    });
  }

  const storeBadge = document.getElementById('store-code-badge');
  if (storeBadge) {
    storeBadge.addEventListener('click', () => {
      const code = stateManager.state.store ? stateManager.state.store.store_code : 'OMK-7F2K9';
      copyToClipboard(code);
      showToast(`店舗コード ${code} をコピーしました`);
    });
  }

  const roleAdminBtn = document.getElementById('role-admin-btn');
  const roleStaffBtn = document.getElementById('role-staff-btn');

  if (roleAdminBtn && roleStaffBtn) {
    roleAdminBtn.addEventListener('click', () => stateManager.setRole('admin'));
    roleStaffBtn.addEventListener('click', () => stateManager.setRole('staff'));
  }

  const navSettingsBtn = document.getElementById('nav-settings-btn');
  if (navSettingsBtn) {
    navSettingsBtn.addEventListener('click', () => {
      stateManager.setCurrentView('settings');
    });
  }

  const navLogoutBtn = document.getElementById('nav-logout-btn');
  if (navLogoutBtn) {
    navLogoutBtn.addEventListener('click', () => {
      stateManager.setCurrentView('auth');
      showToast('ログアウトしました');
    });
  }

  const navLoginBtn = document.getElementById('nav-login-btn');
  if (navLoginBtn) {
    navLoginBtn.addEventListener('click', () => {
      stateManager.setCurrentView('auth');
    });
  }
}
