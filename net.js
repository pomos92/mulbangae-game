// 실시간 연결: 무료 공개 MQTT 중계 서버(WebSocket)를 사용합니다. 따로 서버가 필요 없어요.
// 호스트 화면이 게임 진행을 맡고, 참가자 휴대폰은 중계 서버를 통해 메시지를 주고받습니다.
window.MB = (function () {
  const BROKERS = [
    'wss://broker.emqx.io:8084/mqtt',
    'wss://broker.hivemq.com:8884/mqtt',
    'wss://test.mosquitto.org:8081/mqtt'
  ];
  const PREFIX = 'mulbangae/v1/';

  function rid(n) {
    const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
    const a = new Uint32Array(n); crypto.getRandomValues(a);
    return Array.from(a, x => chars[x % chars.length]).join('');
  }
  function randInt(n) { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; }

  // b 값: 숫자면 목록의 순번, 아니면 주소 그대로 (테스트용)
  function brokerFromParam(b) {
    if (b == null || b === '') return null;
    if (/^\d+$/.test(b)) return BROKERS[+b] || BROKERS[0];
    return b;
  }
  function brokerParam(url) { const i = BROKERS.indexOf(url); return i >= 0 ? String(i) : url; }

  function tryConnect(url, timeoutMs) {
    return new Promise((resolve, reject) => {
      const c = mqtt.connect(url, { clientId: 'mb_' + rid(10), keepalive: 30, reconnectPeriod: 2000, connectTimeout: timeoutMs, clean: true });
      const t = setTimeout(() => { c.end(true); reject(new Error('timeout')); }, timeoutMs + 500);
      c.once('connect', () => { clearTimeout(t); resolve(c); });
    });
  }

  // 목록을 차례로 시도해서 처음 연결되는 중계 서버를 씀
  async function connectAny(list, timeoutMs) {
    for (const url of list) {
      try { const c = await tryConnect(url, timeoutMs || 6000); return { client: c, url }; } catch (_) { }
    }
    throw new Error('중계 서버에 연결할 수 없어요. 인터넷 연결을 확인해 주세요.');
  }

  return { BROKERS, PREFIX, rid, randInt, brokerFromParam, brokerParam, connectAny };
})();
