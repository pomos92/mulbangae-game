// 호스트 화면: 방(QR) 관리, 게임 고르기, 게임 진행. 호스트도 참가자 중 한 명.
(function () {
  const $ = id => document.getElementById(id);
  const HK = 'mb3_host';
  const params = new URLSearchParams(location.search);
  let G = null, client = null, brokerUrl = null, lastSent = '';
  let hostPriv = null, roundTimers = [];
  const T = () => MB.PREFIX + G.room;

  function save() { try { localStorage.setItem(HK, JSON.stringify({ ...G, players: G.players.map(p => ({ ...p, seen: 0 })) })); } catch (_) { } }
  function restore() { try { return JSON.parse(localStorage.getItem(HK)); } catch (_) { return null; } }
  function newRoom() { return { room: MB.rid(6), players: [], nextNum: 1, hostPid: 'h' + MB.rid(11), hostPlays: true, game: null, gs: null, secret: null, round: 0, privs: {} }; }

  const isMe = id => G && id === G.hostPid;
  const player = id => G.players.find(p => p.id === id);
  const online = p => isMe(p.id) || Date.now() - (p.seen || 0) < 12000;

  // ── 모듈에 넘겨줄 도구 (H) ──
  const H = {
    get G() { return G; }, get gs() { return G.gs; }, set gs(v) { G.gs = v; },
    get secret() { return G.secret; }, set secret(v) { G.secret = v; },
    isHost: true,
    hostPid: () => G.hostPid,
    isMe, player,
    num: id => (player(id) || {}).num,
    label: id => { const p = player(id); return p ? (isMe(id) ? `나(${p.num}번)` : `${p.num}번`) : '?'; },
    color: id => (player(id) || {}).color || '#888',
    seats: () => (G.gs && G.gs.seats ? G.gs.seats : []).map(player).filter(Boolean),
    update() { broadcastState(); },
    ev(obj) { const m = { type: 'g', ...obj }; pub('/ev', m); handleEvent(m); },
    priv(pid, obj) {
      obj = { ...obj, _r: G.round };
      G.privs[pid] = obj;
      if (isMe(pid)) { hostPriv = obj; renderMine(); }
      else if (client) client.publish(T() + '/p/' + pid, JSON.stringify(obj), { retain: true });
    },
    raw(sub, obj, retain) { pub(sub, obj, retain); },
    after(ms, fn) { const r = G.round; const t = setTimeout(() => { if (G.round === r) fn(); }, ms); roundTimers.push(t); return t; },
    clearTimers() { roundTimers.forEach(clearTimeout); roundTimers = []; },
    render: () => render(),
    act(a) { const d = GAMES[G.game]; if (d && d.onAct) d.onAct(H, G.hostPid, a); }
  };
  window.H = H;

  // 호스트 자신의 자리(참가자 화면)용 P
  const P = {
    isHost: false, seatOfHost: true,
    get me() { return { pid: G.hostPid, num: H.num(G.hostPid) }; },
    get gs() { return G.gs; }, get priv() { return hostPriv; },
    get players() { return snapshot().players; },
    isMe, num: H.num, label: H.label, color: H.color,
    act(a) { const d = GAMES[G.game]; if (d && d.onAct) d.onAct(H, G.hostPid, a); },
    status() { }, sub() { }
  };

  function pub(sub, obj, retain) { if (client) client.publish(T() + sub, JSON.stringify(obj), { qos: 0, retain: !!retain }); }
  function snapshot() {
    return { type: 'state', game: G.game, gs: G.gs, round: G.round,
      players: G.players.map(p => ({ id: p.id, num: p.num, color: p.color, online: online(p) })) };
  }
  function broadcastState() {
    save();
    const s = snapshot();
    const txt = JSON.stringify(s);
    if (txt !== lastSent) { lastSent = txt; pub('/state', s, true); }
    render();
  }

  function ensureHost() {
    const has = G.players.some(p => p.id === G.hostPid);
    if (G.hostPlays && !has) {
      const num = G.nextNum++;
      G.players.unshift({ id: G.hostPid, num, color: COLORS[(num - 1) % COLORS.length], seen: Date.now() });
    } else if (!G.hostPlays && has) G.players = G.players.filter(p => p.id !== G.hostPid);
    G.players.sort((a, b) => a.num - b.num);
  }

  // ── 참가자 → 호스트 ──
  function onUp(m) {
    if (!m || typeof m.pid !== 'string' || m.pid.length > 40 || isMe(m.pid)) return;
    let p = player(m.pid);
    if (m.t === 'join') {
      if (!p) {
        if (G.players.length >= 60) { pub('/ev', { type: 'rejected', pid: m.pid, full: true }); return; }
        const num = G.nextNum++;
        p = { id: m.pid, num, color: COLORS[(num - 1) % COLORS.length], seen: Date.now() };
        G.players.push(p);
        SFX.tick();
      } else p.seen = Date.now();
      broadcastState();
      // 개인 정보 다시 보내기 (새로고침한 경우)
      if (G.privs[m.pid] && client) client.publish(T() + '/p/' + m.pid, JSON.stringify(G.privs[m.pid]), { retain: true });
    } else if (m.t === 'hb' && p) {
      const was = online(p); p.seen = Date.now(); if (!was) broadcastState();
    } else if (m.t === 'act' && p && G.game) {
      const d = GAMES[G.game];
      if (d && d.onAct && G.gs && (G.gs.seats || []).includes(p.id)) d.onAct(H, p.id, m.a || {});
    }
  }
  setInterval(() => {
    if (!G) return;
    const s = snapshot(); const prev = lastSent ? JSON.parse(lastSent) : null;
    if (prev && prev.players.some(o => { const n = s.players.find(x => x.id === o.id); return n && n.online !== o.online; })) broadcastState();
  }, 3000);

  // ── 게임 시작/종료 ──
  function startGame(id) {
    const d = GAMES[id];
    ensureHost();
    if (G.players.length < (d.min || 1)) return alert(`${d.name}은(는) ${d.min}명 이상이어야 해요. QR로 친구들을 먼저 불러 주세요!`);
    H.clearTimers(); U.hideBanner();
    G.round++; G.game = id; G.secret = null; G.privs = {}; hostPriv = null;
    const seats = G.players.map(p => p.id);
    G.gs = Object.assign({ seats }, d.init(H, seats) || {});
    if (!G.gs.seats) G.gs.seats = seats;
    $('qrwrap').classList.add('mini');
    stageKey = '';
    broadcastState();
    // 휴대폰처럼 좁은 화면에서는 게임 화면이 아래에 있으니 그쪽으로 내려 줌
    if (innerWidth < 900) setTimeout(() => $('gtitle').scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }
  H.restart = () => startGame(G.game);
  function backToMenu() {
    H.clearTimers(); U.hideBanner(); SFX.stopMusic();
    G.round++; G.game = null; G.gs = null; G.secret = null; G.privs = {}; hostPriv = null;
    stageKey = '';
    broadcastState();
  }

  // ── 그리기 ──
  let stageKey = '';
  function render() {
    if (!G) return;
    // 참가자 칩
    const chips = $('chips');
    chips.innerHTML = G.players.map(p => `<span class="chip ${online(p) ? '' : 'off'}" style="--c:${p.color}">${p.num}${isMe(p.id) ? ' · 나' : ''}${!G.game && !isMe(p.id) ? `<b data-kick="${p.id}" title="빼기">✕</b>` : ''}</span>`).join('') || '<span class="muted">아직 아무도 없어요</span>';
    chips.querySelectorAll('[data-kick]').forEach(b => b.onclick = () => {
      const p = player(b.dataset.kick); if (!p || !confirm(`${p.num}번을 뺄까요?`)) return;
      pub('/ev', { type: 'kicked', pid: p.id }); G.players = G.players.filter(x => x !== p); broadcastState();
    });
    $('cnt').textContent = G.players.length;
    $('hostjoin').textContent = G.hostPlays ? '🙋 나도 참가 중' : '🙋 나도 참가하기';
    $('hostjoin').classList.toggle('on', !!G.hostPlays);

    const d = G.game && GAMES[G.game];
    $('gtitle').textContent = d ? `${d.emoji} ${d.name}` : '🎉 게임 고르기';
    $('back').style.display = d ? '' : 'none';
    const stage = $('stage');
    const key = G.game ? G.game + ':' + G.round : 'menu';
    if (key !== stageKey) { U.resetEl(stage); U.resetEl($('mine')); stageKey = key; stage.className = 'stage g-' + (G.game || 'menu'); }
    if (!d) { renderMenu(stage); $('controls').innerHTML = ''; $('minewrap').style.display = 'none'; return; }
    // 진행 버튼
    const ctr = $('controls'); ctr.innerHTML = '';
    (d.controls ? d.controls(H) : []).forEach(c => {
      const b = U.el(`<button class="${c.primary ? 'btn-main' : 'btn-sub'}">${U.esc(c.label)}</button>`);
      b.disabled = !!c.disabled; b.onclick = () => { SFX.unlock(); c.onClick(); };
      ctr.appendChild(b);
    });
    d.hostView(H, stage);
    renderMine();
  }
  function renderMine() {
    const d = G.game && GAMES[G.game];
    const show = d && d.seatPanel && G.hostPlays && G.gs && G.gs.seats.includes(G.hostPid);
    $('minewrap').style.display = show ? '' : 'none';
    if (show) d.playerView(P, $('mine'));
  }
  function renderMenu(stage) {
    if (stage.querySelector('.menu')) return;
    stage.innerHTML = `<div class="menu">${GAME_ORDER.map(id => { const d = GAMES[id]; return `
      <button class="gcard" data-g="${id}"><span class="ge">${d.emoji}</span><b>${U.esc(d.name)}</b><small>${U.esc(d.desc)}</small></button>`; }).join('')}</div>`;
    stage.querySelectorAll('.gcard').forEach(b => b.onclick = () => { SFX.unlock(); startGame(b.dataset.g); });
  }
  function handleEvent(m) {
    const d = G.game && GAMES[G.game];
    if (!d || !d.onEvent) return;
    d.onEvent(H, m, $('stage'));
    if (d.seatPanel && G.hostPlays && G.gs && G.gs.seats.includes(G.hostPid)) d.onEvent(P, m, $('mine'), true);
  }

  // ── QR ──
  function showQR() {
    const u = new URL('join.html', location.href);
    u.search = ''; u.hash = '';
    u.searchParams.set('r', G.room);
    u.searchParams.set('b', MB.brokerParam(brokerUrl));
    const qr = qrcode(0, 'M'); qr.addData(u.href); qr.make();
    $('qr').innerHTML = qr.createSvgTag({ cellSize: 8, margin: 2, scalable: true });
    $('link').textContent = u.href;
    $('codev').textContent = G.room.toUpperCase();
  }
  function setWarn(t, bad) { const w = $('warn'); w.style.display = t ? 'block' : 'none'; w.textContent = t || ''; w.style.color = bad ? '#ff9b9b' : ''; }

  async function init(fresh) {
    const saved = fresh ? null : restore();
    G = saved && saved.room && saved.hostPid ? saved : newRoom();
    if (!G.privs) G.privs = {};
    if (G.game && !GAMES[G.game]) { G.game = null; G.gs = null; }
    hostPriv = G.privs[G.hostPid] || null;
    ensureHost(); save();
    setWarn('실시간 중계 서버에 연결하는 중…');
    if (!client) {
      const list = params.get('broker') ? [params.get('broker')] : MB.BROKERS;
      try { const r = await MB.connectAny(list); client = r.client; brokerUrl = r.url; }
      catch (e) { setWarn('⚠️ ' + e.message + ' 잠시 후 다시 시도해요.', true); setTimeout(() => init(false), 4000); return; }
      client.on('message', (topic, buf) => {
        if (!G || topic !== T() + '/up') return;
        let m; try { m = JSON.parse(buf.toString()); } catch (_) { return; }
        onUp(m);
      });
      client.on('connect', () => { setWarn(''); subscribe(); lastSent = ''; broadcastState(); });
      client.on('offline', () => setWarn('⚠️ 인터넷 연결이 끊겼어요. 다시 연결하는 중…', true));
    }
    if (G.broker !== brokerUrl) { G.broker = brokerUrl; save(); }
    subscribe(); setWarn(''); showQR();
    if (G.game) $('qrwrap').classList.add('mini');
    lastSent = ''; stageKey = '';
    broadcastState();
    const d = G.game && GAMES[G.game];
    if (d && d.onRestore) d.onRestore(H);
  }
  let subscribed = null;
  function subscribe() {
    if (subscribed && subscribed !== T()) client.unsubscribe(subscribed + '/up');
    subscribed = T(); client.subscribe(T() + '/up', { qos: 0 });
  }

  // ── 버튼 ──
  document.addEventListener('pointerdown', () => SFX.unlock(), { capture: true });
  $('back').onclick = () => { if (confirm('게임 목록으로 돌아갈까요?')) backToMenu(); };
  $('hostjoin').onclick = () => {
    if (G.game) return alert('게임 목록 화면에서만 바꿀 수 있어요.');
    G.hostPlays = !G.hostPlays; ensureHost(); broadcastState();
  };
  $('mute').onclick = () => { SFX.unlock(); SFX.setMuted(!SFX.isMuted()); $('mute').textContent = SFX.isMuted() ? '🔇' : '🔊'; };
  $('qrtoggle').onclick = () => $('qrwrap').classList.toggle('mini');
  $('newroom').onclick = () => {
    if (!confirm('방을 새로 만들까요? 지금 참가자들은 QR을 다시 찍어야 해요.')) return;
    H.clearTimers(); pub('/ev', { type: 'ended' });
    if (client) client.publish(T() + '/state', '', { retain: true });
    init(true);
  };
  init(false);
})();
