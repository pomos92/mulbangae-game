#!/usr/bin/env bash
# 술게임 모임 서버 설치 (Ubuntu/Debian + nginx). 여러 번 실행해도 안전해요(업데이트도 이걸로).
#   curl -fsSL https://raw.githubusercontent.com/pomos92/mulbangae-game/main/server/setup.sh | sudo bash
# 결과:  https://<도메인>/party/  게임 화면,  wss://<도메인>/mqtt  실시간 중계
set -euo pipefail
DOMAIN="${DOMAIN:-maze.funnyqr.com}"
REPO="${REPO:-https://github.com/pomos92/mulbangae-game.git}"
APP_DIR=/opt/funnyqr-party
SNIPPET=/etc/nginx/snippets/funnyqr-party.conf

[ "$(id -u)" = 0 ] || { echo "sudo로 실행해 주세요"; exit 1; }
command -v nginx >/dev/null || { echo "nginx가 없어요. 이 서버의 웹서버 종류를 알려 주세요."; exit 1; }

echo "== 1/4 패키지 설치 (mosquitto, git)"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq mosquitto git >/dev/null

echo "== 2/4 MQTT 중계 설정 (내부 127.0.0.1, 게임 토픽만 허용)"
# 비어 있는 포트 고르기 (9001부터)
port_busy() { ss -ltnH "( sport = :$1 )" 2>/dev/null | grep -q . ; }
systemctl stop mosquitto 2>/dev/null || true
MQ_PORT=""
for p in 9001 9011 9021 19001 29001; do port_busy "$p" || { MQ_PORT=$p; break; }; done
[ -n "$MQ_PORT" ] || { echo "빈 포트를 못 찾았어요"; exit 1; }
echo "   포트: $MQ_PORT"
cat > /etc/mosquitto/conf.d/funnyqr-party.conf <<CONF
listener $MQ_PORT 127.0.0.1
protocol websockets
allow_anonymous true
acl_file /etc/mosquitto/funnyqr-party.acl
max_connections 5000
message_size_limit 262144
max_queued_messages 2000
CONF
cat > /etc/mosquitto/funnyqr-party.acl <<'ACL'
topic readwrite mulbangae/#
ACL
chmod 644 /etc/mosquitto/conf.d/funnyqr-party.conf /etc/mosquitto/funnyqr-party.acl
mkdir -p /var/log/mosquitto /var/lib/mosquitto /run/mosquitto
chown -R mosquitto: /var/log/mosquitto /var/lib/mosquitto /run/mosquitto 2>/dev/null || true
systemctl reset-failed mosquitto 2>/dev/null || true
systemctl enable -q mosquitto
if ! systemctl restart mosquitto || ! { sleep 2; systemctl is-active --quiet mosquitto; }; then
  echo "!! mosquitto 시작 실패. 원인 확인용 정보:"
  ls /etc/mosquitto/conf.d/
  echo "--- 설정 직접 실행 결과"
  timeout 3 mosquitto -c /etc/mosquitto/mosquitto.conf -v 2>&1 | tail -15 || true
  echo "--- 로그"
  tail -15 /var/log/mosquitto/mosquitto.log 2>/dev/null || true
  journalctl -u mosquitto -n 15 --no-pager 2>/dev/null || true
  exit 1
fi
echo "   mosquitto 실행 중"

echo "== 3/4 게임 파일 받기 → $APP_DIR"
if [ -d "$APP_DIR/.git" ]; then git -C "$APP_DIR" fetch -q origin main && git -C "$APP_DIR" reset -q --hard origin/main
else rm -rf "$APP_DIR"; git clone -q --depth 1 "$REPO" "$APP_DIR"; fi
chmod -R a+rX "$APP_DIR"

