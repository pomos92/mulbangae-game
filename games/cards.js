// 🃏 숫자 카드 높낮이: 1~10 카드를 한 장씩 뒤집어서 나눠 주고, 호스트가 "낮은 수 / 높은 수" 중 걸릴 쪽을 정한 뒤 확인!
(function () {
  const SUITS = ['♠', '♥', '♦', '♣'];
  const RULE = { low: '가장 낮은 수가 걸려요 ⬇️', high: '가장 높은 수가 걸려요 ⬆️' };

  function deal(H, seats) {
    seats = seats || H.gs.seats;
    const deck = [];
    for (let v = 1; v <= 10; v++) SUITS.forEach(s => deck.push({ v, s }));
    const d = U.shuffle(deck);
    const cards = {};
    seats.forEach((id, i) => cards[id] = d[i % d.length]);
    H.secret = { cards };
  }

  defineGame({
    id: 'cards', name: '숫자 카드 높낮이', emoji: '🃏', min: 2,
    desc: '1~10 카드 한 장씩! 낮은 수 / 높은 수 정하고 확인하면 걸린 사람 당첨',
    init(H, seats) { deal(H, seats); return { phase: 'dealt', rule: null, cards: null, losers: [], d: 1 }; },
    onRestore(H) { if (!H.secret) deal(H); },
    controls(H) {
      const gs = H.gs;
      return [
        { label: (gs.rule === 'low' ? '✅ ' : '') + '⬇️ 낮은 수 걸림', disabled: gs.phase !== 'dealt', onClick: () => { gs.rule = 'low'; H.update(); } },
        { label: (gs.rule === 'high' ? '✅ ' : '') + '⬆️ 높은 수 걸림', disabled: gs.phase !== 'dealt', onClick: () => { gs.rule = 'high'; H.update(); } },
        { label: '🔍 확인!', primary: true, disabled: gs.phase !== 'dealt' || !gs.rule, onClick: () => reveal(H) },
        { label: '🔄 다시 나눠주기', onClick: () => { U.hideBanner(); deal(H); Object.assign(gs, { phase: 'dealt', rule: null, cards: null, losers: [], d: gs.d + 1 }); H.update(); } }
      ];
    },
    hostView(H, el) {
      const gs = H.gs;
      if (el._d !== gs.d) {
        el._d = gs.d;
        el.innerHTML = `<div class="big-msg cmsg"></div><div class="cgrid">${H.seats().map((p, i) => `
          <div class="cseat" data-id="${p.id}" style="--c:${p.color};animation-delay:${i * 0.12}s">${U.card(1, '♠', { back: true })}<span class="tag" style="--c:${p.color}">${H.label(p.id)}</span></div>`).join('')}</div>`;
        SFX.whoosh();
      }
      el.querySelector('.cmsg').textContent = gs.phase === 'revealed' ? `${gs.losers.map(H.label).join(', ')} 당첨! 🍺` : gs.rule ? RULE[gs.rule] + ' — 확인을 누르세요' : '사람들에게 물어보세요: 낮은 수? 높은 수?';
      if (gs.phase === 'revealed') showCards(el, gs);
    },
    playerView(P, el) {
      const gs = P.gs;
      if (el._d !== gs.d) {
        el._d = gs.d;
        el.innerHTML = `<div class="big-msg crule"></div><div class="cmine">${U.card(1, '♠', { back: true, big: true })}</div><div class="hint chint"></div>`;
      }
      el.querySelector('.crule').textContent = gs.rule ? RULE[gs.rule] : '낮은 수? 높은 수? 호스트가 정해요';
      if (gs.phase === 'revealed' && gs.cards) {
        const c = gs.cards[P.me.pid], lose = gs.losers.includes(P.me.pid);
        const box = el.querySelector('.cmine');
        if (!box.dataset.v) { box.innerHTML = U.card(c.v, c.s, { back: true, big: true, cls: lose ? 'lose' : '' }); box.dataset.v = 1; setTimeout(() => box.firstElementChild.classList.remove('back'), 50); }
        el.querySelector('.chint').textContent = `내 카드: ${c.v === 1 ? 'A(1)' : c.v}`;
        P.status(lose ? '내가 걸렸어요! 🍺' : '살았다! 😆');
      } else { P.status('카드를 받았어요. 확인 전까지는 뒤집혀 있어요'); el.querySelector('.chint').textContent = '🤫 확인을 누르면 모두 함께 뒤집혀요'; }
    },
    onEvent(ctx, m) {
      if (m.k !== 'reveal') return;
      setTimeout(() => {
        const me = m.losers.includes(ctx.isHost ? ctx.hostPid() : ctx.me.pid);
        U.banner(me ? '당신이 당첨!' : `${m.losers.map(ctx.label).join(', ')} 당첨!`, `${m.rule === 'low' ? '가장 낮은' : '가장 높은'} 수: ${m.val === 1 ? 'A' : m.val}`, me ? 'me' : 'other');
      }, 1600);
    }
  });

  function showCards(el, gs) {
    el.querySelectorAll('.cseat').forEach((s, i) => {
      if (s.dataset.v) return;
      const c = gs.cards[s.dataset.id]; if (!c) return;
      s.dataset.v = 1;
      const lose = gs.losers.includes(s.dataset.id);
      s.querySelector('.pcard').outerHTML = U.card(c.v, c.s, { back: true, cls: lose ? 'lose' : '' });
      setTimeout(() => { s.querySelector('.pcard').classList.remove('back'); SFX.tick(); }, 100 + i * 120);
      if (lose) s.classList.add('lose');
    });
  }

  function reveal(H) {
    const gs = H.gs; if (!gs.rule || !H.secret) return;
    const cards = H.secret.cards;
    const vals = gs.seats.filter(id => cards[id]).map(id => cards[id].v);
    const target = gs.rule === 'low' ? Math.min(...vals) : Math.max(...vals);
    gs.cards = cards; gs.losers = gs.seats.filter(id => cards[id] && cards[id].v === target);
    gs.phase = 'revealed';
    H.update();
    H.ev({ k: 'reveal', losers: gs.losers, rule: gs.rule, val: target });
  }
})();
