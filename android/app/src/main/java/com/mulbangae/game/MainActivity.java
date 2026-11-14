package com.mulbangae.game;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.DialogInterface;
import android.graphics.Color;
import android.os.Bundle;
import android.util.DisplayMetrics;
import android.view.Window;
import android.widget.LinearLayout;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.MobileAds;

/** 호스트 화면(QR + 통 목록)을 보여 주는 앱. 게임은 인터넷의 공개 주소에서 돌아갑니다. */
public class MainActivity extends Activity {

    static final String HOST_URL = "https://maze.funnyqr.com/party/";
    // AdMob 배너 (화면 맨 아래). 웹의 AdSense는 앱 안에서 자동으로 숨겨져요(ads.js).
    static final String BANNER_ID = "ca-app-pub-7567911347694948/5929116428";
    private WebView web;
    private AdView adView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().setStatusBarColor(Color.parseColor("#0b2a3d"));
        getWindow().setNavigationBarColor(Color.parseColor("#0b2a3d"));

        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#0b2a3d"));
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setUserAgentString(s.getUserAgentString() + " MulbangaeApp/4");
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override
            public void onReceivedError(WebView view, WebResourceRequest req, WebResourceError err) {
                if (req.isForMainFrame()) showOffline(view);
            }
            @Override
            @SuppressWarnings("deprecation")
            public void onReceivedError(WebView view, int code, String desc, String url) {
                showOffline(view);
            }
        });
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.parseColor("#0b2a3d"));
        root.addView(web, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f));
        adView = new AdView(this);
        adView.setAdUnitId(BANNER_ID);
        DisplayMetrics dm = getResources().getDisplayMetrics();
        adView.setAdSize(AdSize.getCurrentOrientationAnchoredAdaptiveBannerAdSize(this, (int) (dm.widthPixels / dm.density)));
        root.addView(adView, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));
        setContentView(root);
        new Thread(new Runnable() { public void run() {
            MobileAds.initialize(MainActivity.this);
            runOnUiThread(new Runnable() { public void run() { adView.loadAd(new AdRequest.Builder().build()); } });
        } }).start();
        if (savedInstanceState != null) web.restoreState(savedInstanceState);
        else web.loadUrl(HOST_URL);
    }

    private void showOffline(WebView view) {
        String html = "<html><head><meta name=viewport content='width=device-width,initial-scale=1'></head>"
                + "<body style='margin:0;background:#0b2a3d;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center'>"
                + "<div><div style='font-size:64px'>🪲</div><p style='font-size:20px'>인터넷에 연결할 수 없어요.<br>와이파이나 모바일 데이터를 켜 주세요.</p>"
                + "<button onclick=\"location.href='" + HOST_URL + "'\" style='font-size:20px;padding:14px 28px;border:0;border-radius:14px;background:#ffd34d;font-weight:800'>다시 시도</button></div></body></html>";
        view.loadDataWithBaseURL(null, html, "text/html", "UTF-8", HOST_URL);
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (web != null) web.saveState(outState);
    }

    @Override protected void onPause() { if (adView != null) adView.pause(); super.onPause(); }
    @Override protected void onResume() { super.onResume(); if (adView != null) adView.resume(); }
    @Override protected void onDestroy() { if (adView != null) adView.destroy(); super.onDestroy(); }

    @Override
    public void onBackPressed() {
        new AlertDialog.Builder(this)
                .setMessage("술게임 모임을 끝낼까요?")
                .setPositiveButton("끝내기", new DialogInterface.OnClickListener() {
                    public void onClick(DialogInterface d, int w) { finish(); }
                })
                .setNegativeButton("계속하기", null)
                .show();
    }
}
