// ⬇️⬆️ 로우하이: 모두에게 LOW / HIGH 카드 두 장. 몰래 한 장을 고르고, 공개했을 때 적게 고른 쪽(소수)이 당첨
(function () {
  function newRound(H) { H.secret = { picks: {} }; return { phase: 'pick', picked: [], picks: null, losers: [], n: ((H.gs && H.gs.n) || 0) + 1 }; }

  function reveal(H) {
    const gs = H.gs; if (gs.phase !== 'pick') return;
    const picks = H.secret.picks;
    const low = gs.seats.filter(id => picks[id] === 'low'), high = gs.seats.filter(id => picks[id] === 'high');
    gs.picks = picks;
    gs.losers = low.length && high.length && low.length !== high.length ? (low.length < high.length ? low : high) : [];
    gs.counts = { low: low.length, high: high.length };
    gs.phase = 'revealed';
    H.update();
    H.ev({ k: 'reveal', losers: gs.losers, counts: gs.counts });
  }

  function cardsHTML(sel, done) {
    return `<div class="lhcards">
      <button class="lhc low ${sel === 'low' ? 'on' : ''}" data-v="low" ${done ? 'disabled' : ''}><span>⬇️</span><b>LOW</b></button>
      <button class="lhc high ${sel === 'high' ? 'on' : ''}" data-v="high" ${done ? 'disabled' : ''}><span>⬆️</span><b>HIGH</b></button></div>`;
  }

  defineGame({
    id: 'lowhigh', name: '로우하이', emoji: '⬇️⬆️', min: 3, seatPanel: true,
    desc: 'LOW / HIGH 중 몰래 한 장! 공개했을 때 적게 고른 쪽이 당첨',
    init: H => newRound(H),
    onRestore(H) { if (!H.secret) H.secret = { picks: {} }; },
    controls(H) {
      const gs = H.gs;
      return [
        { label: `🔍 공개! (${gs.picked.length}/${gs.seats.length} 선택)`, primary: true, disabled: gs.phase !== 'pick' || !gs.picked.length, onClick: () => reveal(H) },
        { label: '🔄 새 판', onClick: () => { U.hideBanner(); Object.assign(gs, newRound(H)); H.update(); } }
      ];
    },
    hostView(H, el) {
      const gs = H.gs;
      if (!el.querySelector('.lhboard')) el.innerHTML = '<div class="big-msg lhmsg"></div><div class="lhboard"></div><div class="seatgrid lhseats"></div>';
      el.querySelector('.lhmsg').textContent = gs.phase === 'pick' ? `각자 LOW / HIGH 중 하나를 몰래 고르세요 (${gs.picked.length}/${gs.seats.length})`
        : gs.losers.length ? `${gs.losers.map(H.label).join(', ')} 당첨! 🍺` : '무승부! 같은 수예요. 새 판으로 다시!';
      el.querySelector('.lhboard').innerHTML = gs.phase === 'revealed'
        ? `<div class="lhcount low ${gs.losers.length && gs.picks[gs.losers[0]] === 'low' ? 'lose' : ''}">⬇️ LOW <b>${gs.counts.low}</b></div><div class="lhcount high ${gs.losers.length && gs.picks[gs.losers[0]] === 'high' ? 'lose' : ''}">⬆️ HIGH <b>${gs.counts.high}</b></div>` : '';
      el.querySelector('.lhseats').innerHTML = H.seats().map(p => {
        const v = gs.phase === 'revealed' ? gs.picks[p.id] : null;
        return `<div class="seat ${gs.losers.includes(p.id) ? 'lose' : ''} ${gs.phase === 'pick' && !gs.picked.includes(p.id) ? 'dim' : ''}" style="--c:${p.color}">${H.label(p.id)}<small>${v ? (v === 'low' ? '⬇️ LOW' : '⬆️ HIGH') : gs.picked.includes(p.id) ? '✅ 골랐어요' : '고르는 중…'}</small></div>`;
      }).join('');
    },
    playerView(P, el) {
      const gs = P.gs, me = P.me.pid;
      const mineSel = gs.phase === 'revealed' ? (gs.picks[me] || null) : (el._sel && el._n === gs.n ? el._sel : null);
      if (el._n !== gs.n) { el._n = gs.n; el._sel = null; }
      el.innerHTML = `<div class="big-msg">${gs.phase === 'pick' ? '한 장을 몰래 골라요 🤫' : gs.losers.length ? (gs.losers.includes(me) ? '내가 걸렸어요! 🍺' : '살았다! 😆') : '무승부! 다시!'}</div>
        ${cardsHTML(mineSel, gs.phase !== 'pick')}
        ${gs.phase === 'revealed' ? `<div class="big-msg">⬇️ LOW ${gs.counts.low}명 · ⬆️ HIGH ${gs.counts.high}명</div>` : '<div class="hint">공개 전까지는 바꿀 수 있어요. 적게 고른 쪽이 마셔요!</div>'}`;
      el.querySelectorAll('.lhc').forEach(b => b.onclick = () => { el._sel = b.dataset.v; SFX.tick(); P.act({ k: 'pick', v: b.dataset.v }); el.querySelectorAll('.lhc').forEach(x => x.classList.toggle('on', x === b)); });
      P.status(gs.phase === 'pick' ? `${gs.picked.length}/${gs.seats.length}명 골랐어요` : '');
    },
    onAct(H, pid, a) {
      const gs = H.gs;
      if (a.k !== 'pick' || gs.phase !== 'pick' || (a.v !== 'low' && a.v !== 'high')) return;
      H.secret.picks[pid] = a.v;
      if (!gs.picked.includes(pid)) gs.picked.push(pid);
      H.update();
      if (gs.picked.length >= gs.seats.length) { SFX.drumroll(1.2); H.after(1300, () => reveal(H)); }
    },
    onEvent(ctx, m, el, isSeat) {
      if (m.k !== 'reveal' || isSeat) return;
      const meId = ctx.isHost ? ctx.hostPid() : ctx.me.pid, me = m.losers.includes(meId);
      if (!m.losers.length) return U.banner('무승부!', `LOW ${m.counts.low} : HIGH ${m.counts.high} — 다시 해요`, 'info');
      U.banner(me ? '당신이 당첨!' : `${m.losers.map(ctx.label).join(', ')} 당첨!`, `LOW ${m.counts.low}명 · HIGH ${m.counts.high}명 — 적게 고른 쪽이 마셔요`, me ? 'me' : 'other');
    }
  });
})();
