// Main application entry point
import '../styles.css';
import { stateManager } from './state.js';
import { setupHeaderEvents } from './ui.js';
import { renderStaffAvailabilityView, setupAvailabilityEvents } from './availability.js';
import { renderManagerWorkspaceView, setupTimelineEvents } from './timeline.js';
import { renderManagerSettingsView, setupSettingsEvents } from './settings.js';
import { renderAuthView, setupAuthEvents } from './auth.js';
import { getIconSVG } from './icons.js';

function renderAppHeader(state) {
  const saveLabel = state.saveStatus === 'saving' ? '保存中…' : '保存済み';
  const isStaff = state.role === 'staff';
  const isSettings = state.currentView === 'settings';

  return `
    <header class="app-header">
      <div class="brand-container">
        <a href="#" id="brand-home-link" title="omukun ホーム" style="display:flex; align-items:center;">
          <img src="/src/assets/brand/omukun-logo.svg" alt="omukun" class="brand-logo-mark" />
        </a>
      </div>

      <div class="header-meta">
        <span class="save-status">
          <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:${state.saveStatus === 'saving' ? 'var(--color-warning)' : 'var(--color-success)'}"></span>
          ${saveLabel}
        </span>

        ${!isStaff ? `
          <button id="store-code-badge" class="store-code-badge" title="店舗コードをコピー">
            ${getIconSVG('store', { size: 14 })}
            <strong>${state.store ? state.store.store_code : 'OMK-7F2K9'}</strong>
          </button>
        ` : ''}

        <div class="role-switcher">
          <button id="role-admin-btn" class="role-btn ${state.role === 'admin' ? 'active' : ''}">
            ${getIconSVG('settings', { size: 14 })} 管理者
          </button>
          <button id="role-staff-btn" class="role-btn ${state.role === 'staff' ? 'active' : ''}">
            ${getIconSVG('user', { size: 14 })} スタッフ
          </button>
        </div>

        ${state.role === 'admin' ? `
          <button id="nav-settings-btn" class="icon-btn ${isSettings ? 'active' : ''}" aria-label="設定" title="管理者設定">
            ${getIconSVG('settings', { size: 18 })}
          </button>
        ` : ''}

        ${state.currentUser ? `
          <button id="nav-logout-btn" class="icon-btn" aria-label="ログアウト" title="ログアウト">
            ${getIconSVG('logout', { size: 18 })}
          </button>
        ` : `
          <button id="nav-login-btn" class="btn btn-secondary btn-sm" aria-label="ログイン">
            ${getIconSVG('user', { size: 14 })} ログイン
          </button>
        `}
      </div>
    </header>
  `;
}

function renderMainContent(state) {
  if (state.currentView === 'auth') {
    return renderAuthView(state);
  }
  if (state.currentView === 'settings' && state.role === 'admin') {
    return renderManagerSettingsView(state);
  }
  if (state.role === 'staff') {
    return renderStaffAvailabilityView(state);
  }
  return renderManagerWorkspaceView(state);
}

function renderApp() {
  const appContainer = document.getElementById('app');
  if (!appContainer) return;

  const state = stateManager.state;

  appContainer.innerHTML = `
    ${renderAppHeader(state)}
    <main class="main-content">
      ${renderMainContent(state)}
    </main>
  `;

  // Attach event handlers
  setupHeaderEvents(stateManager);
  if (state.currentView === 'auth') {
    setupAuthEvents(stateManager);
  } else if (state.currentView === 'settings') {
    setupSettingsEvents(stateManager);
  } else if (state.role === 'staff') {
    setupAvailabilityEvents(stateManager);
  } else {
    setupTimelineEvents(stateManager);
  }
}

async function main() {
  stateManager.subscribe(() => {
    renderApp();
  });

  await stateManager.init();
}

main();
