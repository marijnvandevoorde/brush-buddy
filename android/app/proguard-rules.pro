# The app is a thin WebView shell — nothing is reflected from JS, so the
# defaults are enough. Keep the JS interface annotation contract anyway in case
# a bridge is added later.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
