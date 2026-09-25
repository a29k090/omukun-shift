// PNG Schedule Exporter helper
import { formatCurrency } from './utils.js';
import { showToast } from './ui.js';

export function exportSchedulePNG(state) {
  showToast('PNG画像を生成中…');

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '1200px';
  container.style.background = '#0f1012';
  container.style.color = '#f3f4f6';
  container.style.padding = '32px';
  container.style.fontFamily = 'HigureGothic, sans-serif';

  const [yearStr, monthStr] = state.currentMonthKey.split('-');

  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #333; padding-bottom:16px; margin-bottom:24px;">
      <div style="display:flex; align-items:center; gap:12px;">
        <img src="/src/assets/brand/omukun-logo.svg" style="height:36px;" />
        <h1 style="font-size:24px; font-weight:800;">omukun Shift - 確定シフト表</h1>
      </div>
      <div style="font-size:18px; font-weight:700; color:#ff6b35;">
        ${yearStr}年${parseInt(monthStr, 10)}月度
      </div>
    </div>

    <table style="width:100%; border-collapse:collapse; font-size:14px; text-align:left;">
      <thead>
        <tr style="background:#18191c; border-bottom:1px solid #444;">
          <th style="padding:10px; width:140px;">スタッフ名</th>
          <th style="padding:10px;">配置シフト概要</th>
        </tr>
      </thead>
      <tbody>
        ${state.members.map(m => {
          const asgs = state.assignments.filter(a => a.member_id === m.id);
          const asgSummary = asgs.map(a => `${a.date.split('-')[2]}日(${a.start_time}-${a.end_time})`).join(', ') || 'シフト配置なし';
          return `
            <tr style="border-bottom:1px solid #222;">
              <td style="padding:10px; font-weight:700;"><span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${m.color}; margin-right:6px;"></span>${m.name}</td>
              <td style="padding:10px; color:#ccc;">${asgSummary}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;

  document.body.appendChild(container);

  import('html2canvas').then(module => {
    const html2canvas = module.default;
    html2canvas(container, { backgroundColor: '#0f1012', scale: 2 }).then(canvas => {
      const link = document.createElement('a');
      link.download = `omukun-shift-${state.currentMonthKey}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      document.body.removeChild(container);
      showToast('シフト表PNG画像をダウンロードしました');
    }).catch(() => {
      document.body.removeChild(container);
      showToast('画像生成に失敗しました');
    });
  });
}