echo "== 4/4 nginx 연결 (/party/, /mqtt)"
mkdir -p /etc/nginx/snippets
cat > "$SNIPPET" <<'NGX'
location = /party { return 301 /party/; }
location /party/ {
    alias /opt/funnyqr-party/;
    index index.html;
    add_header Cache-Control "no-cache";
    location ~ /\.git { deny all; }
    location ^~ /party/server/ { deny all; }
}
location = /mqtt {
    proxy_pass http://127.0.0.1:MQ_PORT_PLACEHOLDER;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
}
NGX
sed -i "s/MQ_PORT_PLACEHOLDER/$MQ_PORT/" "$SNIPPET"
# maze.funnyqr.com 의 443(https) server 블록 안에 include 한 줄 넣기
CONF_FILE=$(grep -RlE "server_name[^;]*\b${DOMAIN//./\\.}\b" /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null | head -1 || true)
[ -n "$CONF_FILE" ] || { echo "nginx 설정에서 $DOMAIN 을 못 찾았어요"; exit 1; }
CONF_FILE=$(readlink -f "$CONF_FILE")
if ! grep -q "funnyqr-party.conf" "$CONF_FILE"; then
  cp "$CONF_FILE" "$CONF_FILE.bak.$(date +%s)"
  python3 - "$CONF_FILE" "$DOMAIN" <<'PY'
import re, sys
path, dom = sys.argv[1], sys.argv[2]
s = open(path).read()
out, i, done = [], 0, 0
# server { ... } 블록을 찾아서, 해당 도메인 + 443 블록의 server_name 줄 다음에 include 추가
for m in re.finditer(r'server\s*\{', s):
    start = m.end(); depth = 1; j = start
    while depth and j < len(s):
        depth += {'{': 1, '}': -1}.get(s[j], 0); j += 1
    block = s[start:j]
    if re.search(r'server_name[^;]*\b' + re.escape(dom) + r'\b', block) and re.search(r'listen[^;]*443', block):
        nm = re.search(r'server_name[^;]*;\n?', block)
        pos = start + nm.end()
        out.append(s[i:pos]); out.append('    include /etc/nginx/snippets/funnyqr-party.conf;\n'); i = pos; done += 1
out.append(s[i:])
if not done: sys.exit("443 server 블록을 못 찾았어요")
open(path, 'w').write(''.join(out))
PY
fi

echo "== 광고 ads.txt (funnyqr.com, www.funnyqr.com, $DOMAIN)"
ADS_SNIPPET=/etc/nginx/snippets/funnyqr-ads.conf
cat > "$ADS_SNIPPET" <<'NGX'
location = /ads.txt { alias /opt/funnyqr-party/ads.txt; default_type text/plain; add_header Cache-Control "no-cache"; }
NGX
for f in $(grep -RlE "server_name" /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null); do
  f=$(readlink -f "$f")
  grep -q "funnyqr-ads.conf" "$f" && continue
  python3 - "$f" "$DOMAIN" <<'PY2'
import re, sys
path, dom = sys.argv[1], sys.argv[2]
names = {'funnyqr.com', 'www.funnyqr.com', dom}
s = open(path).read()
out, i, done = [], 0, 0
for m in re.finditer(r'server\s*\{', s):
    start = m.end(); depth = 1; j = start
    while depth and j < len(s):
        depth += {'{': 1, '}': -1}.get(s[j], 0); j += 1
    block = s[start:j]
    nm = re.search(r'server_name([^;]*);\n?', block)
    if not nm or not (set(nm.group(1).split()) & names) or 'ads.txt' in block: continue
    pos = start + nm.end()
    out.append(s[i:pos]); out.append('    include /etc/nginx/snippets/funnyqr-ads.conf;\n'); i = pos; done += 1
out.append(s[i:])
if done:
    import os, shutil, time
    os.makedirs('/root/nginx-backup', exist_ok=True)
    shutil.copy(path, '/root/nginx-backup/%s.%d' % (os.path.basename(path), time.time()))
    open(path, 'w').write(''.join(out)); print('   ads.txt 연결:', path, done, '곳')
PY2
done
grep -RqE "server_name[^;]*[[:space:]]funnyqr\.com[[:space:];]" /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null \
  || echo "   !! nginx에 funnyqr.com(루트) 설정이 없어요. https://funnyqr.com/ads.txt 는 따로 올려야 해요."

nginx -t
systemctl reload nginx

echo
echo "완료!  게임:  https://$DOMAIN/party/"
echo "      중계:  wss://$DOMAIN/mqtt  (mosquitto $(mosquitto -h 2>/dev/null | head -1 | awk '{print $3}'))"
echo "      광고:  https://funnyqr.com/ads.txt  ,  https://$DOMAIN/ads.txt"
echo "업데이트할 땐 이 명령을 다시 실행하면 돼요."
