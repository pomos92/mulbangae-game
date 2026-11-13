// 🐊 악어 이빨 · 🏴‍☠️ 해적 칼: 순서대로 하나씩 고르다가 숨은 함정을 고른 사람이 당첨
(function () {
  function makeTrapGame(o) {
    function newRound(H, seats) {
      seats = seats || H.gs.seats;
      const slots = o.slots(seats.length);
      H.secret = { trap: MB.randInt(slots) };
      return { phase: 'play', slots, used: {}, turn: 0, loser: null, hit: null, n: ((H.gs && H.gs.n) || 0) + 1 };
    }
    function curPid(gs) { return gs.seats[gs.turn % gs.seats.length]; }

    function view(ctx, el, interactive) {
      const gs = ctx.gs;
      if (el._n !== gs.n) { el._n = gs.n; el.innerHTML = `<div class="big-msg tmsg"></div>${o.board(gs.slots)}<div class="seatgrid tseats"></div>`; bind(ctx, el); }
      const cur = curPid(gs);
      el.querySelectorAll('[data-i]').forEach(b => {
        const i = +b.dataset.i, by = gs.used[i];
        b.classList.toggle('used', by !== undefined);
        b.classList.toggle('boom', gs.hit === i);
        if (by !== undefined) b.style.setProperty('--c', ctx.color(by));
        b.disabled = !(interactive && gs.phase === 'play' && ctx.isMe(cur) && by === undefined);
      });
      el.querySelector('.tboard').classList.toggle('myturn', interactive && gs.phase === 'play' && ctx.isMe(cur));
      el.querySelector('.tboard').classList.toggle('snap', gs.phase === 'done');
      const msg = gs.phase === 'done' ? `${o.boomWord} ${ctx.label(gs.loser)} 당첨!` : ctx.isMe(cur) ? `내 차례! ${o.pickWord}` : `${ctx.label(cur)} 차례…`;
      el.querySelector('.tmsg').textContent = msg;
      if (ctx.status) ctx.status(gs.phase === 'done' ? '' : ctx.isMe(cur) ? '👉 내 차례예요!' : `${ctx.label(cur)}이(가) 고르는 중`);
      el.querySelector('.tseats').innerHTML = gs.seats.map(id => `<div class="seat ${gs.phase === 'play' && id === cur ? 'turn' : ''} ${gs.loser === id ? 'lose' : ''}" style="--c:${ctx.color(id)}">${ctx.label(id)}</div>`).join('');
    }
    function bind(ctx, el) {
      el.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { if (b.disabled) return; SFX.tick(); b.disabled = true; ctx.act({ k: 'pick', i: +b.dataset.i }); });
    }

    defineGame({
      id: o.id, name: o.name, emoji: o.emoji, min: 2, desc: o.desc,
      init: (H, seats) => newRound(H, seats),
      controls(H) {
        const gs = H.gs;
        return [
          { label: '🔄 새 판', primary: gs.phase === 'done', onClick: () => { U.hideBanner(); Object.assign(gs, newRound(H)); H.update(); } },
          { label: '⏭ 이 사람 건너뛰기', disabled: gs.phase !== 'play', onClick: () => { gs.turn = (gs.turn + 1) % gs.seats.length; H.update(); } }
        ];
      },
      hostView: (H, el) => view(H, el, true),
      playerView: (P, el) => view(P, el, true),
      onAct(H, pid, a) {
        const gs = H.gs;
        if (a.k !== 'pick' || gs.phase !== 'play' || curPid(gs) !== pid) return;
        const i = a.i | 0;
        if (i < 0 || i >= gs.slots || gs.used[i] !== undefined) return;
        gs.used[i] = pid;
        if (H.secret && i === H.secret.trap) {
          gs.phase = 'done'; gs.loser = pid; gs.hit = i;
          H.update(); H.ev({ k: 'boom', id: pid });
        } else {
          gs.turn = (gs.turn + 1) % gs.seats.length;
          H.update(); H.ev({ k: 'safe', id: pid, i });
        }
      },
      onEvent(ctx, m, el) {
        if (m.k === 'safe') { o.safeSound(); if (ctx.isMe && !ctx.isHost && ctx.isMe(ctx.gs.seats[ctx.gs.turn % ctx.gs.seats.length])) U.buzz(80); }
        if (m.k === 'boom') {
          o.boomSound(); U.buzz([300, 80, 300]);
          const me = ctx.isMe(m.id);
          setTimeout(() => U.banner(me ? '당신이 당첨!' : `${ctx.label(m.id)} 당첨!`, o.boomText, me ? 'me' : 'other'), 1100);
        }
      }
    });
  }

  // 🐊 악어: 위 7개 + 아래 7개 = 14개 이빨
  makeTrapGame({
    id: 'croc', name: '악어 이빨', emoji: '🐊', desc: '이빨 14개 중 하나가 함정! 호스트부터 차례로 꾹~ 걸리면 당첨',
    slots: () => 14, pickWord: '이빨 하나를 눌러요', boomWord: '콱! 🐊', boomText: '악어가 콱 물었어요! 🐊',
    board: () => `<div class="tboard croc">
      <div class="cjaw top"><div class="ceyes"><i></i><i></i></div><div class="teeth">${[...Array(7)].map((_, i) => `<button class="tooth" data-i="${i}"></button>`).join('')}</div></div>
      <div class="cmouth"></div>
      <div class="cjaw bot"><div class="teeth">${[...Array(7)].map((_, i) => `<button class="tooth" data-i="${i + 7}"></button>`).join('')}</div></div></div>`,
    safeSound: () => SFX.tick(),
    boomSound: () => { SFX.whoosh(); SFX.heartbeat(1); }
  });

  // 🏴‍☠️ 해적: 참가자 수 × 2 개의 구멍
  makeTrapGame({
    id: 'pirate', name: '해적 칼 꽂기', emoji: '🏴‍☠️', desc: '통에 구멍이 참가자×2개! 1번부터 칼을 꽂다가 해적이 튀어나오면 당첨',
    slots: n => Math.max(6, n * 2), pickWord: '구멍 하나에 칼을 꽂아요', boomWord: '퐁! 🏴‍☠️', boomText: '해적이 튀어나왔어요! 🏴‍☠️',
    board: n => `<div class="tboard pirate"><div class="pman">🏴‍☠️</div><div class="barrel">${[...Array(n)].map((_, i) => `<button class="hole" data-i="${i}"><span>🗡️</span></button>`).join('')}</div></div>`,
    safeSound: () => SFX.splash(),
    boomSound: () => { SFX.whoosh(); SFX.fanfare(); }
  });
})();
