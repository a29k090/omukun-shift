// PNG Schedule Exporter helper (Clean Monochrome Style)
import { showToast } from './ui.js';

export function exportSchedulePNG(state) {
  showToast('画像を書き出し中…');

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '1200px';
  container.style.background = '#ffffff';
  container.style.color = '#09090b';
  container.style.padding = '40px';
  container.style.fontFamily = 'HigureGothic, sans-serif';

  const [yearStr, monthStr] = state.currentMonthKey.split('-');

  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #18181b; padding-bottom:16px; margin-bottom:24px;">
      <div style="display:flex; align-items:center; gap:12px;">
        <img src="/src/assets/brand/omukun-logo.svg" style="height:32px;" />
        <h1 style="font-size:22px; font-weight:800; letter-spacing:-0.02em;">omukun Shift - 確定シフト表</h1>
      </div>
      <div style="font-size:18px; font-weight:800; color:#18181b;">
        ${yearStr}年${parseInt(monthStr, 10)}月度
      </div>
    </div>

    <table style="width:100%; border-collapse:collapse; font-size:13px; text-align:left;">
      <thead>
        <tr style="background:#f4f4f5; border-bottom:2px solid #e4e4e7;">
          <th style="padding:10px 12px; width:160px; font-weight:800;">スタッフ名</th>
          <th style="padding:10px 12px; font-weight:800;">配置シフト概要</th>
        </tr>
      </thead>
      <tbody>
        ${state.members.map(m => {
          const asgs = state.assignments.filter(a => a.member_id === m.id);
          const asgSummary = asgs.map(a => `${a.date.split('-')[2]}日(${a.start_time}–${a.end_time})`).join(', ') || 'シフト配置なし';
          return `
            <tr style="border-bottom:1px solid #e4e4e7;">
              <td style="padding:10px 12px; font-weight:700;"><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${m.color}; margin-right:8px;"></span>${m.name}</td>
              <td style="padding:10px 12px; color:#3f3f46; font-weight:500;">${asgSummary}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;

  document.body.appendChild(container);

  import('html2canvas').then(module => {
    const html2canvas = module.default;
    html2canvas(container, { backgroundColor: '#ffffff', scale: 2 }).then(canvas => {
      const link = document.createElement('a');
      link.download = `omukun-shift-${state.currentMonthKey}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      document.body.removeChild(container);
      showToast('シフト表画像をダウンロードしました');
    }).catch(() => {
      document.body.removeChild(container);
      showToast('画像生成に失敗しました');
    });
  });
}
