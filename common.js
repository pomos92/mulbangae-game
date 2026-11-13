// 공통: 게임 등록, 색, 도우미 함수, 결과 배너
window.GAMES = {};
window.GAME_ORDER = [];
function defineGame(def) { GAMES[def.id] = def; GAME_ORDER.push(def.id); }

const COLORS = ['#3BA7E0', '#F2994A', '#6FCF97', '#EB5757', '#BB6BD9', '#F2C94C', '#56CCF2', '#FF8FB1',
  '#2D9CDB', '#27AE60', '#9B51E0', '#F06292', '#4DB6AC', '#FFB74D', '#7986CB', '#A1887F'];

const U = {
  esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); },
  shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = MB.randInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; },
  pick(a) { return a[MB.randInt(a.length)]; },
  resetEl(el) { el.innerHTML = ''; Object.keys(el).forEach(k => { if (k[0] === '_') delete el[k]; }); },
  buzz(p) { try { navigator.vibrate && navigator.vibrate(p); } catch (_) { } },
  el(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; },
  confetti() {
    const cs = ['#ffd34d', '#ff6b6b', '#6be38f', '#56ccf2', '#bb6bd9', '#fff'];
    for (let i = 0; i < 90; i++) {
      const d = document.createElement('div'); d.className = 'confetti';
      d.style.left = Math.random() * 100 + 'vw'; d.style.background = cs[i % cs.length];
      d.style.animationDuration = 2 + Math.random() * 2.5 + 's'; d.style.animationDelay = Math.random() * 1.2 + 's';
      document.body.appendChild(d); setTimeout(() => d.remove(), 6000);
    }
  },
  // 결과 배너. kind: 'me'(내가 당첨) | 'other' | 'info'
  banner(title, sub, kind, buttons) {
    let b = document.getElementById('banner');
    if (!b) { b = U.el('<div id="banner"><div class="bbox"><h2></h2><p></p><div class="brow"></div></div></div>'); document.body.appendChild(b); }
    b.className = kind || 'info';
    b.querySelector('h2').textContent = title;
    b.querySelector('p').textContent = sub || '';
    const row = b.querySelector('.brow'); row.innerHTML = '';
    (buttons || [{ label: '닫기' }]).forEach(x => {
      const btn = U.el(`<button class="${x.primary ? 'btn-main' : 'btn-sub'}">${U.esc(x.label)}</button>`);
      btn.onclick = () => { U.hideBanner(); x.onClick && x.onClick(); };
      row.appendChild(btn);
    });
    b.style.display = 'flex';
    if (kind === 'me') { U.confetti(); U.buzz([200, 100, 200, 100, 400]); SFX.fanfare(); setTimeout(() => SFX.speak('당신이 당첨!'), 900); }
    else if (kind === 'other') SFX.fail();
  },
  hideBanner() { const b = document.getElementById('banner'); if (b) b.style.display = 'none'; },
  // 트럼프 카드 그림
  card(v, suit, opts) {
    opts = opts || {};
    const red = suit === '♥' || suit === '♦';
    const label = v === 1 ? 'A' : v;
    return `<div class="pcard ${opts.back ? 'back' : ''} ${opts.big ? 'big' : ''} ${red ? 'red' : ''} ${opts.cls || ''}">
      <div class="face"><span class="c tl">${label}<br>${suit}</span><span class="mid">${suit}</span><span class="c br">${label}<br>${suit}</span></div>
      <div class="bk"></div></div>`;
  }
};
