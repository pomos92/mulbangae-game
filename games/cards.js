// 🃏 숫자 카드 높낮이: 1~10 카드를 한 장(또는 두 장)씩 뒤집어서 나눠 주고, 호스트가 "낮은 수 / 높은 수" 중 걸릴 쪽을 정한 뒤 확인!
// 2장 모드에서는 두 장의 합으로 비교해요.
(function () {
  const SUITS = ['♠', '♥', '♦', '♣'];
  const RULE = { low: '가장 낮은 수가 걸려요 ⬇️', high: '가장 높은 수가 걸려요 ⬆️' };

  function deal(H, seats, count) {
    seats = seats || H.gs.seats; count = count || (H.gs && H.gs.count) || 1;
    const deck = [];
    for (let v = 1; v <= 10; v++) SUITS.forEach(s => deck.push({ v, s }));
    let d = U.shuffle(deck);
    while (d.length < seats.length * count) d = d.concat(U.shuffle(deck));
    const cards = {};
    seats.forEach((id, i) => { cards[id] = []; for (let k = 0; k < count; k++) cards[id].push(d[i * count + k]); });
    H.secret = { cards };
  }
  const sum = cs => [].concat(cs).reduce((a, c) => a + c.v, 0);
  const lbl = v => v === 1 ? 'A' : v;
  const cardsHTML = (cs, o) => `<div class="chand">${[].concat(cs).map(c => U.card(c.v, c.s, o)).join('')}</div>`;
  const backs = (n, o) => `<div class="chand">${Array(n).fill(U.card(1, '♠', Object.assign({ back: true }, o))).join('')}</div>`;
  function redeal(H, count) {
    const gs = H.gs; U.hideBanner();
    if (count) gs.count = count;
    deal(H, null, gs.count);
    Object.assign(gs, { phase: 'dealt', rule: null, cards: null, losers: [], d: gs.d + 1 }); H.update();
  }

  defineGame({
    id: 'cards', name: '숫자 카드 높낮이', emoji: '🃏', min: 2,
    desc: '1~10 카드 한 장(또는 두 장 합)! 낮은 수 / 높은 수 정하고 확인하면 걸린 사람 당첨',
    init(H, seats) { deal(H, seats, 1); return { phase: 'dealt', rule: null, cards: null, losers: [], d: 1, count: 1 }; },
    onRestore(H) { if (!H.gs.count) H.gs.count = 1; if (!H.secret || !Array.isArray(Object.values(H.secret.cards || {})[0])) deal(H); },
    controls(H) {
      const gs = H.gs;
      const n = gs.count || 1;
      return [
        { label: (n === 1 ? '✅ ' : '') + '🃏 1장', disabled: n === 1, onClick: () => redeal(H, 1) },
        { label: (n === 2 ? '✅ ' : '') + '🃏🃏 2장 (합계)', disabled: n === 2, onClick: () => redeal(H, 2) },
        { label: (gs.rule === 'low' ? '✅ ' : '') + '⬇️ 낮은 수 걸림', disabled: gs.phase !== 'dealt', onClick: () => { gs.rule = 'low'; H.update(); } },
        { label: (gs.rule === 'high' ? '✅ ' : '') + '⬆️ 높은 수 걸림', disabled: gs.phase !== 'dealt', onClick: () => { gs.rule = 'high'; H.update(); } },
        { label: '🔍 확인!', primary: true, disabled: gs.phase !== 'dealt' || !gs.rule, onClick: () => reveal(H) },
        { label: '🔄 다시 나눠주기', onClick: () => redeal(H) }
      ];
    },
    hostView(H, el) {
      const gs = H.gs;
      if (el._d !== gs.d) {
        el._d = gs.d;
        el.innerHTML = `<div class="big-msg cmsg"></div><div class="cgrid">${H.seats().map((p, i) => `
          <div class="cseat" data-id="${p.id}" style="--c:${p.color};animation-delay:${i * 0.12}s">${backs(gs.count || 1)}<span class="tag" style="--c:${p.color}">${H.label(p.id)}</span></div>`).join('')}</div>`;
        SFX.whoosh();
      }
      const two = (gs.count || 1) === 2 ? ' (두 장 합계)' : '';
      el.querySelector('.cmsg').textContent = gs.phase === 'revealed' ? `${gs.losers.map(H.label).join(', ')} 당첨! 🍺` : gs.rule ? RULE[gs.rule] + two + ' — 확인을 누르세요' : `사람들에게 물어보세요: 낮은 수? 높은 수?${two}`;
      if (gs.phase === 'revealed') showCards(el, gs);
    },
    playerView(P, el) {
      const gs = P.gs;
      if (el._d !== gs.d) {
        if (el._d) U.hideBanner();  // 다시 나눠주면 지난 판 결과 창 닫기
        el._d = gs.d;
        el.innerHTML = `<div class="big-msg crule"></div><div class="cmine">${backs(gs.count || 1, { big: true })}</div><div class="hint chint"></div>`;
      }
      const two = (gs.count || 1) === 2 ? ' (두 장 합계)' : '';
      el.querySelector('.crule').textContent = (gs.rule ? RULE[gs.rule] : '낮은 수? 높은 수? 호스트가 정해요') + two;
      if (gs.phase === 'revealed' && gs.cards) {
        const c = gs.cards[P.me.pid], lose = gs.losers.includes(P.me.pid);
        const box = el.querySelector('.cmine');
        if (!box.dataset.v) { box.innerHTML = cardsHTML(c, { back: true, big: true, cls: lose ? 'lose' : '' }); box.dataset.v = 1; setTimeout(() => box.querySelectorAll('.pcard').forEach(x => x.classList.remove('back')), 50); }
        const cs = [].concat(c);
        el.querySelector('.chint').textContent = cs.length > 1 ? `내 카드: ${cs.map(x => lbl(x.v)).join(' + ')} = ${sum(cs)}` : `내 카드: ${cs[0].v === 1 ? 'A(1)' : cs[0].v}`;
        P.status(lose ? '내가 걸렸어요! 🍺' : '살았다! 😆');
      } else { P.status('카드를 받았어요. 확인 전까지는 뒤집혀 있어요'); el.querySelector('.chint').textContent = '🤫 확인을 누르면 모두 함께 뒤집혀요'; }
    },
    onEvent(ctx, m) {
      if (m.k !== 'reveal') return;
      setTimeout(() => {
        const me = m.losers.includes(ctx.isHost ? ctx.hostPid() : ctx.me.pid);
        U.banner(me ? '당신이 당첨!' : `${m.losers.map(ctx.label).join(', ')} 당첨!`, `${m.rule === 'low' ? '가장 낮은' : '가장 높은'} ${m.count === 2 ? '합' : '수'}: ${m.count === 2 ? m.val : lbl(m.val)}`, me ? 'me' : 'other');
      }, 1600);
    }
  });

  function showCards(el, gs) {
    el.querySelectorAll('.cseat').forEach((s, i) => {
      if (s.dataset.v) return;
      const c = gs.cards[s.dataset.id]; if (!c) return;
      s.dataset.v = 1;
      const lose = gs.losers.includes(s.dataset.id);
      s.querySelector('.chand').outerHTML = cardsHTML(c, { back: true, cls: lose ? 'lose' : '' });
      if ([].concat(c).length > 1) s.querySelector('.tag').insertAdjacentHTML('beforebegin', `<b class="csum">합 ${sum(c)}</b>`);
      setTimeout(() => { s.querySelectorAll('.pcard').forEach(x => x.classList.remove('back')); SFX.tick(); }, 100 + i * 120);
      if (lose) s.classList.add('lose');
    });
  }

  function reveal(H) {
    const gs = H.gs; if (!gs.rule || !H.secret) return;
    const cards = H.secret.cards;
    const vals = gs.seats.filter(id => cards[id]).map(id => sum(cards[id]));
    const target = gs.rule === 'low' ? Math.min(...vals) : Math.max(...vals);
    gs.cards = cards; gs.losers = gs.seats.filter(id => cards[id] && sum(cards[id]) === target);
    gs.phase = 'revealed';
    H.update();
    H.ev({ k: 'reveal', losers: gs.losers, rule: gs.rule, val: target, count: gs.count || 1 });
  }
})();
