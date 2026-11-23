# 🎉 파티게임 모임 (물방개 게임 외 7종)

호스트 화면에 QR이 뜨고, 참가자가 휴대폰으로 QR을 **한 번만** 찍으면 모든 게임에 참가해요.
호스트도 참가자(1번)로 같이 합니다. 호스트가 게임 목록에서 게임을 고르면 모든 휴대폰이 그 게임으로 바뀌어요.

| 게임 | 방식 |
|---|---|
| 🪲 물방개 | 물방개가 모든 휴대폰 통을 한 번씩 돌다가 멈칫 → 한 통에 쏙! 당첨 |
| 🌀 병 돌리기 | 호스트·모든 휴대폰에서 병이 돌다가 한 사람에게 멈춤 |
| 🃏 숫자 카드 높낮이 | 1~10 카드 한 장씩, 호스트가 낮은/높은 수 결정 → 확인 시 공개 |
| 👑 왕게임 | 다시 섞기(앞면 공개 → 뒤집어 섞기) → 보기 누르면 왕 1명 공개 |
| 🐊 악어 이빨 | 위 7 + 아래 7 = 14개 중 함정 1개, 호스트부터 차례로 |
| 🎭 라이어 게임 | 한 명만 다른 단어, 1번부터 차례로 그림(모두 실시간으로 봄) → 투표 |
| ⬇️⬆️ 로우하이 | LOW/HIGH 중 몰래 선택, 적게 고른 쪽이 당첨 |
| 🏴‍☠️ 해적 칼 꽂기 | 참가자×2개 구멍, 1번부터 칼을 꽂다가 해적이 튀면 당첨 |

- 와이파이 상관없이 **인터넷(모바일 데이터 포함)** 이면 어디서든 참가
- 서버 필요 없음: GitHub Pages 정적 파일 + 무료 공개 MQTT 중계 서버(WebSocket)
- 게임 진행·추첨은 호스트 화면이 맡음 → **게임 중에는 호스트 화면을 켜 두세요**

## 주소
- 호스트: `https://pomos92.github.io/mulbangae-game/`
- 참가자: QR → `join.html?r=방코드`

## 파일
- `index.html`/`host.js` 호스트 · `join.html`/`player.js` 참가자 · `common.js` 게임 등록·공통 도우미
- `games/*.js` 각 게임 · `beetle.js` 물방개 그림 · `sound.js` 음악·효과음 · `net.js` 실시간 연결 · `style.css`
- 새 게임은 `games/`에 `defineGame({...})` 파일을 만들고 두 HTML에 script 한 줄씩 추가
- `qrcode.js` (MIT, Kazuhiko Arase) · `mqtt.min.js` (MQTT.js 5.10.1, MIT)

## 내 서버에 올리기 (maze.funnyqr.com)
Ubuntu + nginx 서버에서 한 줄이면 됩니다. 여러 번 실행해도 안전하고, 게임을 업데이트할 때도 같은 명령을 씁니다.

```bash
curl -fsSL https://raw.githubusercontent.com/pomos92/mulbangae-game/main/server/setup.sh | sudo bash
```

- 게임: `https://maze.funnyqr.com/party/` (레포를 `/opt/funnyqr-party`에 받아 nginx가 보여 줌)
- 실시간 중계: `wss://maze.funnyqr.com/mqtt` → mosquitto(127.0.0.1:9001, `mulbangae/#` 토픽만 허용)
- 기존 nginx 설정은 `.bak.<시각>`으로 백업한 뒤 443 server 블록에 include 한 줄만 추가
- `net.js`는 이 중계를 먼저 시도하고, 안 되면 공개 중계 서버로 바로 넘어감
