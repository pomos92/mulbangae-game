// 🪲 물방개 게임: 물방개가 모든 통을 한 번씩 돌고, 멈춘 척하다가 한 통에 쏙 들어가면 그 사람이 당첨
(function () {
  const FAKE_MS = 3000, FINAL_MS = 3600;

  function buildPath(ids) {
    const win = U.pick(ids);
    const hops = U.shuffle(ids).map(id => ({ id, kind: 'pass' }));
    if (ids.length === 1) return { hops: [{ id: win, kind: 'final', dur: FINAL_MS }], win };
    const last = () => hops[hops.length - 1].id;
    const other = not => { let x; do { x = U.pick(ids); } while (x === not); return x; };
    const extra = Math.min(2 + MB.randInt(4), 1 + ids.length * 2);
    for (let k = 0; k < extra; k++) hops.push({ id: other(last()), kind: 'pass' });
    const fakes = 1 + MB.randInt(2);
    for (let f = 0; f < fakes; f++) {
      hops.push({ id: other(last()), kind: 'fake' });
      const after = 1 + MB.randInt(2);
      for (let k = 0; k < after; k++) hops.push({ id: other(last()), kind: 'dash' });
    }
    if (last() === win) hops.push({ id: other(win), kind: 'pass' });
    hops.push({ id: win, kind: 'final' });
    const n = hops.length;
    hops.forEach((h, i) => {
      const e = n - 1 - i;
      h.dur = h.kind === 'final' ? FINAL_MS : h.kind === 'fake' ? FAKE_MS : h.kind === 'dash' ? 520
        : e <= 2 ? [0, 1300, 1000][e] : Math.max(450, 1300 - i * 120);
    });
    return { hops, win };
  }

  // ── 휴대폰: 큰 물통 하나 ──
  function tubDom(el, ctx) {
    let t = el.querySelector('.btub');
    if (!t) {
      el.innerHTML = `<div class="btub water" style="--tub:${ctx.color(ctx.me.pid)}"><div class="glow"></div><div class="num">${ctx.me.num}<small>번 통</small></div><div class="cnt"></div><div class="bt"></div></div>`;
      t = el.querySelector('.btub');
      t.querySelector('.bt').innerHTML = beetleSVG(Math.min(innerWidth, innerHeight) * 0.26);
    }
    return t;
  }
  function tf(x, y, a, s) { return `translate(${x}px, ${y}px) rotate(${a}deg) scale(${s || 1})`; }
  function ang(x1, y1, x2, y2) { return Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI + 90; }
  function geo(t) { const b = t.querySelector('.bt'); return { w: t.clientWidth, h: t.clientHeight, bw: b.offsetWidth, bh: b.offsetHeight, b }; }
  function edge(th, g) { const R = Math.hypot(g.w, g.h) / 2 + Math.max(g.bw, g.bh); return [g.w / 2 + Math.cos(th) * R - g.bw / 2, g.h / 2 + Math.sin(th) * R - g.bh / 2]; }

  function cross(t, dur) {
    const g = geo(t), b = g.b; b.style.display = 'block';
    const th = Math.random() * Math.PI * 2;
    const [x1, y1] = edge(th, g), [x3, y3] = edge(th + Math.PI + (Math.random() - .5) * 1.2, g);
    const mx = g.w / 2 - g.bw / 2 + (Math.random() - .5) * g.w * .35, my = g.h / 2 - g.bh / 2 + (Math.random() - .5) * g.h * .35;
    const a1 = ang(x1, y1, mx, my), a2 = ang(mx, my, x3, y3);
    if (t._anim) t._anim.cancel();
    b.classList.add('swim'); t.classList.add('here'); U.buzz(60);
    t._anim = b.animate([{ transform: tf(x1, y1, a1) }, { transform: tf(mx, my, (a1 + a2) / 2), offset: .5 }, { transform: tf(x3, y3, a2) }],
      { duration: Math.max(300, dur - 80), easing: 'ease-in-out', fill: 'forwards' });
    t._anim.onfinish = () => { t.classList.remove('here'); b.style.display = 'none'; };
  }
  function settle(t, dur, fake) {
    const g = geo(t), b = g.b; b.style.display = 'block';
    const [x1, y1] = edge(Math.random() * Math.PI * 2, g);
    const cx = g.w / 2 - g.bw / 2, cy = g.h / 2 - g.bh / 2 - g.h * .06;
    const a = ang(x1, y1, cx, cy), at = ms => Math.min(1, ms / dur);
    if (t._anim) t._anim.cancel();
    b.classList.add('swim'); t.classList.add('here'); U.buzz([80, 60, 80]);
    const fr = [
      { transform: tf(x1, y1, a), offset: 0 },
      { transform: tf(cx + g.w * .1, cy - g.h * .04, a + 25), offset: at(600), easing: 'ease-out' },
      { transform: tf(cx, cy, 0, 1.15), offset: at(1000) }, { transform: tf(cx, cy, -6, 1.18), offset: at(1500) },
      { transform: tf(cx, cy, 6, 1.18), offset: at(2000) }, { transform: tf(cx, cy, 0, 1.18), offset: at(2400) }];
    if (fake) {
      const [x3, y3] = edge(Math.random() * Math.PI * 2, g);
      fr.push({ transform: tf(cx, cy, ang(cx, cy, x3, y3) - 20, 1.1), offset: at(2550), easing: 'ease-in' });
      fr.push({ transform: tf(x3, y3, ang(cx, cy, x3, y3)), offset: 1 });
    } else {
      fr.push({ transform: tf(cx + g.w * .05, cy, 25, 1.1), offset: at(2600) });
      fr.push({ transform: tf(cx - g.w * .05, cy, -25, 1.1), offset: at(2800) });
      fr.push({ transform: tf(cx, cy, 0, 1.3), offset: 1 });
    }
    t._anim = b.animate(fr, { duration: dur, fill: 'forwards' });
    setTimeout(() => b.classList.remove('swim'), 1000); setTimeout(() => b.classList.add('swim'), 2400);
    if (fake) t._anim.onfinish = () => { t.classList.remove('here', 'sit'); b.style.display = 'none'; };
  }
  function hideBeetle(t) { if (t._anim) t._anim.cancel(); const b = t.querySelector('.bt'); b.style.display = 'none'; b.classList.remove('swim'); t.classList.remove('here', 'sit'); }

  function countdown(el, n, done, sfx) {
    sfx = sfx || SFX;
    let c = el.querySelector('.bcount');
    if (!c) { c = U.el('<div class="bcount"></div>'); (el.querySelector('.btub') || el).appendChild(c); }
    c.style.display = 'flex';
    const tick = () => { if (n <= 0) { c.style.display = 'none'; done && done(); return; } sfx.tick(); c.textContent = n--; setTimeout(tick, 1000); };
    tick();
  }

  const QUIET = new Proxy({}, { get: () => () => { } });
  const holds = new WeakMap();
  function clearHolds(el) { (holds.get(el) || []).forEach(clearTimeout); holds.set(el, []); }
  function hold(el, ms, fn) { const a = holds.get(el) || []; a.push(setTimeout(fn, ms)); holds.set(el, a); }

  defineGame({
    id: 'beetle', name: '물방개 게임', emoji: '🪲', min: 1, seatPanel: true,
    desc: '물방개가 모든 폰을 돌아다니다 한 통에 쏙! 그 사람이 당첨',
    init: () => ({ phase: 'ready', winner: null, n: 0 }),
    controls(H) {
      const gs = H.gs;
      return [{ label: gs.phase === 'done' ? '🪲 한 판 더' : '🪲 물방개 출발!', primary: true, disabled: gs.phase === 'running', onClick: () => start(H) }];
    },
    hostView(H, el) {
      const gs = H.gs;
      let grid = el.querySelector('.bgrid');
      if (!grid) {
        el.innerHTML = '<div class="big-msg bmsg"></div><div class="bgrid"></div>';
        grid = el.querySelector('.bgrid');
        grid.innerHTML = H.seats().map(p => `<div class="btile water" data-id="${p.id}" style="--c:${p.color}"><span class="n">${p.num}</span>${H.isMe(p.id) ? '<span class="me">나</span>' : ''}<div class="bb">${beetleSVG(72)}</div></div>`).join('');
      }
      el.querySelector('.bmsg').textContent = gs.phase === 'ready' ? '물방개 출발! 을 누르세요' : gs.phase === 'running' ? (el._msg || '물방개가 돌아다니는 중…') : `${H.label(gs.winner)} 당첨!`;
      grid.querySelectorAll('.btile').forEach(t => {
        t.classList.toggle('win', gs.phase === 'done' && t.dataset.id === gs.winner);
        t.classList.toggle('lose', gs.phase === 'done' && t.dataset.id !== gs.winner);
        if (gs.phase !== 'running') t.classList.remove('here', 'sit');
      });
    },
    playerView(P, el) {
      const t = tubDom(el, P), gs = P.gs;
      if (gs.phase === 'ready') { P.status('물방개를 기다리는 중 🪲'); hideBeetle(t); }
      else if (gs.phase === 'running') { if (!el._st) P.status('물방개가 통들을 돌아다니는 중…'); }
      else if (gs.phase === 'done' && el._shown !== gs.n) { el._shown = gs.n; P.status(P.isMe(gs.winner) ? '당첨됐어요!' : '다음 판을 기다려요'); }
    },
    onEvent(ctx, m, el, isSeat) {
      const host = ctx.isHost;
      // 호스트 화면의 '내 자리' 큰 통: 소리는 호스트 화면 쪽에서 이미 나니까 여기선 조용히
      const SFX = isSeat ? QUIET : window.SFX;
      if (m.k === 'countdown') {
        clearHolds(el);
        if (host) { el._msg = ''; countdown(el.querySelector('.bgrid') ? el : el, 3, () => SFX.startMusic()); }
        else { const t = tubDom(el, ctx); hideBeetle(t); countdown(el, 3, () => SFX.startMusic(), SFX); }
      } else if (m.k === 'hop') {
        clearHolds(el);
        const mine = !host && ctx.isMe(m.id), where = ctx.label(m.id);
        SFX.setIntensity(m.idx / Math.max(1, m.total - 1));
        if (host) {
          el.querySelectorAll('.btile.here').forEach(e => e.classList.remove('here', 'sit'));
          const tile = el.querySelector(`.btile[data-id="${m.id}"]`);
          if (tile) { tile.classList.add('here'); tile.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
          SFX.splash(); if (ctx.isMe(m.id)) U.buzz(60);
          const msg = t => { el._msg = t; const e = el.querySelector('.bmsg'); if (e) e.textContent = t; };
          msg('물방개가 돌아다니는 중…');
          if (m.fake || m.final) {
            hold(el, 1000, () => { tile && tile.classList.add('sit'); SFX.hold(); msg(ctx.isMe(m.id) ? '어…? 내 통에 멈췄다?! 😳' : `${where} 통에 멈췄다…?!`); });
            if (m.fake) hold(el, 2400, () => { tile && tile.classList.remove('sit'); SFX.whoosh(); SFX.resume(); msg('앗, 다시 움직인다! 😱'); });
            else hold(el, 2400, () => SFX.drumroll(1.1));
          }
        } else {
          const t = tubDom(el, ctx);
          if (mine) { (m.final || m.fake) ? settle(t, m.dur, m.fake) : cross(t, m.dur); SFX.splash(); }
          else t.classList.remove('here', 'sit');
          ctx.status(`지금 ${where} 통에 있어요`);
          el._st = true;
          if (m.fake || m.final) {
            hold(el, 1000, () => { SFX.hold(); ctx.status(mine ? '어…? 내 통에 멈췄다?! 😳' : `${where} 통에 멈췄다…?!`); if (mine) { t.classList.add('sit'); SFX.heartbeat(2); U.buzz([60, 160, 60]); } });
            if (m.fake) hold(el, 2400, () => { SFX.resume(); SFX.whoosh(); t.classList.remove('sit'); ctx.status(mine ? '앗! 다시 나가 버렸다 😱' : '앗, 다시 움직인다!'); });
            else hold(el, 2400, () => SFX.drumroll(1.1));
          }
        }
      } else if (m.k === 'winner') {
        clearHolds(el); SFX.stopMusic(); el._st = false;
        const meWin = ctx.isMe(m.id);
        if (!host) { const t = tubDom(el, ctx); t.classList.remove('sit'); if (!meWin) hideBeetle(t); else t.querySelector('.bt').classList.remove('swim'); }
        if (host || !isSeat) setTimeout(() => U.banner(meWin ? '당신이 당첨!' : `${ctx.label(m.id)} 당첨!`, meWin ? '물방개가 내 통에 쏙 들어왔어요! 😱' : '🪲 물방개가 들어간 통이에요', meWin ? 'me' : 'other'), 300);
      }
    }
  });

  function start(H) {
    const gs = H.gs; if (gs.phase === 'running') return;
    H.clearTimers(); U.hideBanner();
    const { hops, win } = buildPath(gs.seats.filter(id => H.player(id)));
    gs.phase = 'running'; gs.winner = null; gs.n++;
    H.update();
    H.ev({ k: 'countdown' });
    let i = 0;
    const step = () => {
      if (i >= hops.length) { gs.phase = 'done'; gs.winner = win; H.ev({ k: 'winner', id: win }); H.update(); return; }
      const h = hops[i++];
      H.ev({ k: 'hop', id: h.id, dur: h.dur, idx: i - 1, total: hops.length, final: h.kind === 'final', fake: h.kind === 'fake' });
      H.after(h.dur, step);
    };
    H.after(3000, step);
  }
})();
