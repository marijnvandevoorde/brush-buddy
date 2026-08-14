package co.smallvictories.brushbuddy;

import android.annotation.SuppressLint;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.window.OnBackInvokedDispatcher;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.app.Activity;

/**
 * Single-activity shell around the bundled Brush Buddy web app.
 *
 * The app itself is unchanged from the web build; this class only supplies the
 * things a browser tab would have given it — a full-screen window, a WebView
 * tuned for a kids' app (no zoom, no text selection, no overscroll glow), and a
 * screen that stays awake for the full two minutes of brushing.
 */
public class MainActivity extends Activity {

    private WebView web;
    private AssetServer assetServer;

    /**
     * Back button behaviour, evaluated inside the page: close the settings
     * sheet if it is open, else tell the activity to exit. The app is a single
     * screen, so there is no in-page history to walk back through.
     */
    private static final String BACK_JS =
            "(function(){"
          + "  var s=document.getElementById('settings');"
          + "  if(s&&!s.hidden){"
          + "    var c=document.getElementById('settingsClose');"
          + "    if(c){c.click();return 'handled';}"
          + "  }"
          + "  return 'exit';"
          + "})()";

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        goEdgeToEdge();
        registerBackHandler();
        // Two minutes of brushing with no touch input is well past the usual
        // screen timeout; the page also asks for a Screen Wake Lock, but the
        // WebView does not implement that API, so this flag is what actually
        // keeps the buddy visible.
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().setBackgroundDrawableResource(R.color.brand_bg);

        assetServer = new AssetServer(getAssets());

        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#FFF0F7"));
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);
        // Long-press selection/callout has no purpose here and only lets a child
        // get stuck in a text-selection toolbar mid-brush.
        web.setLongClickable(false);
        web.setOnLongClickListener(v -> true);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);          // streak, colour scheme and buddy live in localStorage
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        // The finale clip has to start on its own, with no tap to trigger it.
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setCacheMode(WebSettings.LOAD_NO_CACHE);
        s.setTextZoom(100);                    // the layout is tuned for a fixed scale

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                return assetServer.serve(u.getScheme(), u.getAuthority(), u.getPath());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                // Nothing in the app links out; swallow anything that tries.
                return !AssetServer.AUTHORITY.equals(request.getUrl().getAuthority());
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                injectSceneLibrary();
                runDebugScene(getIntent());
            }
        });

        if (isDebuggable()) {
            WebView.setWebContentsDebuggingEnabled(true);
            // Surfaces page errors (and screenshot-scene failures) in logcat.
            web.setWebChromeClient(new android.webkit.WebChromeClient() {
                @Override
                public boolean onConsoleMessage(android.webkit.ConsoleMessage m) {
                    android.util.Log.i("BrushBuddyWeb",
                            m.message() + " @" + m.sourceId() + ":" + m.lineNumber());
                    return true;
                }
            });
        }

        setContentView(web);

        if (savedInstanceState != null) {
            web.restoreState(savedInstanceState);
        } else {
            web.loadUrl(AssetServer.BASE_URL + "index.html");
        }
    }

    /**
     * Debug-build hook used by store/screenshots/capture-android.sh to put the
     * app into a known state before a store screenshot:
     *
     *   adb shell am start -n <pkg>/.MainActivity --es scene finale
     *
     * Without this the only way to photograph the 2:30 finale is to wait two
     * and a half minutes per shot. Neither the asset nor this code path exists
     * in a release build: FLAG_DEBUGGABLE is stamped in by the build type.
     */
    @Override
    protected void onNewIntent(android.content.Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        runDebugScene(intent);
    }

    private boolean isDebuggable() {
        return (getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0;
    }

    private void injectSceneLibrary() {
        if (!isDebuggable() || web == null) return;
        try (java.io.InputStream in = getAssets().open("screenshots/scenes.js")) {
            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            web.evaluateJavascript(out.toString("UTF-8"), null);
        } catch (java.io.IOException e) {
            // No scene library bundled — an ordinary debug run, nothing to do.
        }
    }

    private void runDebugScene(android.content.Intent intent) {
        if (!isDebuggable() || intent == null || web == null) return;
        String scene = intent.getStringExtra("scene");
        if (scene == null) return;
        // The name comes from the capture script; quote it so a stray character
        // cannot break out of the call.
        web.evaluateJavascript("__scene(" + org.json.JSONObject.quote(scene) + ");", null);
    }

    /**
     * Draw under the status/navigation bars and into the display cutout, then
     * hide both bars: a child holding the phone in a wet hand mid-brush should
     * not be able to swipe the app away or pull down the shade by accident. The
     * app's CSS pads for safe-area insets, so nothing lands under the cutout.
     *
     * Android 15 deprecated the old way of asking for this. An app targeting
     * SDK 35+ is already edge-to-edge with transparent bars, so setStatusBarColor
     * / setNavigationBarColor / LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES are
     * gone from this class entirely: the cutout mode now lives in the theme
     * (res/values/themes.xml plus a -v30 override), and the branches below only
     * reproduce the modern default on older releases.
     */
    private void goEdgeToEdge() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.VANILLA_ICE_CREAM) {
                // API 30-34: opt in to what API 35 does on its own.
                getWindow().setDecorFitsSystemWindows(false);
            }
            WindowInsetsController bars = getWindow().getInsetsController();
            if (bars != null) {
                bars.hide(WindowInsets.Type.systemBars());
                bars.setSystemBarsBehavior(
                        WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            legacyImmersive();
        }
    }

    /** Pre-API-30 equivalent of the WindowInsetsController calls above. */
    @SuppressWarnings("deprecation")
    private void legacyImmersive() {
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
              | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
              | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
              | View.SYSTEM_UI_FLAG_FULLSCREEN
              | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
              | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) goEdgeToEdge();
    }

    /**
     * Android 13 replaced onBackPressed() with the back-invoked dispatcher, and
     * from targetSdk 36 the platform stops calling onBackPressed() altogether —
     * without this registration the Back button would drop straight out of the
     * app instead of closing the open panel first.
     */
    private void registerBackHandler() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::handleBack);
        }
    }

    /** Pre-API-33 route into {@link #handleBack()}. */
    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        handleBack();
    }

    private void handleBack() {
        if (web == null) {
            finish();
            return;
        }
        web.evaluateJavascript(BACK_JS, value -> {
            if (!"\"handled\"".equals(value)) finish();
        });
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        web.saveState(outState);
    }

    @Override
    protected void onPause() {
        web.onPause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }
}
