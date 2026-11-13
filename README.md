# 🪲 물방개 게임 (인터넷 버전)

호스트 화면에 QR이 뜨고, 참가자가 휴대폰으로 QR을 찍으면 각자 **물방개 통**이 켜집니다.
**물방개 시작!**을 누르면 물방개가 모든 휴대폰 통을 한 번씩 돌아다니다가 한 통에 쏙 들어가요. 그 휴대폰이 **당첨**!

- 와이파이 상관없이 **인터넷(모바일 데이터 포함)** 이면 어디서든 참가
- 서버 필요 없음: 정적 파일(GitHub Pages)만으로 동작, 실시간 메시지는 무료 공개 MQTT 중계 서버(WebSocket)로 주고받음
- 게임 진행(당첨 추첨 포함)은 호스트 화면이 맡음 → **게임 중에는 호스트 화면을 켜 두세요**

## 주소
- 호스트 화면: `https://pomos92.github.io/mulbangae-game/`
- 참가자: 호스트 화면의 QR을 찍으면 `join.html?r=방코드` 로 열림

## 파일
- `index.html` 호스트 화면 · `join.html` 참가자 화면 · `net.js` 실시간 연결
- `beetle.js` 물방개 그림 · `sound.js` 배경음악·효과음(브라우저에서 직접 합성) · `style.css`
- `qrcode.js` (MIT, Kazuhiko Arase) · `mqtt.min.js` (MQTT.js 5.10.1, MIT)

중계 서버는 `net.js`의 `BROKERS` 목록 순서대로 시도합니다(EMQX → HiveMQ → Mosquitto 공개 서버).
