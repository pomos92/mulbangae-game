// 🎭 라이어 게임: 모두 같은 단어, 라이어 한 명만 다른 단어. 1번부터 그림을 그리고(모두 실시간으로 봄) 투표로 라이어를 찾아요
(function () {
  const WORDS = {
    '음식': ['김치찌개', '떡볶이', '치킨', '피자', '라면', '초밥', '삼겹살', '햄버거', '짜장면', '비빔밥', '아이스크림', '케이크', '붕어빵', '김밥'],
    '동물': ['고양이', '강아지', '코끼리', '기린', '펭귄', '토끼', '사자', '호랑이', '판다', '돼지', '거북이', '문어', '독수리', '물방개'],
    '장소': ['학교', '병원', '바다', '산', '놀이공원', '편의점', '공항', '도서관', '찜질방', '노래방', '수영장', '캠핑장', '영화관', '지하철'],
    '물건': ['우산', '안경', '시계', '가위', '냉장고', '자전거', '휴대폰', '모자', '칫솔', '선풍기', '의자', '열쇠', '컵', '풍선'],
    '직업': ['의사', '소방관', '경찰', '요리사', '선생님', '가수', '축구선수', '우주비행사', '농부', '미용사', '택배기사', '마술사'],
    '운동': ['축구', '야구', '농구', '수영', '볼링', '스키', '탁구', '골프', '권투', '배드민턴', '마라톤', '서핑']
  };
  const PEN = ['#111111', '#e53935', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa'];
  let HD = {};           // 호스트: 모든 그림 {pid: [ {c,w,p:[x,y,...]} ]}
  let dirty = false, flushTimer = null;
  const mirrors = new WeakMap(); // 보기용 사본 (ctx별)

  function newRound(H, seats) {
    seats = seats || H.gs.seats;
    const cat = U.pick(Object.keys(WORDS));
    const [word, liarWord] = U.shuffle(WORDS[cat]);
    const liar = U.pick(seats);
    H.secret = { liar, word, liarWord, votes: {} };
    HD = {}; seats.forEach(id => HD[id] = []);
    setTimeout(() => { seats.forEach(id => H.priv(id, { cat, word: id === liar ? liarWord : word })); publishDraw(H); }, 0);
    return { phase: 'word', cat, turn: 0, voted: [], result: null, n: ((H.gs && H.gs.n) || 0) + 1 };
  }
  function publishDraw(H) { H.raw('/draw', { n: H.gs.n, d: HD }, true); dirty = false; }
  function markDirty(H) { dirty = true; if (!flushTimer) flushTimer = setTimeout(() => { flushTimer = null; if (dirty) publishDraw(H); }, 1500); }

  // ── 캔버스 ──
  function canvasBox(id, ctx, extra) { return `<div class="lbox ${extra || ''}" data-id="${id}"><canvas width="600" height="600"></canvas><span class="tag" style="--c:${ctx.color(id)}">${ctx.label(id)}</span></div>`; }
  function drawStrokes(cv, strokes) {
    const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
    (strokes || []).forEach(s => drawPts(cv, s, 0));
  }
  function drawPts(cv, s, from) {
    const g = cv.getContext('2d'), k = cv.width / 1000, p = s.p;
    g.strokeStyle = s.c; g.lineWidth = s.w * k; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath();
    const st = Math.max(0, from - 2);
    g.moveTo(p[st] * k, p[st + 1] * k);
    if (p.length <= 2) g.lineTo(p[0] * k + .1, p[1] * k);
    for (let i = st + 2; i < p.length; i += 2) g.lineTo(p[i] * k, p[i + 1] * k);
    g.stroke();
  }
  function mirror(ctx) { if (ctx.isHost || ctx.seatOfHost) return HD; let m = mirrors.get(ctx); if (!m) { m = {}; mirrors.set(ctx, m); } return m; }
  function applySeg(D, m) {
    const list = D[m.pid] || (D[m.pid] = []);
    if (m.s || !list.length) list.push({ c: m.c, w: m.w, p: m.p.slice() });
    else { const s = list[list.length - 1]; s.p.push(...m.p); }
    return list[list.length - 1];
  }

  function attachPad(ctx, cv) {
    if (cv._pad) return; cv._pad = true;
    let drawing = false, buf = [], first = false, color = PEN[0], width = 8;
    cv._setColor = c => color = c; cv._setWidth = w => width = w;
    const pos = e => { const r = cv.getBoundingClientRect(); return [Math.round((e.clientX - r.left) / r.width * 1000), Math.round((e.clientY - r.top) / r.height * 1000)]; };
    const local = { c: color, w: width, p: [] };
    const flush = () => {
      if (!buf.length) return;
      ctx.act({ k: 'seg', s: first, c: color, w: width, p: buf });
      if (!ctx.seatOfHost) applySeg(mirror(ctx), { pid: ctx.me.pid, s: first, c: color, w: width, p: buf });
      first = false; buf = [];
    };
    let timer = null;
    cv.style.touchAction = 'none';
    cv.addEventListener('pointerdown', e => {
      drawing = true; first = true; cv.setPointerCapture(e.pointerId);
      const [x, y] = pos(e); buf = [x, y]; local.c = color; local.w = width; local.p = [x, y];
      drawPts(cv, local, 0);
      timer = setInterval(flush, 80);
    });
    cv.addEventListener('pointermove', e => {
      if (!drawing) return;
      const [x, y] = pos(e); buf.push(x, y); local.p.push(x, y);
      drawPts(cv, local, local.p.length - 2);
    });
    const end = () => { if (!drawing) return; drawing = false; clearInterval(timer); flush(); };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  }

  defineGame({
    id: 'liar', name: '라이어 게임', emoji: '🎭', min: 3, seatPanel: true,
    desc: '나만 보는 단어! 한 명만 다른 단어(라이어). 차례로 그림 그리고 라이어를 찾아요',
    init: (H, seats) => newRound(H, seats),
    onRestore(H) { if (!H.secret) Object.assign(H.gs, newRound(H)); else publishDraw(H); },
    controls(H) {
      const gs = H.gs;
      const b = [];
      if (gs.phase === 'word') b.push({ label: '✏️ 그림 그리기 시작 (1번부터)', primary: true, onClick: () => { gs.phase = 'draw'; gs.turn = 0; H.update(); H.ev({ k: 'turn' }); } });
      if (gs.phase === 'draw') b.push({ label: '⏭ 다음 사람', onClick: () => nextTurn(H) });
      if (gs.phase === 'vote') b.push({ label: `📊 결과 공개 (${gs.voted.length}/${gs.seats.length} 투표)`, primary: true, onClick: () => finish(H) });
      b.push({ label: '🔄 새 단어로 새 판', primary: gs.phase === 'result', onClick: () => { U.hideBanner(); Object.assign(gs, newRound(H)); H.update(); } });
      return b;
    },
    hostView(H, el) {
      const gs = H.gs;
      if (el._n !== gs.n) {
        el._n = gs.n;
        el.innerHTML = `<div class="big-msg lmsg"></div><div class="lgrid">${H.seats().map(p => canvasBox(p.id, H)).join('')}</div>`;
        el.querySelectorAll('.lbox').forEach(b => drawStrokes(b.querySelector('canvas'), HD[b.dataset.id]));
      }
      const cur = gs.seats[gs.turn];
      el.querySelectorAll('.lbox').forEach(b => { b.classList.toggle('turn', gs.phase === 'draw' && b.dataset.id === cur); b.classList.toggle('liar', gs.phase === 'result' && b.dataset.id === gs.result.liar); });
      el.querySelector('.lmsg').textContent = {
        word: `주제: ${gs.cat} — 각자 휴대폰으로 단어를 확인하세요 🤫`,
        draw: `✏️ ${H.label(cur)} 그리는 중… (주제: ${gs.cat})`,
        vote: `🗳 라이어는 누구? 각자 휴대폰으로 투표하세요 (${gs.voted.length}/${gs.seats.length})`,
        result: gs.result ? (gs.result.caught ? `🎯 라이어 검거! ${H.label(gs.result.liar)} 당첨 — 단어: ${gs.result.word} / 라이어 단어: ${gs.result.liarWord}` : `🎭 라이어 승리! 라이어는 ${H.label(gs.result.liar)} — 단어: ${gs.result.word} / 라이어 단어: ${gs.result.liarWord}`) : ''
      }[gs.phase];
      if (gs.phase === 'result') el.querySelectorAll('.lbox').forEach(b => { const c = gs.result.counts[b.dataset.id] || 0; let v = b.querySelector('.vc'); if (!v) { v = U.el('<b class="vc"></b>'); b.appendChild(v); } v.textContent = `🗳 ${c}`; });
    },
    playerView(P, el) {
      const gs = P.gs, pv = P.priv, me = P.me.pid, cur = gs.seats[gs.turn];
      if (!P.seatOfHost) loadMirror(P);
      const key = gs.n + ':' + gs.phase + ':' + (gs.phase === 'draw' ? cur : '');
      if (el._key !== key) {
        el._key = key;
        if (gs.phase === 'word') {
          el.innerHTML = `<div class="lword"><p>라이어 게임이 시작됩니다.<br><b>자기만 보세요!</b> 🤫</p><button class="btn-main lreveal">👆 꾹 눌러서 단어 보기</button><div class="lw"></div></div>`;
          const btn = el.querySelector('.lreveal'), lw = el.querySelector('.lw');
          const show = v => { const p = P.priv; lw.innerHTML = v && p ? `<small>주제: ${U.esc(p.cat)}</small><b>${U.esc(p.word)}</b>` : ''; };
          btn.onpointerdown = () => show(true); btn.onpointerup = btn.onpointerleave = btn.onpointercancel = () => show(false);
        } else if (gs.phase === 'draw' && cur === me) {
          el.innerHTML = `<div class="lpad">${canvasBox(me, P, 'mine')}<div class="lpens">${PEN.map((c, i) => `<button class="pen ${i ? '' : 'on'}" data-c="${c}" style="background:${c}"></button>`).join('')}<button class="btn-sub lclear">지우기</button></div><button class="btn-main ldone">✅ 다 그렸어요</button><div class="hint lmyword"></div></div>`;
          const cv = el.querySelector('canvas'); drawStrokes(cv, mirror(P)[me]); attachPad(P, cv);
          el.querySelectorAll('.pen').forEach(b => b.onclick = () => { el.querySelectorAll('.pen').forEach(x => x.classList.remove('on')); b.classList.add('on'); cv._setColor(b.dataset.c); });
          el.querySelector('.lclear').onclick = () => { P.act({ k: 'clear' }); if (!P.seatOfHost) mirror(P)[me] = []; drawStrokes(cv, []); };
          el.querySelector('.ldone').onclick = () => { if (confirm('다 그렸나요? 다음 사람에게 넘어가요.')) P.act({ k: 'done' }); };
          U.buzz([80, 60, 80]); SFX.tick();
        } else if (gs.phase === 'draw') {
          el.innerHTML = `<div class="lview">${canvasBox(cur, P, 'live')}</div><div class="lthumbs">${gs.seats.filter(id => id !== cur).map(id => canvasBox(id, P, 'thumb')).join('')}</div>`;
          el.querySelectorAll('.lbox').forEach(b => drawStrokes(b.querySelector('canvas'), mirror(P)[b.dataset.id]));
        } else if (gs.phase === 'vote') {
          el.innerHTML = `<div class="big-msg">🗳 라이어는 누구일까요?</div><div class="lthumbs vote">${gs.seats.filter(id => id !== me).map(id => `<button class="lvote" data-id="${id}">${canvasBox(id, P, 'thumb')}</button>`).join('')}</div>`;
          el.querySelectorAll('.lbox').forEach(b => drawStrokes(b.querySelector('canvas'), mirror(P)[b.dataset.id]));
          el.querySelectorAll('.lvote').forEach(b => b.onclick = () => { if (gs.voted.includes(me)) return; el.querySelectorAll('.lvote').forEach(x => x.classList.toggle('on', x === b)); P.act({ k: 'vote', target: b.dataset.id }); });
        } else if (gs.phase === 'result') {
          const r = gs.result;
          el.innerHTML = `<div class="lres"><div class="big-msg">${r.caught ? '🎯 라이어 검거!' : '🎭 라이어 승리!'}</div><p>라이어: <b>${U.esc(P.label(r.liar))}</b></p><p>모두의 단어: <b>${U.esc(r.word)}</b><br>라이어 단어: <b>${U.esc(r.liarWord)}</b></p></div><div class="lthumbs">${gs.seats.map(id => canvasBox(id, P, 'thumb')).join('')}</div>`;
          el.querySelectorAll('.lbox').forEach(b => drawStrokes(b.querySelector('canvas'), mirror(P)[b.dataset.id]));
        }
      }
      if (gs.phase === 'draw' && cur === me && pv) el.querySelector('.lmyword').textContent = `내 단어: ${pv.word} (주제: ${pv.cat})`;
      P.status({ word: '단어를 확인하세요 (나만 보기!)', draw: cur === me ? '✏️ 내 차례! 단어를 그림으로 그려요 (글자는 금지!)' : `${P.label(cur)} 그리는 중…`, vote: gs.voted.includes(me) ? `투표 완료! (${gs.voted.length}/${gs.seats.length})` : '라이어라고 생각하는 사람을 눌러요', result: '' }[gs.phase]);
    },
    onAct(H, pid, a) {
      const gs = H.gs, cur = gs.seats[gs.turn];
      if (a.k === 'seg' && gs.phase === 'draw' && pid === cur && Array.isArray(a.p) && a.p.length < 4000) {
        const m = { pid, s: !!a.s, c: PEN.includes(a.c) ? a.c : PEN[0], w: Math.min(30, Math.max(2, a.w | 0)), p: a.p.map(v => Math.max(0, Math.min(1000, v | 0))) };
        applySeg(HD, m); H.ev({ k: 'seg', ...m }); markDirty(H);
      } else if (a.k === 'clear' && gs.phase === 'draw' && pid === cur) {
        HD[pid] = []; H.ev({ k: 'clear', pid }); markDirty(H);
      } else if (a.k === 'done' && gs.phase === 'draw' && pid === cur) nextTurn(H);
      else if (a.k === 'vote' && gs.phase === 'vote' && gs.seats.includes(a.target) && a.target !== pid && !gs.voted.includes(pid)) {
        H.secret.votes[pid] = a.target; gs.voted.push(pid); H.update();
        if (gs.voted.length >= gs.seats.length) H.after(600, () => finish(H));
      }
    },
    onEvent(ctx, m, el, isSeat) {
      if (m.k === 'seg' || m.k === 'clear') {
        const own = !ctx.isHost && ctx.isMe(m.pid);
        if (!ctx.isHost && !ctx.seatOfHost && !own) { if (m.k === 'clear') mirror(ctx)[m.pid] = []; else applySeg(mirror(ctx), m); }
        if (own) return;
        el.querySelectorAll(`.lbox[data-id="${m.pid}"] canvas`).forEach(cv => {
          if (m.k === 'clear') return drawStrokes(cv, []);
          const list = mirror(ctx)[m.pid] || [], s = list[list.length - 1];
          if (s) drawPts(cv, s, Math.max(0, s.p.length - m.p.length));
        });
      }
      if (m.k === 'turn' && ctx.isHost) SFX.tick();
      if (m.k === 'result' && (ctx.isHost || !isSeat)) {
        const meId = ctx.isHost ? ctx.hostPid() : ctx.me.pid, iAmLiar = meId === m.liar;
        if (m.caught) U.banner(iAmLiar ? '당신이 당첨!' : '라이어 검거! 🎯', `라이어는 ${ctx.label(m.liar)} · 단어: ${m.word}`, iAmLiar ? 'me' : 'other');
        else U.banner(iAmLiar ? '라이어 승리! 🎭' : '라이어 승리! 🎭', `라이어는 ${ctx.label(m.liar)} · 단어: ${m.word} / 라이어 단어: ${m.liarWord}`, iAmLiar ? 'info' : 'other');
      }
    },
  });

  function nextTurn(H) {
    const gs = H.gs;
    publishDraw(H);
    if (gs.turn + 1 >= gs.seats.length) { gs.phase = 'vote'; gs.voted = []; H.secret.votes = {}; }
    else gs.turn++;
    H.update(); H.ev({ k: 'turn' });
  }
  function finish(H) {
    const gs = H.gs, s = H.secret; if (gs.phase !== 'vote') return;
    const counts = {}; Object.values(s.votes).forEach(t => counts[t] = (counts[t] || 0) + 1);
    const max = Math.max(0, ...Object.values(counts));
    const top = Object.keys(counts).filter(id => counts[id] === max);
    const caught = max > 0 && top.length === 1 && top[0] === s.liar;
    gs.result = { liar: s.liar, word: s.word, liarWord: s.liarWord, counts, caught };
    gs.phase = 'result';
    H.update();
    H.ev({ k: 'result', liar: s.liar, caught, word: s.word, liarWord: s.liarWord });
  }

  // 참가자: 그림 저장본 받기 (새로고침/늦게 들어온 경우)
  let lastDraw = null;
  function loadMirror(P) {
    const m = mirror(P), n = P.gs.n;
    if (m._n === n && (m._loaded || !lastDraw || lastDraw.n !== n)) return;
    Object.keys(m).forEach(k => delete m[k]); m._n = n; m._loaded = false;
    if (lastDraw && lastDraw.n === n) { Object.assign(m, JSON.parse(JSON.stringify(lastDraw.d))); m._loaded = true; }
  }
  window.__liarLoad = loadMirror;
  document.addEventListener('DOMContentLoaded', () => {
    if (!window.P || !window.P.sub) return;
    window.P.sub('/draw', msg => {
      lastDraw = msg;
      if (!msg || !window.P.gs || msg.n !== window.P.gs.n) return;
      const m = mirror(window.P); if (m._n === msg.n && m._loaded) return; loadMirror(window.P);
      document.querySelectorAll('#stage .lbox').forEach(b => { if (!b.classList.contains('mine')) drawStrokes(b.querySelector('canvas'), m[b.dataset.id]); });
    });
  });
})();
