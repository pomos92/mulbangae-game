// 참가자 휴대폰 화면
(function () {
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const room = (params.get('r') || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const broker = MB.brokerFromParam(params.get('b')) || MB.BROKERS[0];
  const KEY = 'mb3_pid_' + room;
  const T = MB.PREFIX + room;
  let client = null, joined = false, dead = false, gotState = false;
  let S = null, priv = null, stageKey = '';
  const me = { pid: null, num: null };

  const P = {
    isHost: false,
    get me() { return me; }, get gs() { return S && S.gs; },
    get priv() { return priv && S && priv._r === S.round ? priv : null; },
    get players() { return S ? S.players : []; },
    isMe: id => id === me.pid,
    num: id => { const p = S && S.players.find(x => x.id === id); return p ? p.num : '?'; },
    label: id => { const p = S && S.players.find(x => x.id === id); return p ? (id === me.pid ? `나(${p.num}번)` : `${p.num}번`) : '?'; },
    color: id => { const p = S && S.players.find(x => x.id === id); return p ? p.color : '#888'; },
    act(a) { if (client && client.connected) client.publish(T + '/up', JSON.stringify({ t: 'act', pid: me.pid, a })); },
    status(t) { $('status').textContent = t || ''; },
    sub: (topic, fn) => { subs[topic] = fn; if (client) client.subscribe(T + topic); }
  };
  window.P = P;
  const subs = {};

  function fatal(msg) { dead = true; $('err').textContent = msg; $('err').style.display = 'flex'; if (client) client.end(true); }
  function up(t) { if (client && client.connected && !dead) client.publish(T + '/up', JSON.stringify({ t, pid: me.pid })); }
  function load(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }
  function store(k, v) { try { localStorage.setItem(k, v); } catch (_) { } }

  async function start() {
    if (!room) return fatal('QR 코드를 다시 찍어 주세요.');
    me.pid = load(KEY) || MB.rid(12); store(KEY, me.pid);
    try { client = (await MB.connectAny([broker], 8000)).client; }
    catch (e) { $('status').textContent = '인터넷 연결을 확인해 주세요. 다시 시도 중…'; setTimeout(start, 3000); return; }
    client.on('message', (topic, buf) => {
      if (dead) return;
      const txt = buf.toString();
      if (topic === T + '/state') {
        if (!txt) { if (joined) fatal('호스트가 방을 닫았어요. 고마워요! 🍻'); return; }
        try { onState(JSON.parse(txt)); } catch (e) { console.error(e); }
      } else if (topic === T + '/ev') {
        try { onEv(JSON.parse(txt)); } catch (e) { console.error(e); }
      } else if (topic === T + '/p/' + me.pid) {
        try { priv = txt ? JSON.parse(txt) : null; render(); } catch (_) { }
      } else {
        const k = topic.slice(T.length); if (subs[k]) { try { subs[k](txt ? JSON.parse(txt) : null); } catch (e) { console.error(e); } }
      }
    });
    client.on('connect', () => { subscribeAll(); up('join'); });
    client.on('offline', () => { $('status').textContent = '인터넷 연결이 끊겼어요. 다시 연결하는 중…'; });
    subscribeAll(); up('join');
    setInterval(() => { if (!dead) up(joined ? 'hb' : 'join'); }, 3000);
    setTimeout(() => { if (!gotState && !dead) $('status').textContent = '호스트 화면을 찾는 중… 호스트 화면이 켜져 있는지 확인해 주세요.'; }, 8000);
  }
  function subscribeAll() { client.subscribe([T + '/state', T + '/ev', T + '/p/' + me.pid, ...Object.keys(subs).map(k => T + k)], { qos: 0 }); }

  function onState(m) {
    gotState = true;
    const mine = m.players.find(p => p.id === me.pid);
    if (!mine) { if (joined) return fatal('게임에서 빠졌어요. QR을 다시 찍어 주세요.'); $('status').textContent = '참가 신청 중…'; return; }
    if (!joined) { joined = true; SFX.tick(); }
    me.num = mine.num; me.color = mine.color;
    $('me').textContent = `${mine.num}번`; $('me').style.setProperty('--c', mine.color);
    document.title = `${mine.num}번 · 술게임`;
    S = m;
    render();
  }
  function onEv(m) {
    if (m.type === 'rejected' && m.pid === me.pid && !joined) return fatal('참가 인원이 가득 찼어요.');
    if (m.type === 'kicked' && m.pid === me.pid) return fatal('호스트가 나를 뺐어요.');
    if (m.type === 'ended') { if (joined) fatal('호스트가 방을 닫았어요. 고마워요! 🍻'); return; }
    if (m.type === 'g' && S && S.game && joined) {
      const d = GAMES[S.game];
      if (d && d.onEvent && S.gs && S.gs.seats.includes(me.pid)) d.onEvent(P, m, $('stage'));
    }
  }
  function render() {
    if (!S || !joined) return;
    const d = S.game && GAMES[S.game];
    $('gname').textContent = d ? `${d.emoji} ${d.name}` : '🍻 술게임 모임';
    const stage = $('stage');
    const key = d ? S.game + ':' + S.round : 'lobby';
    if (key !== stageKey) { U.resetEl(stage); stageKey = key; stage.className = 'g-' + (d ? S.game : 'lobby'); U.hideBanner(); SFX.stopMusic(); }
    if (!d) {
      $('status').textContent = '참가 완료! 호스트가 게임을 고르는 중 🍻';
      if (!stage.querySelector('.lobbytub')) stage.innerHTML = `<div class="lobbytub water" style="--c:${me.color}"><span class="n">${me.num}</span><span class="t">번 자리 · 참가자 ${S.players.length}명</span></div>`;
      else stage.querySelector('.t').textContent = `번 자리 · 참가자 ${S.players.length}명`;
      if (window.ADS) ADS.mount(stage, 'join');
      return;
    }
    if (!S.gs || !S.gs.seats.includes(me.pid)) {
      $('status').textContent = '이번 판은 구경 중이에요. 다음 판부터 참가해요!';
      U.resetEl(stage); stage.innerHTML = '<div class="big-msg" style="margin-top:20vh">👀 구경 중…</div>';
      stageKey = 'spectate';
      return;
    }
    d.playerView(P, stage);
  }

  function sndLabel() { const b = $('snd'); if (SFX.isMuted()) { b.className = 'on'; b.textContent = '🔇 소리 꺼짐'; } else if (SFX.state() === 'running') { b.className = 'on'; b.textContent = '🔊'; } else { b.className = ''; b.textContent = '🔊 눌러서 소리 켜기'; } }
  document.addEventListener('pointerdown', e => { if (e.target.id !== 'snd') { SFX.unlock(); setTimeout(sndLabel, 200); } }, { capture: true });
  $('snd').onclick = () => { if (SFX.state() !== 'running') { SFX.unlock(); SFX.setMuted(false); } else SFX.setMuted(!SFX.isMuted()); setTimeout(sndLabel, 200); };
  async function wake() { try { await navigator.wakeLock.request('screen'); } catch (_) { } }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') wake(); });
  document.addEventListener('click', wake, { once: true });
  start();
})();
