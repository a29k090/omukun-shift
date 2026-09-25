// Main application entry point
import '../styles.css';
import { stateManager } from './state.js';
import { setupHeaderEvents } from './ui.js';
import { renderStaffAvailabilityView, setupAvailabilityEvents } from './availability.js';
import { renderManagerWorkspaceView, setupTimelineEvents } from './timeline.js';

function renderAppHeader(state) {
  const saveLabel = state.saveStatus === 'saving' ? '保存中…' : '保存済み';
  const isStaff = state.role === 'staff';

  return `
    <header class="app-header">
      <div class="brand-container">
        <img src="/src/assets/brand/omukun-logo.svg" alt="omukun logo" class="brand-logo" />
        <span class="brand-title">omukun Shift</span>
      </div>

      <div class="header-meta">
        <span class="save-status">
          <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:${state.saveStatus === 'saving' ? 'var(--color-warning)' : 'var(--color-success)'}"></span>
          ${saveLabel}
        </span>

        ${!isStaff ? `
          <button id="store-code-badge" class="store-code-badge" title="店舗コードをコピー">
            <span>店舗:</span> <strong>${state.store ? state.store.store_code : 'OMK-7F2K9'}</strong>
          </button>
        ` : ''}

        <div class="role-switcher">
          <button id="role-admin-btn" class="role-btn ${state.role === 'admin' ? 'active' : ''}">管理者</button>
          <button id="role-staff-btn" class="role-btn ${state.role === 'staff' ? 'active' : ''}">スタッフ</button>
        </div>
      </div>
    </header>
  `;
}

function renderApp() {
  const appContainer = document.getElementById('app');
  if (!appContainer) return;

  const state = stateManager.state;

  appContainer.innerHTML = `
    ${renderAppHeader(state)}
    <main class="main-content">
      ${state.role === 'staff' ? renderStaffAvailabilityView(state) : renderManagerWorkspaceView(state)}
    </main>
  `;

  // Attach event handlers
  setupHeaderEvents(stateManager);
  if (state.role === 'staff') {
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
