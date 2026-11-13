// 물방개 그림 (머리가 위쪽을 향함). size: 픽셀 너비
window.beetleSVG = function (size) {
  const w = size || 90;
  return `
<svg class="beetle" width="${w}" height="${w * 1.4}" viewBox="0 0 100 140" aria-label="물방개">
  <defs>
    <radialGradient id="shell" cx="40%" cy="35%" r="70%">
      <stop offset="0" stop-color="#4f6b2c"/><stop offset=".6" stop-color="#2a3b17"/><stop offset="1" stop-color="#18230c"/>
    </radialGradient>
  </defs>
  <g class="legs-front" stroke="#2a2410" stroke-width="3.5" stroke-linecap="round" fill="none">
    <path d="M36 42 L22 30 L18 18"/><path d="M64 42 L78 30 L82 18"/>
    <path d="M34 58 L16 54 L8 46"/><path d="M66 58 L84 54 L92 46"/>
  </g>
  <g class="leg-back-l"><path d="M34 84 Q14 96 4 122 Q14 118 22 110 Q30 98 38 90Z" fill="#3a3016" stroke="#c9a53a" stroke-width="1.5"/></g>
  <g class="leg-back-r"><path d="M66 84 Q86 96 96 122 Q86 118 78 110 Q70 98 62 90Z" fill="#3a3016" stroke="#c9a53a" stroke-width="1.5"/></g>
  <ellipse cx="50" cy="80" rx="31" ry="46" fill="url(#shell)" stroke="#e0bf45" stroke-width="4"/>
  <path d="M50 46 L50 124" stroke="#141c08" stroke-width="1.6"/>
  <path d="M22 54 Q50 40 78 54 L76 60 Q50 50 24 60Z" fill="#1d2a0f" stroke="#e0bf45" stroke-width="2"/>
  <ellipse cx="50" cy="34" rx="17" ry="13" fill="#2f4219" stroke="#e0bf45" stroke-width="3"/>
  <circle cx="41" cy="30" r="3.4" fill="#0b0b0b"/><circle cx="59" cy="30" r="3.4" fill="#0b0b0b"/>
  <circle cx="40" cy="29" r="1.1" fill="#fff"/><circle cx="58" cy="29" r="1.1" fill="#fff"/>
  <path d="M44 22 Q40 12 34 8 M56 22 Q60 12 66 8" stroke="#2a2410" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  <ellipse cx="38" cy="72" rx="6" ry="16" fill="#fff" opacity=".18" transform="rotate(-12 38 72)"/>
</svg>`;
};
