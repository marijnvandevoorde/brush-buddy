# The app is a thin WebView shell. The one thing reached from JS is the review
# bridge (ReviewBridge, window.BrushBuddyReview); keep its annotated methods.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
