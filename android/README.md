# 파티게임 모임 안드로이드 앱 (AdMob 배너 포함)

https://maze.funnyqr.com/party/ 를 WebView로 열고, 화면 맨 아래에 AdMob 배너를 보여줘요.
앱 안에서는 웹의 AdSense 광고가 나오지 않아요(ads.js가 WebView를 감지).

- AdMob 앱 ID: AndroidManifest.xml 의 APPLICATION_ID
- 배너 광고 단위: MainActivity.java 의 BANNER_ID

## 빌드
`main`에 `android/` 변경을 푸시하면 GitHub Actions(.github/workflows/android.yml)가 서명 안 된 APK를 만들어
`apk-build` 브랜치에 올려요. 그 APK를 기존 release.keystore로 서명해야 예전 앱 위에 덮어 설치돼요:

    zipalign -f -p 4 app-release-unsigned.apk aligned.apk
    apksigner sign --ks release.keystore --ks-key-alias mulbangae --out mulbangae-game.apk aligned.apk

서명 키는 공개 레포에 넣지 않아요.
