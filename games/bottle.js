// 🌀 병 돌리기: 가운데 병이 빙글빙글 돌다가 한 사람을 가리키며 멈춤
(function () {
  const SPIN_MS = 6500;

  // 참가자 번호를 원 위에 배치하고 가운데에 병
  function wheel(seats, ctx, size) {
    const n = seats.length;
    const r = 42; // %
    const marks = seats.map((p, i) => {
      const a = (i / n) * 2 * Math.PI - Math.PI / 2;
      const x = 50 + r * Math.cos(a), y = 50 + r * Math.sin(a);
      return `<div class="bseat" data-id="${p.id}" style="left:${x}%;top:${y}%;--c:${p.color}">${p.num}${ctx.isMe(p.id) ? '<small>나</small>' : ''}</div>`;
    }).join('');
    return `<div class="bwheel" style="--size:${size}">
      <div class="btable"></div>${marks}
      <div class="bottle"><svg viewBox="0 0 60 200" width="100%" height="100%">
        <defs><linearGradient id="gl" x1="0" x2="1"><stop offset="0" stop-color="#1f7a3a"/><stop offset=".45" stop-color="#3fbf63"/><stop offset="1" stop-color="#145a28"/></linearGradient></defs>
        <rect x="23" y="2" width="14" height="14" rx="3" fill="#ffd34d"/>
        <path d="M24 14 h12 v40 q0 14 14 26 q6 6 6 18 v86 q0 12 -12 12 h-28 q-12 0 -12 -12 v-86 q0 -12 6 -18 q14 -12 14 -26z" fill="url(#gl)" stroke="#0c3b18" stroke-width="2"/>
        <rect x="10" y="110" width="40" height="40" rx="4" fill="#fff5d6"/><text x="30" y="136" font-size="15" text-anchor="middle" font-weight="900" fill="#1f7a3a">벌칙</text>
        <rect x="16" y="96" width="5" height="70" rx="2" fill="#fff" opacity=".25"/>
      </svg></div></div>`;
  }

  function angleFor(gs, id) { const i = gs.seats.indexOf(id), n = gs.seats.length; return (i / n) * 360; }

  // 회전 반영 (새 회전이면 애니메이션)
  function applySpin(el, ctx) {
    const gs = ctx.gs, b = el.querySelector('.bottle'); if (!b) return;
    if (!gs.spin) { b.style.transition = 'none'; b.style.transform = `translate(-50%,-50%) rotate(${gs.rot || 0}deg)`; return; }
    if (el._spin === gs.spin.n) return;
    el._spin = gs.spin.n;
    el.querySelectorAll('.bseat').forEach(s => s.classList.remove('hit'));
    if (gs.phase === 'spinning') {
      b.style.transition = 'none'; b.style.transform = `translate(-50%,-50%) rotate(${gs.spin.from}deg)`;
      b.getBoundingClientRect();
      b.style.transition = `transform ${SPIN_MS}ms cubic-bezier(.12,.6,.12,1)`;
      b.style.transform = `translate(-50%,-50%) rotate(${gs.spin.to}deg)`;
      tickSound(SPIN_MS);
    } else { b.style.transition = 'none'; b.style.transform = `translate(-50%,-50%) rotate(${gs.spin.to}deg)`; }
  }
  function tickSound(ms) {
    // 처음엔 빠르게, 점점 느리게 딸깍딸깍
    let t = 0, gap = 60;
    const go = () => { if (t > ms - 150) return; SFX.tick(); t += gap; gap = Math.min(600, gap * 1.09); setTimeout(go, gap); };
    go();
  }
  function markHit(el, gs) { el.querySelectorAll('.bseat').forEach(s => s.classList.toggle('hit', gs.phase === 'done' && s.dataset.id === gs.target)); }

  defineGame({
    id: 'bottle', name: '병 돌리기', emoji: '🌀', min: 2,
    desc: '병이 빙글빙글~ 멈춰서 가리킨 사람이 당첨',
    init: () => ({ phase: 'ready', rot: 0, spin: null, target: null }),
    controls(H) { return [{ label: '🌀 병 돌리기!', primary: true, disabled: H.gs.phase === 'spinning', onClick: () => spin(H) }]; },
    hostView(H, el) {
      if (!el.querySelector('.bwheel')) el.innerHTML = `<div class="big-msg bmsg"></div>${wheel(H.seats(), H, 'min(78vh, 620px)')}`;
      const gs = H.gs;
      el.querySelector('.bmsg').textContent = gs.phase === 'ready' ? '병 돌리기! 를 누르세요' : gs.phase === 'spinning' ? '빙글빙글…' : `${H.label(gs.target)} 당첨! 😱`;
      applySpin(el, H); markHit(el, gs);
    },
    playerView(P, el) {
      if (!el.querySelector('.bwheel')) el.innerHTML = wheel(P.gs.seats.map(id => ({ id, num: P.num(id), color: P.color(id) })), P, 'min(92vw, 70vh)');
      const gs = P.gs;
      P.status(gs.phase === 'ready' ? '호스트가 병을 돌리면 시작해요' : gs.phase === 'spinning' ? '빙글빙글… 제발 나만 아니길 🙏' : (P.isMe(gs.target) ? '병이 나를 가리켰어요!' : `${P.label(gs.target)} 당첨!`));
      applySpin(el, P); markHit(el, gs);
    },
    onEvent(ctx, m, el) {
      if (m.k !== 'result') return;
      const me = ctx.isMe(m.id);
      U.banner(me ? '당신이 당첨!' : `${ctx.label(m.id)} 당첨!`, me ? '병이 나를 가리켰어요 🌀' : '🌀 병이 가리킨 사람', me ? 'me' : 'other');
    }
  });

  function spin(H) {
    const gs = H.gs; if (gs.phase === 'spinning') return;
    U.hideBanner();
    const ids = gs.seats.filter(id => H.player(id));
    gs.seats = ids;
    const target = U.pick(ids), n = ids.length;
    const from = gs.rot || 0;
    const want = angleFor(gs, target) + (Math.random() - .5) * (360 / n) * 0.5;
    let to = from - (from % 360) + 360 * (5 + MB.randInt(3)) + want;
    if (to - from < 1800) to += 360;
    gs.spin = { n: (gs.spin ? gs.spin.n : 0) + 1, from, to };
    gs.rot = to % 360; gs.phase = 'spinning'; gs.target = null;
    H.update();
    H.after(SPIN_MS + 300, () => { gs.phase = 'done'; gs.target = target; gs.spin.from = gs.spin.to; H.update(); H.ev({ k: 'result', id: target }); });
  }
})();
