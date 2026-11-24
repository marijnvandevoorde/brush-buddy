package co.smallvictories.brushbuddy;

import android.app.Activity;
import android.webkit.JavascriptInterface;

import com.google.android.play.core.review.ReviewInfo;
import com.google.android.play.core.review.ReviewManager;
import com.google.android.play.core.review.ReviewManagerFactory;

/**
 * Exposed to the page as {@code window.BrushBuddyReview}. app.js only calls
 * {@link #requestReview()} after a grown-up has passed its parental gate, and
 * applies its own frequency limits first. Play then decides whether the review
 * sheet actually appears (it has its own quota) and never says whether the
 * user rated, so there is nothing to report back to the page.
 */
final class ReviewBridge {

    static final String NAME = "BrushBuddyReview";

    private final Activity activity;
    private final ReviewManager manager;

    ReviewBridge(Activity activity) {
        this.activity = activity;
        this.manager = ReviewManagerFactory.create(activity);
    }

    /** Called on a WebView background thread; the flow is launched on the UI thread. */
    @JavascriptInterface
    public void requestReview() {
        activity.runOnUiThread(() -> manager.requestReviewFlow().addOnCompleteListener(task -> {
            if (!task.isSuccessful() || activity.isFinishing() || activity.isDestroyed()) return;
            ReviewInfo info = task.getResult();
            manager.launchReviewFlow(activity, info);
        }));
    }
}
