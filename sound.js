// 소리: 배경음악과 효과음을 브라우저에서 직접 합성합니다 (음원 파일 없음).
// 휴대폰 브라우저는 화면을 한 번 눌러야 소리가 나므로 unlock()을 터치/클릭 때 불러 주세요.
window.SFX = (function () {
  let ctx = null, master = null, muted = false;
  let loop = null; // 배경음악 상태

  function ac() {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
      master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
    }
    return ctx;
  }
  function unlock() {
    const c = ac(); if (!c) return false;
    if (c.state === 'suspended') c.resume();
    // iOS: 아주 짧은 무음 재생으로 오디오 잠금 해제
    const b = c.createBuffer(1, 1, 22050), s = c.createBufferSource(); s.buffer = b; s.connect(master); s.start(0);
    try { if (window.speechSynthesis) { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } } catch (_) { }
    return c.state !== 'suspended';
  }
  function ready() { return ctx && ctx.state === 'running' && !muted; }
  function setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.8; if (m) stopMusic(); }

  // ── 악기 ──
  function tone(freq, t, dur, type, vol, dest) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + dur + 0.05);
  }
  function kick(t, vol) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
    g.gain.setValueAtTime(vol || 0.9, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.35);
  }
  let noiseBuf = null;
  function noise(t, dur, vol, hp, lp) {
    if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f1 = ctx.createBiquadFilter(); f1.type = 'highpass'; f1.frequency.value = hp || 6000;
    const f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = lp || 16000;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol || 0.15, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f1); f1.connect(f2); f2.connect(g); g.connect(master); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }

  // ── 긴장감 배경음악: 심장박동 킥 + 하이햇 + 단조 반복 멜로디, 점점 빨라짐 ──
  // A단조 계열의 반복 패턴 (직접 만든 패턴)
  const BASS = [45, 45, 48, 45, 52, 45, 51, 50];             // MIDI 음
  const LEAD = [69, 72, 76, 72, 69, 72, 75, 74, 69, 72, 76, 79, 77, 76, 75, 74];
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  function startMusic() {
    if (!ac() || muted) return;
    stopMusic();
    loop = { bpm: 112, step: 0, next: ctx.currentTime + 0.05, mode: 'run', timer: null };
    loop.timer = setInterval(schedule, 25);
  }
  function schedule() {
    if (!loop || !ready()) return;
    while (loop.next < ctx.currentTime + 0.12) {
      const t = loop.next, s = loop.step, sixteenth = 60 / loop.bpm / 4;
      if (loop.mode === 'run') {
        if (s % 4 === 0) kick(t, 0.8);
        if (s % 8 === 6) kick(t, 0.5);
        if (s % 2 === 1) noise(t, 0.04, 0.08);
        if (s % 2 === 0) tone(mtof(BASS[(s / 2) % 8]), t, sixteenth * 1.8, 'sawtooth', 0.09);
        tone(mtof(LEAD[s % 16]), t, sixteenth * 0.9, 'square', 0.045);
      } else if (loop.mode === 'hold') {
        // 멈춘 척할 때: 심장박동만 쿵…쿵 + 높은 떨림음
        if (s % 8 === 0) kick(t, 1.0);
        if (s % 8 === 2) kick(t, 0.6);
        if (s % 4 === 0) tone(mtof(88 + (s % 8 ? 1 : 0)), t, sixteenth * 3.5, 'sine', 0.03);
      }
      loop.next += sixteenth; loop.step++;
    }
  }
  function setIntensity(x) { if (loop) loop.bpm = 112 + Math.max(0, Math.min(1, x)) * 60; }
  function hold() { if (loop) { loop.mode = 'hold'; loop.saved = loop.bpm; loop.bpm = 100; } }
  function resume() { if (loop) { loop.mode = 'run'; loop.bpm = Math.min(185, (loop.saved || 140) + 12); } }
  function stopMusic() { if (loop) { clearInterval(loop.timer); loop = null; } }

  // ── 효과음 ──
  function splash() { if (!ready()) return; const t = ctx.currentTime; noise(t, 0.35, 0.25, 300, 2500); tone(600, t, 0.12, 'sine', 0.08); tone(900, t + 0.06, 0.1, 'sine', 0.06); }
  function whoosh() { if (!ready()) return; const t = ctx.currentTime; noise(t, 0.25, 0.2, 1500, 9000); }
  function tick() { if (!ready()) return; tone(1200, ctx.currentTime, 0.08, 'square', 0.08); }
  function drumroll(sec) {
    if (!ready()) return; const t0 = ctx.currentTime;
    for (let i = 0; i < sec * 22; i++) noise(t0 + i / 22, 0.05, 0.05 + 0.15 * i / (sec * 22), 400, 5000);
  }
  function fanfare() {
    if (!ready()) return; const t = ctx.currentTime + 0.05;
    [60, 64, 67, 72].forEach((m, i) => tone(mtof(m), t + i * 0.12, 0.3, 'square', 0.12));
    [72, 76, 79, 84].forEach(m => tone(mtof(m), t + 0.55, 1.4, 'triangle', 0.1));
    [48, 55].forEach(m => tone(mtof(m), t + 0.55, 1.4, 'sawtooth', 0.06));
    for (let i = 0; i < 8; i++) noise(t + 0.55 + i * 0.09, 0.2, 0.12, 5000);
  }
  function heartbeat(n) { if (!ready()) return; const t = ctx.currentTime; for (let i = 0; i < (n || 2); i++) { kick(t + i * 0.7, 1.0); kick(t + i * 0.7 + 0.22, 0.6); } }
  function fail() { if (!ready()) return; const t = ctx.currentTime; [67, 63, 60].forEach((m, i) => tone(mtof(m), t + i * 0.22, 0.3, 'triangle', 0.12)); }

  function speak(text) {
    if (muted || !window.speechSynthesis) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ko-KR'; u.rate = 1.0; u.pitch = 1.15; u.volume = 1;
      const v = speechSynthesis.getVoices().find(v => /ko/i.test(v.lang));
      if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch (_) { }
  }

  return { unlock, ready, setMuted, isMuted: () => muted, startMusic, setIntensity, hold, resume, stopMusic,
    splash, whoosh, tick, heartbeat, drumroll, fanfare, fail, speak, state: () => (ctx ? ctx.state : 'none') };
})();
