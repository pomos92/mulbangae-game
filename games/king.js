// 👑 왕게임: 왕 카드 1장 + 백성 카드. 다시 섞기 → 앞면 보여 줬다가 뒤집어 섞고 나눠 줌 → 보기 → 한 사람만 왕!
(function () {
  const CHARS = ['🧑‍🌾', '👩‍🍳', '🧑‍🔧', '👨‍🎨', '👩‍🚀', '🧑‍🎤', '👨‍🚒', '👩‍🔬', '🧙', '🥷', '🧛', '🧚', '🤡', '🧑‍✈️', '👷', '🕵️'];

  function face(c) {
    if (!c) return '';
    return c.role === 'king'
      ? `<div class="kface king"><span class="ke">👑</span><b>왕</b><small>명령을 내려요!</small></div>`
      : `<div class="kface"><span class="ke">${c.ch}</span><b>백성 ${c.no}번</b><small>왕의 명령을 따라요</small></div>`;
  }
  function kcard(c, back, cls) { return `<div class="pcard kcard ${back ? 'back' : ''} ${cls || ''}"><div class="face">${face(c)}</div><div class="bk"><span>👑</span></div></div>`; }
  function deckFor(n) { const d = [{ role: 'king' }]; for (let i = 1; i < n; i++) d.push({ role: 'citizen', no: i, ch: CHARS[(i - 1) % CHARS.length] }); return d; }

  function shuffle(H) {
    const gs = H.gs;
    U.hideBanner();
    gs.phase = 'shuffling'; gs.n = (gs.n || 0) + 1; gs.king = null;
    H.secret = null;
    gs.seats.forEach(id => H.priv(id, { role: null }));
    H.update();
    H.ev({ k: 'shuffle', n: gs.n });
    H.after(4200, () => { gs.phase = 'dealt'; H.update(); });
  }
  function look(H) {
    const gs = H.gs; if (gs.phase !== 'dealt') return;
    const deck = U.shuffle(deckFor(gs.seats.length));
    const roles = {};
    gs.seats.forEach((id, i) => { roles[id] = deck[i]; H.priv(id, deck[i]); });
    H.secret = { roles };
    gs.king = gs.seats.find(id => roles[id].role === 'king');
    gs.phase = 'revealed';
    H.update();
    H.ev({ k: 'look', king: gs.king });
  }

  // 호스트: 섞는 장면
  function playShuffle(el, n) {
    const row = el.querySelector('.krow'); if (!row) return;
    row.innerHTML = deckFor(n).map(c => kcard(c, false)).join('');
    const cards = [...row.children];
    SFX.whoosh();
    setTimeout(() => { cards.forEach((c, i) => setTimeout(() => { c.classList.add('back'); SFX.tick(); }, i * 80)); }, 1300);
    setTimeout(() => {
      cards.forEach(c => c.animate([
        { transform: 'translate(0,0) rotate(0)' },
        { transform: `translate(${(Math.random() - .5) * 260}px, ${(Math.random() - .5) * 120}px) rotate(${(Math.random() - .5) * 60}deg)` },
        { transform: `translate(${(Math.random() - .5) * 260}px, ${(Math.random() - .5) * 120}px) rotate(${(Math.random() - .5) * 60}deg)` },
        { transform: 'translate(0,0) rotate(0)' }], { duration: 1600, easing: 'ease-in-out' }));
      SFX.drumroll(1.4);
    }, 2000);
  }

  defineGame({
    id: 'king', name: '왕게임', emoji: '👑', min: 3, seatPanel: true,
    desc: '왕 카드 1장, 나머지는 백성! 섞어서 나눠 주고 보기를 누르면 왕 공개',
    init(H, seats) {
      H.after(50, () => shuffle(H));
      return { phase: 'shuffling', n: 0, king: null };
    },
    controls(H) {
      const gs = H.gs;
      return [
        { label: '🔀 다시 섞기', disabled: gs.phase === 'shuffling', onClick: () => shuffle(H) },
        { label: '👀 보기', primary: true, disabled: gs.phase !== 'dealt', onClick: () => look(H) }
      ];
    },
    hostView(H, el) {
      const gs = H.gs;
      if (!el.querySelector('.krow')) el.innerHTML = '<div class="big-msg kmsg"></div><div class="krow"></div><div class="seatgrid kseats"></div>';
      el.querySelector('.kmsg').textContent = gs.phase === 'shuffling' ? '카드를 섞는 중… 🔀' : gs.phase === 'dealt' ? '카드를 다 나눠 줬어요. 👀 보기를 누르세요!' : `👑 왕은 ${H.label(gs.king)}!  명령을 내려 주세요`;
      if (gs.phase !== 'shuffling' && el._shuffled !== gs.n) { el._shuffled = gs.n; el.querySelector('.krow').innerHTML = ''; }
      el.querySelector('.kseats').innerHTML = H.seats().map(p => `<div class="seat ${gs.phase === 'revealed' && gs.king === p.id ? 'turn' : ''}" style="--c:${p.color}">${gs.phase === 'revealed' && gs.king === p.id ? '👑 ' : '🂠 '}${H.label(p.id)}<small>${gs.phase === 'revealed' ? (gs.king === p.id ? '왕' : '백성') : gs.phase === 'dealt' ? '카드 받음' : ''}</small></div>`).join('');
    },
    playerView(P, el) {
      const gs = P.gs, c = P.priv && P.priv.role ? P.priv : null;
      if (!el.querySelector('.kmine')) el.innerHTML = '<div class="kmine"></div><div class="hint khint"></div>';
      const box = el.querySelector('.kmine');
      const key = gs.phase + ':' + gs.n + ':' + (c ? c.role + c.no : '');
      if (box.dataset.k !== key) {
        box.dataset.k = key;
        if (gs.phase === 'shuffling') { box.innerHTML = '<div class="kwait">🔀</div>'; }
        else if (gs.phase === 'dealt' || !c) { box.innerHTML = kcard(null, true, 'big deal'); }
        else { box.innerHTML = kcard(c, true, 'big'); setTimeout(() => { box.firstElementChild.classList.remove('back'); if (c.role === 'king') { SFX.fanfare(); U.confetti(); U.buzz([100, 60, 100]); } else SFX.tick(); }, 60); }
      }
      const msg = gs.phase === 'shuffling' ? '카드를 섞는 중…' : gs.phase === 'dealt' ? '카드를 받았어요! 호스트가 보기를 누르면 뒤집혀요' : c && c.role === 'king' ? '👑 내가 왕이에요! 명령을 내려요' : `👑 왕은 ${P.label(gs.king)}`;
      P.status(msg);
      el.querySelector('.khint').textContent = gs.phase === 'revealed' && c && c.role !== 'king' ? '🤫 내 번호는 나만 알아요' : '';
    },
    onEvent(ctx, m, el) {
      if (m.k === 'shuffle' && ctx.isHost) playShuffle(el, ctx.gs.seats.length);
      if (m.k === 'look' && ctx.isHost) { SFX.fanfare(); setTimeout(() => SFX.speak(`왕은 ${ctx.num(m.king)}번!`), 800); }
    }
  });
})();
