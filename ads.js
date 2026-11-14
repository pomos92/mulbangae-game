// 광고 (Google AdSense) — 웹 브라우저에서만, 대기 화면/메뉴에만 넣어요.
// - 앱(안드로이드 WebView) 안에서는 표시하지 않아요 → 앱은 AdMob 사용.
// - funnyqr.com 주소에서만 표시 (github.io 미러 등에서는 안 나옴).
// - SLOT 이 비어 있으면 아무것도 안 해요. AdSense > 광고 > 광고 단위별 > 디스플레이 광고에서 만든 data-ad-slot 숫자를 넣으세요.
(function () {
  const CLIENT = 'ca-pub-7567911347694948';
  const SLOT = { host: '', join: '' };   // 예: host: '1234567890'
  const ua = navigator.userAgent || '';
  const inApp = /; wv\)/.test(ua) || /MulbangaeApp/i.test(ua);
  const okHost = /(^|\.)funnyqr\.com$/i.test(location.hostname) || /[?&]adtest=1/.test(location.search);
  const enabled = !inApp && okHost;
  let loaded = false;
  function load() {
    if (loaded) return; loaded = true;
    const s = document.createElement('script');
    s.async = true; s.crossOrigin = 'anonymous';
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + CLIENT;
    document.head.appendChild(s);
  }
  // container 안에 광고 하나를 붙여요. 같은 container 에 이미 있으면 그대로 둬요.
  function mount(container, where) {
    const slot = SLOT[where];
    if (!enabled || !slot || !container || container.querySelector('.adbox')) return;
    load();
    const box = document.createElement('div');
    box.className = 'adbox';
    box.innerHTML = '<div class="adlabel">광고</div><ins class="adsbygoogle" style="display:block" data-ad-client="' + CLIENT +
      '" data-ad-slot="' + slot + '" data-ad-format="auto" data-full-width-responsive="true"></ins>';
    container.appendChild(box);
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (_) { }
  }
  window.ADS = { mount, enabled };
})();
